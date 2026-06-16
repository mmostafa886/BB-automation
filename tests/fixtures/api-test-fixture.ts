import { test as base } from '@playwright/test';
import type { AdvancedAssertionsHelper } from '../../src/utils/advanced-assertions-helper';
import type { AdvancedAPIHelper } from '../../src/utils/advanced-api-helper';
import { Logger } from "../../src/utils/Logger";
import { HelperFactory } from '../../src/factories/helper-factory';

/**
 * Type definition for API test helpers.
 * Provides apiActions for logged API calls and assert for assertions.
 */
type APITestFixture = {
    apiActions: AdvancedAPIHelper;
    assert: AdvancedAssertionsHelper;
};

/**
 * Fixture that provides API test helpers with automatic lifecycle logging.
 *
 * Usage:
 *   import { test } from '../../fixtures/api-test-fixture';
 *
 *   test('API test', async ({ request, page, apiTestFixture }) => {
 *       const { apiActions, assert } = apiTestFixture;
 *       const response = await apiActions.get('/users', 'Fetch users');
 *       await assert.toEqual(response.status(), 200, 'Verify status 200');
 *   });
 */
export const test = base.extend<{ apiTestFixture: APITestFixture }>({
    apiTestFixture: async ({ request, page }, use, testInfo) => {
        const logger = Logger.getLogger(`Fixture-API-${testInfo.title.replace(/\s+/g, '_')}`);

        const { apiActions, assert } = HelperFactory.createAPIHelpers(request, page, testInfo.title);

        logger.info(`▶ API TEST START: "${testInfo.title}"`);

        await use({ apiActions, assert });

        const apiSummary = apiActions.getSummary();
        const assertionStats = assert.getAssertionStats();

        if (testInfo.status === 'passed') {
            logger.info(`✅ API TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ API TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
        }

        logger.info(`${apiSummary}`);
        logger.info(`Total Assertions: ${assertionStats.total} (Passed: ${assertionStats.passed}, Failed: ${assertionStats.failed})`);
    }
});

export { expect } from '@playwright/test';
