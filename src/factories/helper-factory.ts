/**
 * Helper Factory Pattern
 *
 * Centralizes creation of helper classes (Actions, Assertions, and utilities).
 * Provides consistent instantiation with optional configuration.
 *
 * Benefits:
 * - Single source of truth for helper creation
 * - Consistent configuration across all helpers
 * - Easy to add pre-configured helper variants
 * - Reduces duplication in fixtures
 * - Can apply framework-wide helper settings
 *
 * Usage Examples:
 *
 * // Create individual helpers
 * const actions = HelperFactory.createActionsHelper(page, 'My Test');
 * const assert = HelperFactory.createAssertionsHelper(page, 'My Test');
 *
 * // Create both helpers at once
 * const { actions, assert } = HelperFactory.createHelpers(page, 'My Test');
 */

import { Page, APIRequestContext } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { AdvancedAPIHelper } from '../utils/advanced-api-helper';
import { DbHelper } from '../utils/db-helper';
import { Logger } from "../utils/Logger";

export interface HelperSet {
    actions: AdvancedActionsHelper;
    assert: AdvancedAssertionsHelper;
}

export interface APIHelperSet {
    apiActions: AdvancedAPIHelper;
    assert: AdvancedAssertionsHelper;
}

export class HelperFactory {
    /**
     * Create an AdvancedActionsHelper instance
     */
    static createActionsHelper(page: Page, testName: string): AdvancedActionsHelper {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating AdvancedActionsHelper for test: ${testName}`);
        return new AdvancedActionsHelper(page, testName);
    }

    /**
     * Create an AdvancedAssertionsHelper instance
     * @param page - Playwright Page instance
     * @param testName - Test name for logging
     * @param enableScreenshots - When false, disables screenshot capture (useful for API tests). Defaults to true.
     */
    static createAssertionsHelper(page: Page, testName: string, enableScreenshots: boolean = true): AdvancedAssertionsHelper {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating AdvancedAssertionsHelper for test: ${testName} (screenshots: ${enableScreenshots ? 'enabled' : 'disabled'})`);
        return new AdvancedAssertionsHelper(page, testName, enableScreenshots);
    }

    /**
     * Create both action and assertion helpers at once
     * Returns an object with both helpers
     */
    static createHelpers(page: Page, testName: string): HelperSet {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating helper set (actions + assertions) for test: ${testName}`);

        return {
            actions: this.createActionsHelper(page, testName),
            assert: this.createAssertionsHelper(page, testName)
        };
    }

    /**
     * Create a complete test suite with pages and helpers
     * Useful for quick fixture setup
     */
    static createTestSuite(page: Page, testName: string): {
        actions: AdvancedActionsHelper;
        assert: AdvancedAssertionsHelper;
    } {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating complete test suite for: ${testName}`);

        return this.createHelpers(page, testName);
    }

    // ===================== API Testing Helpers =====================

    /**
     * Create an AdvancedAPIHelper instance for API testing
     * @param request - Playwright APIRequestContext from test fixture
     * @param testName - Test name for logging
     */
    static createAPIHelper(request: APIRequestContext, testName: string): AdvancedAPIHelper {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating AdvancedAPIHelper for test: ${testName}`);
        return new AdvancedAPIHelper(request, testName);
    }

    /**
     * Create API helpers (apiActions + assertions) for API testing
     * Note: Screenshots are disabled for API tests since there's no UI context
     * @param request - Playwright APIRequestContext from test fixture
     * @param page - Playwright Page instance (used for assertion helper, but screenshots disabled)
     * @param testName - Test name for logging
     */
    static createAPIHelpers(request: APIRequestContext, page: Page, testName: string): APIHelperSet {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating API helper set (apiActions + assertions) for test: ${testName}`);

        return {
            apiActions: this.createAPIHelper(request, testName),
            assert: this.createAssertionsHelper(page, testName, false) // Disable screenshots for API tests
        };
    }

    // ===================== Database Helpers =====================

    /**
     * Create a DbHelper instance for direct PostgreSQL access.
     * Connection parameters are read from `db.env` (see `db.env.example`).
     * Always call `db.close()` in `test.afterAll` or a `finally` block.
     * @param testName - Test name for log categorisation
     */
    static createDbHelper(testName: string): DbHelper {
        const logger = Logger.getLogger('HelperFactory');
        logger.debug(`Creating DbHelper for test: ${testName}`);
        return new DbHelper(testName);
    }
}
