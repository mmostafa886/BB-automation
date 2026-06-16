import 'dotenv/config';
import { execSync } from 'child_process';
import tcGenerateLogger from '../utils/tc-generate-logger.js';

const area = process.argv[2];

if (!area) {
  console.error('Usage: tsx src/scripts/run-tests-for-area.ts <area-name>');
  process.exit(1);
}

try {
  tcGenerateLogger.info(`Running tests for area: ${area}`);

  execSync(`npx playwright test tests/generated/${area} --reporter=html,list`, {
    stdio: 'inherit',
  });

  tcGenerateLogger.info('Tests completed');
} catch (error) {
  tcGenerateLogger.error('Tests failed:', (error as Error).message);
  process.exit(1);
}
