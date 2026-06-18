import 'dotenv/config';
import JiraListener from './listeners/testPlanListener.js';
import PlaywrightGenerator from './generators/playwrightGenerator.js';
import GitMonitor from './monitors/gitMonitor.js';
import PipelineOrchestrator from './orchestrator/pipelineOrchestrator.js';
import ReportGenerator from './reporters/reportGenerator.js';
import tcGenerateLogger from './utils/tc-generate-logger.js';
import testFilter from '../config/testCaseFilter.js';
import type { TestCaseData, Change } from './listeners/testPlanListener.js';

interface ProcessResults {
  added: Array<{ testCase: TestCaseData; filePath?: string }>;
  updated: Array<{ testCase: TestCaseData; filePath?: string }>;
  deleted: Array<{ testCase: TestCaseData; deleted: boolean }>;
  errors: Array<{ testCase: TestCaseData; error: string }>;
}

class QAAgent {
  readonly listener: InstanceType<typeof JiraListener>;
  readonly generator: PlaywrightGenerator;
  readonly gitMonitor: GitMonitor;
  readonly orchestrator: PipelineOrchestrator;
  readonly reporter: ReportGenerator;
  private isInitialized: boolean;

  constructor() {
    this.listener = new JiraListener(
      process.env.JIRA_BASE_URL!,
      process.env.JIRA_EMAIL!,
      process.env.JIRA_API_TOKEN!,
      process.env.JIRA_PROJECT_KEY!,
      process.env.JIRA_TC_ISSUE_TYPE || 'Task',
    );

    this.generator = PlaywrightGenerator.fromEnv();

    this.gitMonitor = new GitMonitor(process.env.REPO_PATH || process.cwd());
    this.orchestrator = new PipelineOrchestrator(
      process.env.TEST_DIRECTORY || './tests/generated',
    );
    this.reporter = new ReportGenerator();

    this.isInitialized = false;
  }

  async initialize(): Promise<void> {
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

  async start(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    tcGenerateLogger.info('Starting QA Agent...');
    tcGenerateLogger.info(`Polling interval: ${process.env.POLL_INTERVAL || 60000}ms`);

    this.listener.handleChanges = async (changes: Change[]) => {
      await this.processTestCaseChanges(changes);
      return changes;
    };

    await this.listener.pollForChanges(
      parseInt(process.env.POLL_INTERVAL ?? '60000') || 60000,
    );

    tcGenerateLogger.info('QA Agent is now running. Press Ctrl+C to stop.');
  }

  async manualSync(): Promise<void> {
    tcGenerateLogger.info('Starting manual sync of test plans...');

    try {
      const currentSnapshot = await this.listener.createSnapshot();

      if (!this.listener.lastSnapshot || this.listener.lastSnapshot.length === 0) {
        tcGenerateLogger.info('First sync detected - generating tests for all test cases');
        await this.processTestCaseChanges(
          currentSnapshot.map(tc => ({ type: 'added' as const, testCase: tc })),
        );
      } else {
        const changes = this.listener.detectChanges(
          this.listener.lastSnapshot,
          currentSnapshot,
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

  async processTestCaseChanges(changes: Change[]): Promise<ProcessResults> {
    tcGenerateLogger.info(`Processing ${changes.length} test case changes...`);

    const results: ProcessResults = {
      added: [],
      updated: [],
      deleted: [],
      errors: [],
    };

    for (const change of changes) {
      try {
        tcGenerateLogger.info(`Processing ${change.type} test case: ${change.testCase.title}`);

        if (change.type === 'deleted') {
          const deleted = await this.orchestrator.deleteGeneratedTest(change.testCase.id);
          results.deleted.push({ testCase: change.testCase, deleted });
          continue;
        }

        const genResult = await this.generator.generateAll(change.testCase);
        const testCode = genResult.test.code;

        if (genResult.locators.action !== 'unchanged') {
          tcGenerateLogger.info(`  Locators ${genResult.locators.action}: ${genResult.locators.path}`);
        }
        if (genResult.page.action !== 'unchanged') {
          tcGenerateLogger.info(`  Page ${genResult.page.action}: ${genResult.page.path}`);
        }
        if (genResult.pomRegistered) {
          tcGenerateLogger.info('  Registered in POM: pom-lazy-self-healing.ts');
        }

        const area = this.determineArea(change.testCase);

        let filePath: string | undefined;
        if (change.type === 'added') {
          filePath = await this.orchestrator.saveGeneratedTest(testCode, change.testCase, area);
          results.added.push({ testCase: change.testCase, filePath });
        } else if (change.type === 'updated') {
          filePath = await this.orchestrator.updateGeneratedTest(testCode, change.testCase, area);
          results.updated.push({ testCase: change.testCase, filePath });
        }

        tcGenerateLogger.info(`✓ Successfully processed: ${change.testCase.title}`);
      } catch (error) {
        tcGenerateLogger.error(`✗ Error processing test case ${change.testCase.id}: ${(error as Error).message}`, error);
        results.errors.push({
          testCase: change.testCase,
          error: (error as Error).message,
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

  determineArea(testCase: TestCaseData): string {
    if (testCase.module) {
      return testCase.module;
    }

    if (!testFilter || !testFilter.modules) {
      tcGenerateLogger.warn('Test filter configuration not found, using default area');
      return 'general';
    }

    for (const module of testFilter.modules) {
      if (!module || !module.testCaseIds) continue;

      if (module.testCaseIds.includes(testCase.id)) {
        tcGenerateLogger.debug(`Test case "${testCase.title}" mapped to module: ${module.name}`);
        return module.name;
      }
    }

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

  async stop(): Promise<void> {
    tcGenerateLogger.info('Stopping QA Agent...');
    await this.generator.closeMCPSession();
    tcGenerateLogger.info('QA Agent stopped');
  }
}

export default QAAgent;
