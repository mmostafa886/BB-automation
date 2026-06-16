const azdev = require('azure-devops-node-api');
const tcGenerateLogger = require('../utils/tc-generate-logger');

let testFilter;
try {
  testFilter = require('../../config/testCaseFilter');
} catch (error) {
  console.error('Could not load testCaseFilter:', error.message);
  testFilter = { filterMode: 'none', modules: [] };
}

class TestPlanListener {
  constructor(orgUrl, token, project) {
    this.orgUrl = orgUrl;
    this.token = token;
    this.project = project;
    this.connection = null;
  }

  async initialize() {
    try {
      this.connection = new azdev.WebApi(
        this.orgUrl, 
        azdev.getPersonalAccessTokenHandler(this.token)
      );
      tcGenerateLogger.info('Azure DevOps connection initialized');
    } catch (error) {
      tcGenerateLogger.error('Failed to initialize Azure DevOps connection', error);
      throw error;
    }
  }

  async getAllTestCasesInProject() {
    try {
      tcGenerateLogger.info('Querying all test cases in project...');
      const witApi = await this.connection.getWorkItemTrackingApi();
      
      // Query to get all test case IDs
      const wiql = {
        query: `SELECT [System.Id] 
                FROM WorkItems 
                WHERE [System.WorkItemType] = 'Test Case' 
                AND [System.TeamProject] = '${this.project}'
                ORDER BY [System.Id] DESC`
      };
      
      const queryResult = await witApi.queryByWiql(wiql, this.project);
      
      if (!queryResult || !queryResult.workItems || queryResult.workItems.length === 0) {
        tcGenerateLogger.warn('No test cases found in project');
        return [];
      }

      tcGenerateLogger.info(`Found ${queryResult.workItems.length} test cases in project`);

      // Get full details for each test case
      const testCaseIds = queryResult.workItems.map(wi => wi.id);
      const allTestCases = [];
      
      let processedCount = 0;
      for (const testCaseId of testCaseIds) {
        try {
          const workItem = await witApi.getWorkItem(testCaseId);
          if (workItem) {
            allTestCases.push(workItem);
          }
          
          processedCount++;
          
          // Log progress every 50 items
          if (processedCount % 50 === 0) {
            tcGenerateLogger.info(`Progress: ${processedCount}/${testCaseIds.length} test cases processed`);
          }
        } catch (error) {
          tcGenerateLogger.warn(`Could not fetch test case ${testCaseId}: ${error.message}`);
        }
      }

      tcGenerateLogger.info(`Retrieved details for ${allTestCases.length} test cases`);
      return allTestCases;
    } catch (error) {
      tcGenerateLogger.error('Error querying test cases', error);
      throw error;
    }
  }

  /**
   * Check if a test case should be included based on configured filters
   */
  shouldIncludeTestCase(testCaseId) {
    // If no filter configured or filter mode is not 'modules', include all
    if (!testFilter || testFilter.filterMode !== 'modules') {
      tcGenerateLogger.debug('No module filter configured, including all test cases');
      return true;
    }

    // If no modules defined, include all
    if (!testFilter.modules || testFilter.modules.length === 0) {
      tcGenerateLogger.debug('No modules defined in filter, including all test cases');
      return true;
    }

    // Check if filtering by active modules
    const activeModules = testFilter.activeModules || [];
    
    // If no active modules specified, check if test case exists in ANY module
    if (activeModules.length === 0) {
      const inAnyModule = testFilter.modules.some(module => 
        module.testCaseIds && module.testCaseIds.includes(testCaseId)
      );
      
      if (inAnyModule) {
        tcGenerateLogger.debug(`Test case ${testCaseId} found in module configuration`);
      } else {
        tcGenerateLogger.debug(`Test case ${testCaseId} NOT found in any module configuration`);
      }
      
      return inAnyModule;
    }

    // Check if test case ID exists in any active module
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

  /**
   * Get the module name for a test case ID
   */
  getModuleForTestCase(testCaseId) {
    if (!testFilter || !testFilter.modules) {
      return null;
    }

    for (const module of testFilter.modules) {
      if (module.testCaseIds && module.testCaseIds.includes(testCaseId)) {
        return module.name;
      }
    }

    return null;
  }

  async getTestCaseDetails(testCaseId) {
    try {
      const witApi = await this.connection.getWorkItemTrackingApi();
      const workItem = await witApi.getWorkItem(testCaseId);
      
      if (!workItem) {
        tcGenerateLogger.warn(`Test case ${testCaseId} not found`);
        return null;
      }

      // Verify it's actually a test case
      if (workItem.fields['System.WorkItemType'] !== 'Test Case') {
        tcGenerateLogger.debug(`Work item ${testCaseId} is not a test case, skipping`);
        return null;
      }

      return {
        id: workItem.id,
        revision: workItem.rev,
        title: workItem.fields['System.Title'],
        steps: workItem.fields['Microsoft.VSTS.TCM.Steps'],
        description: workItem.fields['System.Description'],
        tags: workItem.fields['System.Tags'],
        state: workItem.fields['System.State'],
        priority: workItem.fields['Microsoft.VSTS.Common.Priority'],
        automationStatus: workItem.fields['Microsoft.VSTS.TCM.AutomationStatus'],
        areaPath: workItem.fields['System.AreaPath']
      };
    } catch (error) {
      tcGenerateLogger.error(`Error fetching test case details for ${testCaseId}`, error);
      return null;
    }
  }

  async createSnapshot() {
    tcGenerateLogger.info('Creating snapshot of test cases...');
    const snapshot = [];
    
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
        if (!workItem || !workItem.fields) continue;
        
        const testCaseId = workItem.id;
        
        // **FILTER BY MODULE CONFIGURATION**
        if (!this.shouldIncludeTestCase(testCaseId)) {
          tcGenerateLogger.debug(`Skipping test case ${testCaseId} - not in active modules`);
          skippedCount++;
          continue;
        }
        
        // Check test case state
        const state = workItem.fields['System.State'];
        if (state === 'Removed' || state === 'Deleted') {
          tcGenerateLogger.debug(`Skipping test case ${testCaseId} - state: ${state}`);
          skippedCount++;
          continue;
        }

        // Get module name for this test case
        const moduleName = this.getModuleForTestCase(testCaseId);

        const testCaseData = {
          id: workItem.id,
          revision: workItem.rev,
          title: workItem.fields['System.Title'],
          steps: workItem.fields['Microsoft.VSTS.TCM.Steps'],
          description: workItem.fields['System.Description'],
          tags: workItem.fields['System.Tags'],
          state: workItem.fields['System.State'],
          priority: workItem.fields['Microsoft.VSTS.Common.Priority'],
          automationStatus: workItem.fields['Microsoft.VSTS.TCM.AutomationStatus'],
          areaPath: workItem.fields['System.AreaPath'],
          module: moduleName || 'Uncategorized',
          planName: 'All Test Cases',
          suiteName: workItem.fields['System.AreaPath'] || 'General'
        };

        snapshot.push(testCaseData);
        includedCount++;
      }
      
      tcGenerateLogger.info(`Snapshot created with ${snapshot.length} test cases`);
      tcGenerateLogger.info(`  Included: ${includedCount}`);
      tcGenerateLogger.info(`  Skipped: ${skippedCount}`);
      
      // Log breakdown by module
      if (testFilter && testFilter.filterMode === 'modules') {
        const moduleBreakdown = {};
        snapshot.forEach(tc => {
          moduleBreakdown[tc.module] = (moduleBreakdown[tc.module] || 0) + 1;
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

  detectChanges(oldSnapshot, newSnapshot) {
    const changes = [];
    
    if (!oldSnapshot || oldSnapshot.length === 0) {
      tcGenerateLogger.info('First snapshot - all test cases are new');
      return newSnapshot.map(tc => ({ type: 'added', testCase: tc }));
    }

    const oldMap = new Map(oldSnapshot.map(tc => [tc.id, tc]));
    const newMap = new Map(newSnapshot.map(tc => [tc.id, tc]));
    
    // Detect added and updated test cases
    for (const current of newSnapshot) {
      const old = oldMap.get(current.id);
      
      if (!old) {
        changes.push({ 
          type: 'added', 
          testCase: current 
        });
        tcGenerateLogger.info(`New test case detected: ${current.title} (ID: ${current.id}, Module: ${current.module})`);
      } else if (old.revision !== current.revision) {
        changes.push({ 
          type: 'updated', 
          testCase: current, 
          oldTestCase: old 
        });
        tcGenerateLogger.info(`Updated test case detected: ${current.title} (ID: ${current.id}, Module: ${current.module})`);
      }
    }
    
    // Detect deleted test cases
    for (const old of oldSnapshot) {
      if (!newMap.has(old.id)) {
        changes.push({ 
          type: 'deleted', 
          testCase: old 
        });
        tcGenerateLogger.info(`Deleted test case detected: ${old.title} (ID: ${old.id}, Module: ${old.module})`);
      }
    }
    
    return changes;
  }

  async pollForChanges(interval = 60000) {
    tcGenerateLogger.info(`Starting polling with interval: ${interval}ms`);
    
    // Log active filter configuration
    if (testFilter && testFilter.filterMode === 'modules') {
      tcGenerateLogger.info('Module filter active:');
      if (testFilter.activeModules && testFilter.activeModules.length > 0) {
        tcGenerateLogger.info(`  Active modules: ${testFilter.activeModules.join(', ')}`);
      } else {
        tcGenerateLogger.info('  Processing all modules');
      }
    }
    
    // Create initial snapshot
    this.lastSnapshot = await this.createSnapshot();
    
    // Poll for changes
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

  async handleChanges(changes) {
    // This method will be overridden by the main application
    tcGenerateLogger.info(`Processing ${changes.length} changes...`);
    return changes;
  }
}

module.exports = TestPlanListener;