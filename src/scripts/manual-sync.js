#!/usr/bin/env node

require('dotenv').config();
const QAAgent = require('../index');
const tcGenerateLogger = require('../utils/tc-generate-logger');

async function manualSync() {
  const agent = new QAAgent();

  try {
    tcGenerateLogger.info('Starting manual synchronization...');

    // Initialize the agent components
    await agent.listener.initialize();
    await agent.orchestrator.initialize();
    await agent.reporter.initialize();

    tcGenerateLogger.info('QA Agent components initialized');

    // Perform manual sync
    await agent.manualSync();

    tcGenerateLogger.info('Manual synchronization completed successfully');
    process.exit(0);
  } catch (error) {
    tcGenerateLogger.error('Manual synchronization failed:', error.message, error);
    process.exit(1);
  } finally {
    // Ensure MCP browser session is always closed
    await agent.generator.closeMCPSession().catch(() => {});
  }
}

manualSync();
