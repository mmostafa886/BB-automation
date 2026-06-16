const { execSync } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const tcGenerateLogger = require('../utils/tc-generate-logger');
const testFilter = require(path.join(__dirname, '../../config/testCaseFilter'));

class PipelineOrchestrator {
  constructor(testDirectory) {
    this.testDirectory = testDirectory;
    this.testRegistry = new Map();
  }

  async initialize() {
    try {
      // Ensure test directory exists
      await fs.mkdir(this.testDirectory, { recursive: true });
      tcGenerateLogger.info(`Test directory initialized: ${this.testDirectory}`);
      
      // Load existing test registry if it exists
      await this.loadTestRegistry();
    } catch (error) {
      tcGenerateLogger.error('Error initializing orchestrator', error);
      throw error;
    }
  }

  /**
   * Determine which module folder a test case belongs to
   */
  determineModuleFolder(testCaseId) {
    if (!testFilter || testFilter.filterMode !== 'modules' || !testFilter.modules) {
      tcGenerateLogger.debug(`No module filter configured for test case ${testCaseId}`);
      return 'Uncategorized';
    }

    // Find which module this test case belongs to
    for (const module of testFilter.modules) {
      if (module.testCaseIds && module.testCaseIds.includes(testCaseId)) {
        tcGenerateLogger.debug(`Test case ${testCaseId} belongs to module: ${module.name}`);
        return module.name;
      }
    }

    // If not found in any module, put in Uncategorized
    tcGenerateLogger.warn(`Test case ${testCaseId} not found in any module configuration`);
    return 'Uncategorized';
  }

  async saveGeneratedTest(testCode, testCase, area) {
    try {
      // Determine the module folder based on test case ID
      const moduleName = this.determineModuleFolder(testCase.id);
      const moduleDir = path.join(this.testDirectory, moduleName);
      
      await fs.mkdir(moduleDir, { recursive: true });
      
      const sanitizedTitle = testCase.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 80); // Limit length
      
      // TypeScript file extension
      const fileName = `tc-${testCase.id}-${sanitizedTitle}.spec.ts`;
      const filePath = path.join(moduleDir, fileName);
      
      const metadata = `/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 * 
 * @testcase TC-${testCase.id}
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
        fileType: 'typescript'
      });
      
      await this.saveTestRegistry();
      
      tcGenerateLogger.info(`✅ TypeScript test saved: ${filePath}`);
      return filePath;
    } catch (error) {
      tcGenerateLogger.error(`❌ Error saving test for ${testCase.title}`, error);
      throw error;
    }
  }

  async updateGeneratedTest(testCode, testCase, area) {
    try {
      const existingTest = this.testRegistry.get(testCase.id);
      
      if (existingTest) {
        // Check if test case has moved to a different module
        const newModule = this.determineModuleFolder(testCase.id);
        
        if (newModule !== existingTest.module) {
          tcGenerateLogger.info(`📦 Test case ${testCase.id} moved from ${existingTest.module} to ${newModule}`);
          
          // Delete old file
          try {
            await fs.unlink(existingTest.filePath);
            tcGenerateLogger.info(`🗑️  Deleted old test file: ${existingTest.filePath}`);
          } catch (err) {
            tcGenerateLogger.warn(`Could not delete old file: ${err.message}`);
          }
          
          // Save in new location
          return await this.saveGeneratedTest(testCode, testCase, area);
        }
        
        // Update in the same location
        const metadata = `/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 * 
 * @testcase TC-${testCase.id}
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

  async deleteGeneratedTest(testCaseId) {
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

  async runTests(affectedAreas = [], tags = [], grep = '') {
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
        cwd: process.cwd()
      });
      
      tcGenerateLogger.info('✅ Test execution completed successfully');
      return { 
        success: true, 
        output,
        command 
      };
    } catch (error) {
      tcGenerateLogger.warn('⚠️  Test execution completed with failures');
      return { 
        success: false, 
        output: error.stdout || '', 
        error: error.stderr || '',
        command: error.cmd
      };
    }
  }

  async generateTestList(affectedAreas, testCases) {
    const testList = {
      timestamp: new Date().toISOString(),
      affectedAreas,
      totalTests: testCases.length,
      tests: testCases.map(tc => ({
        id: tc.id,
        title: tc.title,
        module: tc.module || tc.area,
        area: tc.area,
        status: 'pending',
        filePath: this.testRegistry.get(tc.id)?.filePath || null
      }))
    };

    const outputPath = path.join(process.cwd(), 'test-execution-plan.json');
    await fs.writeFile(
      outputPath,
      JSON.stringify(testList, null, 2)
    );

    tcGenerateLogger.info(`📋 Test execution plan saved: ${outputPath}`);
    return testList;
  }

  async loadTestRegistry() {
    try {
      const registryPath = path.join(process.cwd(), 'test-registry.json');
      const data = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(data);
      
      this.testRegistry = new Map(Object.entries(registry));
      tcGenerateLogger.info(`📚 Loaded ${this.testRegistry.size} tests from registry`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        tcGenerateLogger.info('📝 No existing test registry found, starting fresh');
      } else {
        tcGenerateLogger.error('Error loading test registry', error);
      }
    }
  }

  async saveTestRegistry() {
    try {
      const registryPath = path.join(process.cwd(), 'test-registry.json');
      const registry = Object.fromEntries(this.testRegistry);
      
      await fs.writeFile(
        registryPath,
        JSON.stringify(registry, null, 2)
      );
      
      tcGenerateLogger.debug('💾 Test registry saved');
    } catch (error) {
      tcGenerateLogger.error('Error saving test registry', error);
    }
  }

  getTestsForArea(area) {
    const tests = [];
    
    for (const [id, test] of this.testRegistry) {
      if (test.area === area || test.module === area) {
        tests.push(test);
      }
    }
    
    return tests;
  }

  getTestsForAreas(areas) {
    const tests = [];
    
    for (const area of areas) {
      tests.push(...this.getTestsForArea(area));
    }
    
    return tests;
  }

  getTestsForModule(moduleName) {
    const tests = [];
    
    for (const [id, test] of this.testRegistry) {
      if (test.module === moduleName) {
        tests.push(test);
      }
    }
    
    return tests;
  }

  getAllTests() {
    return Array.from(this.testRegistry.values());
  }

  getModuleStatistics() {
    const stats = {};
    
    for (const [id, test] of this.testRegistry) {
      const module = test.module || 'Uncategorized';
      
      if (!stats[module]) {
        stats[module] = {
          total: 0,
          files: []
        };
      }
      
      stats[module].total++;
      stats[module].files.push(test.filePath);
    }
    
    return stats;
  }
}

module.exports = PipelineOrchestrator;