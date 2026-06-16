import 'dotenv/config';
import QAAgent from '../index.js';
import tcGenerateLogger from '../utils/tc-generate-logger.js';

async function manualSync(): Promise<void> {
  const agent = new QAAgent();

  try {
    tcGenerateLogger.info('Starting manual synchronization...');

    await agent.listener.initialize();
    await agent.orchestrator.initialize();
    await agent.reporter.initialize();

    tcGenerateLogger.info('QA Agent components initialized');

    await agent.manualSync();

    tcGenerateLogger.info('Manual synchronization completed successfully');
    process.exit(0);
  } catch (error) {
    tcGenerateLogger.error('Manual synchronization failed:', (error as Error).message, error);
    process.exit(1);
  } finally {
    await agent.generator.closeMCPSession().catch(() => {});
  }
}

manualSync();
