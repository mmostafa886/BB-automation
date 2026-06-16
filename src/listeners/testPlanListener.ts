import * as azdev from 'azure-devops-node-api';
import tcGenerateLogger from '../utils/tc-generate-logger.js';
import type { TestCaseFilterConfig } from '../../config/testCaseFilter.js';

let testFilter: TestCaseFilterConfig;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  testFilter = require('../../config/testCaseFilter').default ?? require('../../config/testCaseFilter');
} catch (error) {
  console.error('Could not load testCaseFilter:', (error as Error).message);
  testFilter = { filterMode: 'none', modules: [], activeModules: [] };
}

export interface TestCaseData {
  id: number;
  revision: number;
  title: string;
  steps: string;
  description: string;
  tags: string;
  state: string;
  priority: number;
  automationStatus: string;
  areaPath: string;
  module?: string;
  planName?: string;
  suiteName?: string;
}

export interface Change {
  type: 'added' | 'updated' | 'deleted';
  testCase: TestCaseData;
  oldTestCase?: TestCaseData;
}

class TestPlanListener {
  readonly orgUrl: string;
  readonly token: string;
  readonly project: string;
  connection: azdev.WebApi | null;
  lastSnapshot: TestCaseData[];

  constructor(orgUrl: string, token: string, project: string) {
    this.orgUrl = orgUrl;
    this.token = token;
    this.project = project;
    this.connection = null;
    this.lastSnapshot = [];
  }

  async initialize(): Promise<void> {
    try {
      this.connection = new azdev.WebApi(
        this.orgUrl,
        azdev.getPersonalAccessTokenHandler(this.token),
      );
      tcGenerateLogger.info('Azure DevOps connection initialized');
    } catch (error) {
      tcGenerateLogger.error('Failed to initialize Azure DevOps connection', error);
      throw error;
    }
  }

  async getAllTestCasesInProject(): Promise<unknown[]> {
    try {
      tcGenerateLogger.info('Querying all test cases in project...');
      const witApi = await this.connection!.getWorkItemTrackingApi();

      const wiql = {
        query: `SELECT [System.Id]
                FROM WorkItems
                WHERE [System.WorkItemType] = 'Test Case'
                AND [System.TeamProject] = '${this.project}'
                ORDER BY [System.Id] DESC`,
      };

      const queryResult = await witApi.queryByWiql(wiql, { project: this.project });

      if (!queryResult || !queryResult.workItems || queryResult.workItems.length === 0) {
        tcGenerateLogger.warn('No test cases found in project');
        return [];
      }

      tcGenerateLogger.info(`Found ${queryResult.workItems.length} test cases in project`);

      const testCaseIds = queryResult.workItems.map(wi => wi.id!);
      const allTestCases: unknown[] = [];

      let processedCount = 0;
      for (const testCaseId of testCaseIds) {
        try {
          const workItem = await witApi.getWorkItem(testCaseId);
          if (workItem) allTestCases.push(workItem);

          processedCount++;
          if (processedCount % 50 === 0) {
            tcGenerateLogger.info(`Progress: ${processedCount}/${testCaseIds.length} test cases processed`);
          }
        } catch (error) {
          tcGenerateLogger.warn(`Could not fetch test case ${testCaseId}: ${(error as Error).message}`);
        }
      }

      tcGenerateLogger.info(`Retrieved details for ${allTestCases.length} test cases`);
      return allTestCases;
    } catch (error) {
      tcGenerateLogger.error('Error querying test cases', error);
      throw error;
    }
  }

  shouldIncludeTestCase(testCaseId: number): boolean {
    if (!testFilter || testFilter.filterMode !== 'modules') {
      tcGenerateLogger.debug('No module filter configured, including all test cases');
      return true;
    }

    if (!testFilter.modules || testFilter.modules.length === 0) {
      tcGenerateLogger.debug('No modules defined in filter, including all test cases');
      return true;
    }

    const activeModules = testFilter.activeModules || [];

    if (activeModules.length === 0) {
      const inAnyModule = testFilter.modules.some(module =>
        module.testCaseIds && module.testCaseIds.includes(testCaseId),
      );
      tcGenerateLogger.debug(`Test case ${testCaseId} ${inAnyModule ? 'found' : 'NOT found'} in module configuration`);
      return inAnyModule;
    }

    for (const moduleName of activeModules) {
      const module = testFilter.modules.find(m => m.name === moduleName);
      if (module && module.testCaseIds && module.testCaseIds.includes(testCaseId)) {
        tcGenerateLogger.debug(`Test case ${testCaseId} found in active module: ${moduleName}`);
        return true;
      }
    }

    tcGenerateLogger.debug(`Test case ${testCaseId} not found in any active module`);
    return false;
  }

  getModuleForTestCase(testCaseId: number): string | null {
    if (!testFilter || !testFilter.modules) return null;

    for (const module of testFilter.modules) {
      if (module.testCaseIds && module.testCaseIds.includes(testCaseId)) {
        return module.name;
      }
    }
    return null;
  }

  async getTestCaseDetails(testCaseId: number): Promise<TestCaseData | null> {
    try {
      const witApi = await this.connection!.getWorkItemTrackingApi();
      const workItem = await witApi.getWorkItem(testCaseId);

      if (!workItem) {
        tcGenerateLogger.warn(`Test case ${testCaseId} not found`);
        return null;
      }

      if (workItem.fields!['System.WorkItemType'] !== 'Test Case') {
        tcGenerateLogger.debug(`Work item ${testCaseId} is not a test case, skipping`);
        return null;
      }

      return {
        id: workItem.id!,
        revision: workItem.rev!,
        title: workItem.fields!['System.Title'],
        steps: workItem.fields!['Microsoft.VSTS.TCM.Steps'],
        description: workItem.fields!['System.Description'],
        tags: workItem.fields!['System.Tags'],
        state: workItem.fields!['System.State'],
        priority: workItem.fields!['Microsoft.VSTS.Common.Priority'],
        automationStatus: workItem.fields!['Microsoft.VSTS.TCM.AutomationStatus'],
        areaPath: workItem.fields!['System.AreaPath'],
      };
    } catch (error) {
      tcGenerateLogger.error(`Error fetching test case details for ${testCaseId}`, error);
      return null;
    }
  }

  async createSnapshot(): Promise<TestCaseData[]> {
    tcGenerateLogger.info('Creating snapshot of test cases...');
    const snapshot: TestCaseData[] = [];

    try {
      const allWorkItems = await this.getAllTestCasesInProject();

      if (!allWorkItems || allWorkItems.length === 0) {
        tcGenerateLogger.warn('No test cases found in project');
        return snapshot;
      }

      tcGenerateLogger.info(`Processing ${allWorkItems.length} test case(s)...`);

      let includedCount = 0;
      let skippedCount = 0;

      for (const workItem of allWorkItems) {
        const wi = workItem as { id?: number; rev?: number; fields?: Record<string, unknown> };
        if (!wi || !wi.fields) continue;

        const testCaseId = wi.id!;

        if (!this.shouldIncludeTestCase(testCaseId)) {
          tcGenerateLogger.debug(`Skipping test case ${testCaseId} - not in active modules`);
          skippedCount++;
          continue;
        }

        const state = wi.fields['System.State'] as string;
        if (state === 'Removed' || state === 'Deleted') {
          tcGenerateLogger.debug(`Skipping test case ${testCaseId} - state: ${state}`);
          skippedCount++;
          continue;
        }

        const moduleName = this.getModuleForTestCase(testCaseId);

        const testCaseData: TestCaseData = {
          id: wi.id!,
          revision: wi.rev!,
          title: wi.fields['System.Title'] as string,
          steps: wi.fields['Microsoft.VSTS.TCM.Steps'] as string,
          description: wi.fields['System.Description'] as string,
          tags: wi.fields['System.Tags'] as string,
          state: wi.fields['System.State'] as string,
          priority: wi.fields['Microsoft.VSTS.Common.Priority'] as number,
          automationStatus: wi.fields['Microsoft.VSTS.TCM.AutomationStatus'] as string,
          areaPath: wi.fields['System.AreaPath'] as string,
          module: moduleName || 'Uncategorized',
          planName: 'All Test Cases',
          suiteName: wi.fields['System.AreaPath'] as string || 'General',
        };

        snapshot.push(testCaseData);
        includedCount++;
      }

      tcGenerateLogger.info(`Snapshot created with ${snapshot.length} test cases`);
      tcGenerateLogger.info(`  Included: ${includedCount}`);
      tcGenerateLogger.info(`  Skipped: ${skippedCount}`);

      if (testFilter && testFilter.filterMode === 'modules') {
        const moduleBreakdown: Record<string, number> = {};
        snapshot.forEach(tc => {
          moduleBreakdown[tc.module!] = (moduleBreakdown[tc.module!] || 0) + 1;
        });

        tcGenerateLogger.info('Module breakdown:');
        Object.entries(moduleBreakdown).forEach(([module, count]) => {
          tcGenerateLogger.info(`  - ${module}: ${count} test case(s)`);
        });
      }

      return snapshot;
    } catch (error) {
      tcGenerateLogger.error('Error creating snapshot', error);
      return [];
    }
  }

  detectChanges(oldSnapshot: TestCaseData[], newSnapshot: TestCaseData[]): Change[] {
    const changes: Change[] = [];

    if (!oldSnapshot || oldSnapshot.length === 0) {
      tcGenerateLogger.info('First snapshot - all test cases are new');
      return newSnapshot.map(tc => ({ type: 'added', testCase: tc }));
    }

    const oldMap = new Map(oldSnapshot.map(tc => [tc.id, tc]));
    const newMap = new Map(newSnapshot.map(tc => [tc.id, tc]));

    for (const current of newSnapshot) {
      const old = oldMap.get(current.id);

      if (!old) {
        changes.push({ type: 'added', testCase: current });
        tcGenerateLogger.info(`New test case detected: ${current.title} (ID: ${current.id}, Module: ${current.module})`);
      } else if (old.revision !== current.revision) {
        changes.push({ type: 'updated', testCase: current, oldTestCase: old });
        tcGenerateLogger.info(`Updated test case detected: ${current.title} (ID: ${current.id}, Module: ${current.module})`);
      }
    }

    for (const old of oldSnapshot) {
      if (!newMap.has(old.id)) {
        changes.push({ type: 'deleted', testCase: old });
        tcGenerateLogger.info(`Deleted test case detected: ${old.title} (ID: ${old.id}, Module: ${old.module})`);
      }
    }

    return changes;
  }

  async pollForChanges(interval = 60000): Promise<void> {
    tcGenerateLogger.info(`Starting polling with interval: ${interval}ms`);

    if (testFilter && testFilter.filterMode === 'modules') {
      tcGenerateLogger.info('Module filter active:');
      if (testFilter.activeModules && testFilter.activeModules.length > 0) {
        tcGenerateLogger.info(`  Active modules: ${testFilter.activeModules.join(', ')}`);
      } else {
        tcGenerateLogger.info('  Processing all modules');
      }
    }

    this.lastSnapshot = await this.createSnapshot();

    setInterval(async () => {
      try {
        const currentSnapshot = await this.createSnapshot();
        const changes = this.detectChanges(this.lastSnapshot, currentSnapshot);

        if (changes.length > 0) {
          tcGenerateLogger.info(`Detected ${changes.length} changes`);
          await this.handleChanges(changes);
        } else {
          tcGenerateLogger.debug('No changes detected');
        }

        this.lastSnapshot = currentSnapshot;
      } catch (error) {
        tcGenerateLogger.error('Error during polling', error);
      }
    }, interval);
  }

  async handleChanges(changes: Change[]): Promise<Change[]> {
    tcGenerateLogger.info(`Processing ${changes.length} changes...`);
    return changes;
  }
}

export default TestPlanListener;
