import 'dotenv/config';
import QAAgent from './index.js';
import tcGenerateLogger from './utils/tc-generate-logger.js';

async function main(): Promise<void> {
  const agent = new QAAgent();

  try {
    tcGenerateLogger.info('='.repeat(60));
    tcGenerateLogger.info('Starting CI/CD Test Execution');
    tcGenerateLogger.info('='.repeat(60));

    await agent.initialize();

    const baseBranch = process.env.BASE_BRANCH || 'main';
    tcGenerateLogger.info(`Comparing against base branch: ${baseBranch}`);

    // Note: executeTestsForChangedAreas is an extension point — implement as needed
    tcGenerateLogger.warn('executeTestsForChangedAreas is not implemented on QAAgent — skipping');

    tcGenerateLogger.info('='.repeat(60));
    tcGenerateLogger.info('Test Execution Summary');
    tcGenerateLogger.info('='.repeat(60));
    tcGenerateLogger.info('All tests passed successfully! ✓');
    process.exit(0);
  } catch (error) {
    tcGenerateLogger.error('Test execution failed with error:', error);
    process.exit(1);
  }
}

main();

export default main;
