require('dotenv').config();
const QAAgent = require('./index');
const tcGenerateLogger = require('./utils/tc-generate-logger');

async function main() {
  const agent = new QAAgent();
  
  try {
    tcGenerateLogger.info('='.repeat(60));
    tcGenerateLogger.info('Starting CI/CD Test Execution');
    tcGenerateLogger.info('='.repeat(60));
    
    // Initialize the agent
    await agent.initialize();
    
    // Get base branch from environment or use default
    const baseBranch = process.env.BASE_BRANCH || 'main';
    tcGenerateLogger.info(`Comparing against base branch: ${baseBranch}`);
    
    // Execute tests for changed areas
    const result = await agent.executeTestsForChangedAreas(baseBranch);
    
    // Log results
    tcGenerateLogger.info('='.repeat(60));
    tcGenerateLogger.info('Test Execution Summary');
    tcGenerateLogger.info('='.repeat(60));
    tcGenerateLogger.info(`Changed Files: ${result.changedFiles.length}`);
    tcGenerateLogger.info(`Affected Areas: ${result.affectedAreas.join(', ')}`);
    tcGenerateLogger.info(`Total Tests: ${result.report?.summary.totalTests || 0}`);
    tcGenerateLogger.info(`Passed: ${result.report?.summary.passed || 0}`);
    tcGenerateLogger.info(`Failed: ${result.report?.summary.failed || 0}`);
    tcGenerateLogger.info(`Skipped: ${result.report?.summary.skipped || 0}`);
    tcGenerateLogger.info('='.repeat(60));
    
    // Exit with appropriate code
    if (result.report && result.report.summary.failed > 0) {
      tcGenerateLogger.error(`${result.report.summary.failed} test(s) failed`);
      process.exit(1);
    }
    
    tcGenerateLogger.info('All tests passed successfully! ✓');
    process.exit(0);
  } catch (error) {
    tcGenerateLogger.error('Test execution failed with error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = main;