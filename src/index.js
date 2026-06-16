require('dotenv').config();
const path = require('path');
const TestPlanListener = require('./listeners/testPlanListener');
const PlaywrightGenerator = require('./generators/playwrightGenerator');
const GitMonitor = require('./monitors/gitMonitor');
const PipelineOrchestrator = require('./orchestrator/pipelineOrchestrator');
const ReportGenerator = require('./reporters/reportGenerator');
const tcGenerateLogger = require('./utils/tc-generate-logger');

// Use testCaseFilter for module-based filtering
const testFilter = require(path.join(__dirname, '../config/testCaseFilter'));

class QAAgent {
  constructor() {
    this.listener = new TestPlanListener(
      process.env.AZURE_DEVOPS_ORG_URL,
      process.env.AZURE_PERSONAL_ACCESS_TOKEN,
      process.env.AZURE_PROJECT_NAME
    );
    
    this.generator = PlaywrightGenerator.fromEnv();
    
    this.gitMonitor = new GitMonitor(process.env.REPO_PATH || process.cwd());
    this.orchestrator = new PipelineOrchestrator(
      process.env.TEST_DIRECTORY || './tests/generated'
    );
    this.reporter = new ReportGenerator();
    
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) {
      tcGenerateLogger.warn('Agent already initialized');
      return;
    }

    try {
      tcGenerateLogger.info('Initializing QA Agent...');
      
      await this.listener.initialize();
      await this.orchestrator.initialize();
      await this.reporter.initialize();
      
      this.isInitialized = true;
      tcGenerateLogger.info('QA Agent initialized successfully');
    } catch (error) {
      tcGenerateLogger.error('Failed to initialize QA Agent', error);
      throw error;
    }
  }

  async start() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    tcGenerateLogger.info('Starting QA Agent...');
    tcGenerateLogger.info(`Polling interval: ${process.env.POLL_INTERVAL || 60000}ms`);
    
    // Override the handleChanges method to use our custom handler
    this.listener.handleChanges = async (changes) => {
      await this.processTestCaseChanges(changes);
    };
    
    // Start listening for test case changes
    await this.listener.pollForChanges(
      parseInt(process.env.POLL_INTERVAL) || 60000
    );
    
    tcGenerateLogger.info('QA Agent is now running. Press Ctrl+C to stop.');
  }

  async manualSync() {
    tcGenerateLogger.info('Starting manual sync of test plans...');
    
    try {
      const currentSnapshot = await this.listener.createSnapshot();
      
      if (!this.listener.lastSnapshot || this.listener.lastSnapshot.length === 0) {
        tcGenerateLogger.info('First sync detected - generating tests for all test cases');
        await this.processTestCaseChanges(
          currentSnapshot.map(tc => ({ type: 'added', testCase: tc }))
        );
      } else {
        const changes = this.listener.detectChanges(
          this.listener.lastSnapshot,
          currentSnapshot
        );
        await this.processTestCaseChanges(changes);
      }
      
      this.listener.lastSnapshot = currentSnapshot;
      tcGenerateLogger.info('Manual sync completed');
    } catch (error) {
      tcGenerateLogger.error('Error during manual sync:', error);
      throw error;
    } finally {
      await this.generator.closeMCPSession();
    }
  }

  async processTestCaseChanges(changes) {
    tcGenerateLogger.info(`Processing ${changes.length} test case changes...`);
    
    const results = {
      added: [],
      updated: [],
      deleted: [],
      errors: []
    };

    for (const change of changes) {
      try {
        tcGenerateLogger.info(`Processing ${change.type} test case: ${change.testCase.title}`);
        
        if (change.type === 'deleted') {
          const deleted = await this.orchestrator.deleteGeneratedTest(change.testCase.id);
          results.deleted.push({ testCase: change.testCase, deleted });
          continue;
        }

        // generateAll creates locators, page class, POM registration, then test
        const genResult = await this.generator.generateAll(change.testCase);
        const testCode = genResult.test.code;

        // Log infrastructure changes
        if (genResult.locators.action !== 'unchanged') {
          tcGenerateLogger.info(`  Locators ${genResult.locators.action}: ${genResult.locators.path}`);
        }
        if (genResult.page.action !== 'unchanged') {
          tcGenerateLogger.info(`  Page ${genResult.page.action}: ${genResult.page.path}`);
        }
        if (genResult.pomRegistered) {
          tcGenerateLogger.info(`  Registered in POM: pom-lazy-self-healing.ts`);
        }

        const area = this.determineArea(change.testCase);

        let filePath;
        if (change.type === 'added') {
          filePath = await this.orchestrator.saveGeneratedTest(
            testCode,
            change.testCase,
            area
          );
          results.added.push({ testCase: change.testCase, filePath });
        } else if (change.type === 'updated') {
          filePath = await this.orchestrator.updateGeneratedTest(
            testCode,
            change.testCase,
            area
          );
          results.updated.push({ testCase: change.testCase, filePath });
        }

        tcGenerateLogger.info(`✓ Successfully processed: ${change.testCase.title}`);
      } catch (error) {
        tcGenerateLogger.error(`✗ Error processing test case ${change.testCase.id}: ${error.message}`, error);
        results.errors.push({ 
          testCase: change.testCase, 
          error: error.message 
        });
      }
    }

    tcGenerateLogger.info('Test case processing summary:');
    tcGenerateLogger.info(`  Added: ${results.added.length}`);
    tcGenerateLogger.info(`  Updated: ${results.updated.length}`);
    tcGenerateLogger.info(`  Deleted: ${results.deleted.length}`);
    tcGenerateLogger.info(`  Errors: ${results.errors.length}`);

    return results;
  }

  determineArea(testCase) {
    const title = (testCase.title || '').toLowerCase();
    const tags = (testCase.tags || '').toLowerCase();
    const areaPath = (testCase.areaPath || '').toLowerCase();
    
    // Use module from testCase if already assigned
    if (testCase.module) {
      return testCase.module;
    }
    
    // Safety check for testFilter
    const testFilter = require('./config/testCaseFilter');
    if (!testFilter || !testFilter.modules) {
      tcGenerateLogger.warn('Test filter configuration not found, using default area');
      return 'general';
    }
    
    // Check each module to find a match by test case ID
    for (const module of testFilter.modules) {
      if (!module || !module.testCaseIds) continue;
      
      if (module.testCaseIds.includes(testCase.id)) {
        tcGenerateLogger.debug(`Test case "${testCase.title}" mapped to module: ${module.name}`);
        return module.name;
      }
    }
    
    // Try to extract area from areaPath
    if (testCase.areaPath) {
      const pathParts = testCase.areaPath.split('\\');
      if (pathParts.length > 1) {
        const lastPart = pathParts[pathParts.length - 1].toLowerCase().replace(/\s+/g, '-');
        tcGenerateLogger.debug(`Test case "${testCase.title}" mapped to area from path: ${lastPart}`);
        return lastPart;
      }
    }
    
    tcGenerateLogger.debug(`Test case "${testCase.title}" mapped to default area: general`);
    return 'general';
  }

  async stop() {
    tcGenerateLogger.info('Stopping QA Agent...');
    await this.generator.closeMCPSession();
    tcGenerateLogger.info('QA Agent stopped');
  }
}

module.exports = QAAgent;