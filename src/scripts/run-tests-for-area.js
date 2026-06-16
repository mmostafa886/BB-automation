#!/usr/bin/env node

require('dotenv').config();
const { execSync } = require('child_process');
const tcGenerateLogger = require('../utils/tc-generate-logger');

const area = process.argv[2];

if (!area) {
  console.error('Usage: node src/scripts/run-tests-for-area.js <area-name>');
  process.exit(1);
}

try {
  tcGenerateLogger.info(`Running tests for area: ${area}`);

  execSync(`npx playwright test tests/generated/${area} --reporter=html,list`, {
    stdio: 'inherit'
  });

  tcGenerateLogger.info('Tests completed');
} catch (error) {
  tcGenerateLogger.error('Tests failed:', error.message);
  process.exit(1);
}
