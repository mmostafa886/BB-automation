import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import tcGenerateLogger from '../utils/tc-generate-logger.js';
import testFilter from '../../config/testCaseFilter.js';
import type { TestCaseData } from '../listeners/testPlanListener.js';

interface TestRegistryEntry {
  testCaseId: string;
  filePath: string;
  module: string;
  area: string;
  title: string;
  generatedAt: string;
  revision: number;
  fileType: string;
  updatedAt?: string;
}

interface RunTestsResult {
  success: boolean;
  output: string;
  error?: string;
  command?: string;
}

interface TestListResult {
  timestamp: string;
  affectedAreas: string[];
  totalTests: number;
  tests: Array<{
    id: string;
    title: string;
    module: string;
    area: string;
    status: string;
    filePath: string | null;
  }>;
}

class PipelineOrchestrator {
  private readonly testDirectory: string;
  private testRegistry: Map<string, TestRegistryEntry>;

  constructor(testDirectory: string) {
    this.testDirectory = testDirectory;
    this.testRegistry = new Map();
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.testDirectory, { recursive: true });
      tcGenerateLogger.info(`Test directory initialized: ${this.testDirectory}`);
      await this.loadTestRegistry();
    } catch (error) {
      tcGenerateLogger.error('Error initializing orchestrator', error);
      throw error;
    }
  }

  determineModuleFolder(testCaseId: string): string {
    if (!testFilter || testFilter.filterMode !== 'modules' || !testFilter.modules) {
      tcGenerateLogger.debug(`No module filter configured for test case ${testCaseId}`);
      return 'Uncategorized';
    }

    for (const module of testFilter.modules) {
      if (module.testCaseIds && (module.testCaseIds as string[]).includes(testCaseId)) {
        tcGenerateLogger.debug(`Test case ${testCaseId} belongs to module: ${module.name}`);
        return module.name;
      }
    }

    tcGenerateLogger.warn(`Test case ${testCaseId} not found in any module configuration`);
    return 'Uncategorized';
  }

  async saveGeneratedTest(testCode: string, testCase: TestCaseData, area: string): Promise<string> {
    try {
      const moduleName = this.determineModuleFolder(testCase.id);
      const moduleDir = path.join(this.testDirectory, moduleName);

      await fs.mkdir(moduleDir, { recursive: true });

      const sanitizedTitle = testCase.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80);

      const fileName = `tc-${testCase.id}-${sanitizedTitle}.spec.ts`;
      const filePath = path.join(moduleDir, fileName);

      const metadata = `/**
 * Auto-generated Playwright TypeScript test from Jira
 *
 * @jira_tc ${testCase.id}
 * @title ${testCase.title}
 * @module ${moduleName}
 * @area ${area || 'N/A'}
 * @priority ${testCase.priority || 'Not specified'}
 * @tags ${testCase.tags || 'none'}
 *
 * @generated ${new Date().toISOString()}
 * @revision ${testCase.revision}
 */

`;

      const fullTestCode = metadata + testCode;
      await fs.writeFile(filePath, fullTestCode, 'utf-8');

      this.testRegistry.set(testCase.id, {
        testCaseId: testCase.id,
        filePath,
        module: moduleName,
        area,
        title: testCase.title,
        generatedAt: new Date().toISOString(),
        revision: testCase.revision,
        fileType: 'typescript',
      });

      await this.saveTestRegistry();

      tcGenerateLogger.info(`✅ TypeScript test saved: ${filePath}`);
      return filePath;
    } catch (error) {
      tcGenerateLogger.error(`❌ Error saving test for ${testCase.title}`, error);
      throw error;
    }
  }

  async updateGeneratedTest(testCode: string, testCase: TestCaseData, area: string): Promise<string> {
    try {
      const existingTest = this.testRegistry.get(testCase.id);

      if (existingTest) {
        const newModule = this.determineModuleFolder(testCase.id);

        if (newModule !== existingTest.module) {
          tcGenerateLogger.info(`📦 Test case ${testCase.id} moved from ${existingTest.module} to ${newModule}`);

          try {
            await fs.unlink(existingTest.filePath);
            tcGenerateLogger.info(`🗑️  Deleted old test file: ${existingTest.filePath}`);
          } catch (err) {
            tcGenerateLogger.warn(`Could not delete old file: ${(err as Error).message}`);
          }

          return await this.saveGeneratedTest(testCode, testCase, area);
        }

        const metadata = `/**
 * Auto-generated Playwright TypeScript test from Jira
 *
 * @jira_tc ${testCase.id}
 * @title ${testCase.title}
 * @module ${existingTest.module}
 * @area ${area || 'N/A'}
 * @priority ${testCase.priority || 'Not specified'}
 * @tags ${testCase.tags || 'none'}
 *
 * @generated ${existingTest.generatedAt}
 * @updated ${new Date().toISOString()}
 * @revision ${testCase.revision}
 * @previousRevision ${existingTest.revision}
 */

`;

        const fullTestCode = metadata + testCode;
        await fs.writeFile(existingTest.filePath, fullTestCode, 'utf-8');

        existingTest.updatedAt = new Date().toISOString();
        existingTest.revision = testCase.revision;

        await this.saveTestRegistry();

        tcGenerateLogger.info(`✅ Test updated: ${existingTest.filePath}`);
        return existingTest.filePath;
      } else {
        return await this.saveGeneratedTest(testCode, testCase, area);
      }
    } catch (error) {
      tcGenerateLogger.error(`❌ Error updating test for ${testCase.title}`, error);
      throw error;
    }
  }

  async deleteGeneratedTest(testCaseId: string): Promise<boolean> {
    try {
      const test = this.testRegistry.get(testCaseId);

      if (test) {
        await fs.unlink(test.filePath);
        this.testRegistry.delete(testCaseId);
        await this.saveTestRegistry();

        tcGenerateLogger.info(`🗑️  Test deleted: ${test.filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      tcGenerateLogger.error(`❌ Error deleting test for case ${testCaseId}`, error);
      return false;
    }
  }

  async runTests(affectedAreas: string[] = [], tags: string[] = [], grep = ''): Promise<RunTestsResult> {
    tcGenerateLogger.info('🧪 Starting test execution...');

    try {
      let grepPattern = '';

      if (grep) {
        grepPattern = grep;
      } else if (tags.length > 0) {
        grepPattern = tags.map(t => `@${t}`).join('|');
      } else if (affectedAreas.length > 0) {
        grepPattern = affectedAreas.join('|');
      }

      const grepArg = grepPattern ? `--grep "${grepPattern}"` : '';
      const command = `npx playwright test ${grepArg} --reporter=html,json`;

      tcGenerateLogger.info(`Executing: ${command}`);

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: 'pipe',
        cwd: process.cwd(),
      });

      tcGenerateLogger.info('✅ Test execution completed successfully');
      return { success: true, output, command };
    } catch (error) {
      const err = error as { stdout?: string; stderr?: string; cmd?: string };
      tcGenerateLogger.warn('⚠️  Test execution completed with failures');
      return {
        success: false,
        output: err.stdout || '',
        error: err.stderr || '',
        command: err.cmd,
      };
    }
  }

  async generateTestList(affectedAreas: string[], testCases: TestCaseData[]): Promise<TestListResult> {
    const testList: TestListResult = {
      timestamp: new Date().toISOString(),
      affectedAreas,
      totalTests: testCases.length,
      tests: testCases.map(tc => ({
        id: tc.id,
        title: tc.title,
        module: tc.module || tc.areaPath,
        area: tc.areaPath,
        status: 'pending',
        filePath: this.testRegistry.get(tc.id)?.filePath || null,
      })),
    };

    const outputPath = path.join(process.cwd(), 'test-execution-plan.json');
    await fs.writeFile(outputPath, JSON.stringify(testList, null, 2));

    tcGenerateLogger.info(`📋 Test execution plan saved: ${outputPath}`);
    return testList;
  }

  async loadTestRegistry(): Promise<void> {
    try {
      const registryPath = path.join(process.cwd(), 'test-registry.json');
      const data = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(data) as Record<string, TestRegistryEntry>;

      this.testRegistry = new Map(
        Object.entries(registry).map(([k, v]) => [k, v]),
      );
      tcGenerateLogger.info(`📚 Loaded ${this.testRegistry.size} tests from registry`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        tcGenerateLogger.info('📝 No existing test registry found, starting fresh');
      } else {
        tcGenerateLogger.error('Error loading test registry', error);
      }
    }
  }

  async saveTestRegistry(): Promise<void> {
    try {
      const registryPath = path.join(process.cwd(), 'test-registry.json');
      const registry = Object.fromEntries(this.testRegistry);
      await fs.writeFile(registryPath, JSON.stringify(registry, null, 2));
      tcGenerateLogger.debug('💾 Test registry saved');
    } catch (error) {
      tcGenerateLogger.error('Error saving test registry', error);
    }
  }

  getTestsForArea(area: string): TestRegistryEntry[] {
    const tests: TestRegistryEntry[] = [];
    for (const test of this.testRegistry.values()) {
      if (test.area === area || test.module === area) {
        tests.push(test);
      }
    }
    return tests;
  }

  getTestsForAreas(areas: string[]): TestRegistryEntry[] {
    return areas.flatMap(area => this.getTestsForArea(area));
  }

  getTestsForModule(moduleName: string): TestRegistryEntry[] {
    const tests: TestRegistryEntry[] = [];
    for (const test of this.testRegistry.values()) {
      if (test.module === moduleName) {
        tests.push(test);
      }
    }
    return tests;
  }

  getAllTests(): TestRegistryEntry[] {
    return Array.from(this.testRegistry.values());
  }

  getModuleStatistics(): Record<string, { total: number; files: string[] }> {
    const stats: Record<string, { total: number; files: string[] }> = {};

    for (const test of this.testRegistry.values()) {
      const module = test.module || 'Uncategorized';

      if (!stats[module]) {
        stats[module] = { total: 0, files: [] };
      }

      stats[module].total++;
      stats[module].files.push(test.filePath);
    }

    return stats;
  }
}

export default PipelineOrchestrator;
