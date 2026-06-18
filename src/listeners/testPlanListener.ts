import { Version3Client } from 'jira.js';
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
  id: string;
  revision: number;
  title: string;
  steps: string;
  description: string;
  tags: string;
  state: string;
  priority: string;
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

class JiraListener {
  readonly baseUrl: string;
  readonly email: string;
  readonly apiToken: string;
  readonly projectKey: string;
  readonly tcIssueType: string;
  client: Version3Client | null;
  lastSnapshot: TestCaseData[];

  constructor(baseUrl: string, email: string, apiToken: string, projectKey: string, tcIssueType = 'Task') {
    this.baseUrl = baseUrl;
    this.email = email;
    this.apiToken = apiToken;
    this.projectKey = projectKey;
    this.tcIssueType = tcIssueType;
    this.client = null;
    this.lastSnapshot = [];
  }

  async initialize(): Promise<void> {
    try {
      this.client = new Version3Client({
        host: this.baseUrl,
        authentication: {
          basic: {
            email: this.email,
            apiToken: this.apiToken,
          },
        },
      });
      tcGenerateLogger.info('Jira connection initialized');
    } catch (error) {
      tcGenerateLogger.error('Failed to initialize Jira connection', error);
      throw error;
    }
  }

  async getAllTestCasesInProject(): Promise<unknown[]> {
    try {
      tcGenerateLogger.info('Querying all test cases in project...');

      const jql = `project = "${this.projectKey}" AND issuetype = "${this.tcIssueType}" ORDER BY id DESC`;
      const allIssues: unknown[] = [];
      let startAt = 0;
      const maxResults = 100;

      while (true) {
        const result = await this.client!.issueSearch.searchForIssuesUsingJql({
          jql,
          startAt,
          maxResults,
          fields: ['summary', 'description', 'labels', 'priority', 'components', 'status', 'issuetype'],
        });

        if (!result.issues || result.issues.length === 0) break;

        allIssues.push(...result.issues);

        if (allIssues.length >= (result.total ?? 0)) break;
        startAt += maxResults;
      }

      if (allIssues.length === 0) {
        tcGenerateLogger.warn('No test cases found in project');
        return [];
      }

      tcGenerateLogger.info(`Retrieved ${allIssues.length} test cases from Jira`);
      return allIssues;
    } catch (error) {
      tcGenerateLogger.error('Error querying test cases', error);
      throw error;
    }
  }

  shouldIncludeTestCase(issueKey: string): boolean {
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
        module.testCaseIds && (module.testCaseIds as string[]).includes(issueKey),
      );
      tcGenerateLogger.debug(`Test case ${issueKey} ${inAnyModule ? 'found' : 'NOT found'} in module configuration`);
      return inAnyModule;
    }

    for (const moduleName of activeModules) {
      const module = testFilter.modules.find(m => m.name === moduleName);
      if (module && module.testCaseIds && (module.testCaseIds as string[]).includes(issueKey)) {
        tcGenerateLogger.debug(`Test case ${issueKey} found in active module: ${moduleName}`);
        return true;
      }
    }

    tcGenerateLogger.debug(`Test case ${issueKey} not found in any active module`);
    return false;
  }

  getModuleForTestCase(issueKey: string): string | null {
    if (!testFilter || !testFilter.modules) return null;

    for (const module of testFilter.modules) {
      if (module.testCaseIds && (module.testCaseIds as string[]).includes(issueKey)) {
        return module.name;
      }
    }
    return null;
  }

  async getTestCaseDetails(issueKey: string): Promise<TestCaseData | null> {
    try {
      const issue = await this.client!.issues.getIssue({
        issueIdOrKey: issueKey,
        fields: ['summary', 'description', 'labels', 'priority', 'components', 'status', 'issuetype'],
      });

      if (!issue) {
        tcGenerateLogger.warn(`Test case ${issueKey} not found`);
        return null;
      }

      const fields = issue.fields as Record<string, unknown>;
      const labels = (fields.labels as string[]) ?? [];

      return {
        id: issue.key,
        revision: (issue as unknown as { historyMetadata?: { parentHistoryToken?: string } }).historyMetadata
          ? 1
          : 1,
        title: (fields.summary as string) ?? '',
        steps: this.extractDescription(fields.description),
        description: this.extractDescription(fields.description),
        tags: labels.join(', '),
        state: (fields.status as { name?: string })?.name ?? '',
        priority: (fields.priority as { name?: string })?.name ?? 'Medium',
        automationStatus: labels.includes('automated') ? 'Automated' : 'Not Automated',
        areaPath: (fields.components as Array<{ name?: string }>)?.[0]?.name ?? '',
      };
    } catch (error) {
      tcGenerateLogger.error(`Error fetching test case details for ${issueKey}`, error);
      return null;
    }
  }

  private extractDescription(descriptionField: unknown): string {
    if (!descriptionField) return '';
    if (typeof descriptionField === 'string') return descriptionField;
    // Jira ADF (Atlassian Document Format) — extract plain text from content nodes
    const adf = descriptionField as { content?: Array<{ content?: Array<{ text?: string }> }> };
    return (adf.content ?? [])
      .flatMap(block => block.content ?? [])
      .map(node => node.text ?? '')
      .join('\n')
      .trim();
  }

  async createSnapshot(): Promise<TestCaseData[]> {
    tcGenerateLogger.info('Creating snapshot of test cases...');
    const snapshot: TestCaseData[] = [];

    try {
      const allIssues = await this.getAllTestCasesInProject();

      if (!allIssues || allIssues.length === 0) {
        tcGenerateLogger.warn('No test cases found in project');
        return snapshot;
      }

      tcGenerateLogger.info(`Processing ${allIssues.length} test case(s)...`);

      let includedCount = 0;
      let skippedCount = 0;

      for (const raw of allIssues) {
        const issue = raw as { key: string; fields: Record<string, unknown> };
        if (!issue || !issue.fields) continue;

        const issueKey = issue.key;

        if (!this.shouldIncludeTestCase(issueKey)) {
          tcGenerateLogger.debug(`Skipping test case ${issueKey} - not in active modules`);
          skippedCount++;
          continue;
        }

        const status = (issue.fields.status as { name?: string })?.name ?? '';
        if (status === 'Removed' || status === 'Deleted' || status === 'Cancelled') {
          tcGenerateLogger.debug(`Skipping test case ${issueKey} - status: ${status}`);
          skippedCount++;
          continue;
        }

        const moduleName = this.getModuleForTestCase(issueKey);
        const labels = (issue.fields.labels as string[]) ?? [];
        const components = (issue.fields.components as Array<{ name?: string }>) ?? [];

        const testCaseData: TestCaseData = {
          id: issueKey,
          revision: 1,
          title: (issue.fields.summary as string) ?? '',
          steps: this.extractDescription(issue.fields.description),
          description: this.extractDescription(issue.fields.description),
          tags: labels.join(', '),
          state: status,
          priority: (issue.fields.priority as { name?: string })?.name ?? 'Medium',
          automationStatus: labels.includes('automated') ? 'Automated' : 'Not Automated',
          areaPath: components[0]?.name ?? '',
          module: moduleName || 'Uncategorized',
          planName: 'All Test Cases',
          suiteName: components[0]?.name ?? 'General',
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
        tcGenerateLogger.info(`New test case detected: ${current.title} (Key: ${current.id}, Module: ${current.module})`);
      } else if (old.revision !== current.revision) {
        changes.push({ type: 'updated', testCase: current, oldTestCase: old });
        tcGenerateLogger.info(`Updated test case detected: ${current.title} (Key: ${current.id}, Module: ${current.module})`);
      }
    }

    for (const old of oldSnapshot) {
      if (!newMap.has(old.id)) {
        changes.push({ type: 'deleted', testCase: old });
        tcGenerateLogger.info(`Deleted test case detected: ${old.title} (Key: ${old.id}, Module: ${old.module})`);
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

export default JiraListener;
