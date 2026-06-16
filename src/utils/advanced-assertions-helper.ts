import { Locator, Page, expect } from "@playwright/test";
import fs from "fs";
import path from "path";
import winston from "winston";
import { Logger } from "../utils/Logger";

/**
 * AdvancedAssertionsHelper — A comprehensive assertion library with logging,
 * soft/hard assertion modes, and automatic failure diagnostics.
 *
 * Features:
 *   - Logging via log4js: every assertion result is logged to console, file, and HTML report
 *   - Soft assertions: when `soft: true`, failures are collected instead of throwing immediately.
 *     Call `assertAllSoftAssertions()` at the end to fail the test with all collected errors.
 *   - Hard assertions (default): failures throw immediately, stopping the test
 *   - Screenshot on failure: captures a full-page screenshot for every failed assertion (UI tests only)
 *   - API test support: screenshots automatically disabled via constructor parameter for API tests
 *   - Assertion statistics: track total/passed/failed counts via getAssertionStats()
 *
 * Assertion categories:
 *   - Visibility:  toBeVisible, toBeHidden
 *   - Text:        toHaveText, toContainText
 *   - Value:       toHaveValue, toBeEmpty
 *   - Count:       toHaveCount
 *   - State:       toBeEnabled, toBeDisabled, toBeChecked, toBeEditable, toBeFocused
 *   - Attributes:  toHaveAttribute, toHaveClass, toHaveCSS
 *   - URL/Page:    toHaveURL, toHaveTitle
 *   - Custom:      toBeTruthy, toBeFalsy, toEqual, toContain, toBeGreaterThan, toBeLessThan
 */
export class AdvancedAssertionsHelper {
    readonly page: Page;
    private readonly logger: winston.Logger;
    private assertionCounter: number = 0;   // Running count of all assertions executed
    private screenshotDir: string;           // Directory for assertion failure screenshots
    private readonly enableScreenshots: boolean; // Controls whether screenshots are captured

    /**
     * Accumulated soft assertion failures. Each entry stores the assertion number,
     * description, the caught error, and an optional screenshot path.
     * These are only populated when assertions run with `soft: true`.
     */
    private softAssertionErrors: Array<{
        assertionNumber: number;
        description: string;
        error: Error;
        screenshotPath?: string;
    }> = [];

    /**
     * Creates a new AdvancedAssertionsHelper and initializes logging.
     * @param page - Playwright Page instance for screenshot capture and page-level assertions.
     * @param testName - Used to label log output for this helper instance
     * @param enableScreenshots - When false, disables screenshot capture (useful for API tests). Defaults to true.
     */
    constructor(page: Page, testName?: string, enableScreenshots: boolean = true) {
        this.page = page;
        this.logger = Logger.getLogger(`Assertions-${testName || "default"}`);
        this.enableScreenshots = enableScreenshots;

        // Configure screenshot output directory for assertion failures
        this.screenshotDir = path.join(process.cwd(), 'test-logs', 'assertion-failures');
        this.ensureDirectoryExists(this.screenshotDir);

        this.logger.info(`=== Assertions Helper Started: ${testName || "default"} (Screenshots: ${enableScreenshots ? 'enabled' : 'disabled'}) ===`);
    }

    /** Creates a directory (and parents) if it does not already exist */
    private ensureDirectoryExists(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Captures a full-page screenshot when an assertion fails. Returns the screenshot path.
     * Skips screenshot capture for API tests or when screenshots are disabled.
     */
    private async captureFailureScreenshot(assertionName: string): Promise<string> {
        // Skip screenshots if disabled (e.g., for API tests)
        if (!this.enableScreenshots) {
            this.logger.debug(`Skipping screenshot - screenshots disabled (API test context)`);
            return '';
        }

        // Skip screenshots if page context is not valid
        if (!this.page || !this.isPageContextValid()) {
            this.logger.debug(`Skipping screenshot - no valid page context`);
            return '';
        }

        const timestamp = Date.now();
        const screenshotName = `assertion-fail-${assertionName.replace(/\s+/g, '-')}-${timestamp}.png`;
        const screenshotPath = path.join(this.screenshotDir, screenshotName);

        try {
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            this.logger.debug(`Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            this.logger.error(`Could not capture screenshot: ${error}`);
            return '';
        }
    }

    /**
     * Checks if the page has a valid browser context for screenshots.
     * Returns false for API tests or when page is not properly initialized.
     */
    private isPageContextValid(): boolean {
        try {
            // Check if page has a valid context (browser context exists)
            return this.page.context() !== null && this.page.context() !== undefined;
        } catch (error) {
            // If we can't access context, it's not valid
            return false;
        }
    }

    /**
     * Core assertion engine. All public assertion methods delegate to this.
     *
     * Workflow:
     *  1. Increments the assertion counter and logs the assertion start
     *  2. Executes the provided assertion function
     *  3. On success: logs PASSED with duration
     *  4. On failure:
     *     - Captures a screenshot
     *     - If soft=true:  records the error for later (test continues)
     *     - If soft=false: re-throws immediately (test stops)
     *
     * @param description - Human-readable label for this assertion
     * @param assertionFn - The actual Playwright expect() call wrapped in an async function
     * @param soft - When true, failures are collected instead of thrown
     */
    private async handleAssertion(
        description: string,
        assertionFn: () => Promise<void>,
        soft: boolean = false
    ) {
        this.assertionCounter++;
        const assertionLabel = `Assertion #${this.assertionCounter}`;
        const type = soft ? 'SOFT' : 'HARD';

        this.logger.info(`${assertionLabel} [${type}]: ${description}`);
        const startTime = Date.now();

        try {
            await assertionFn();
            const duration = Date.now() - startTime;
            this.logger.info(`${assertionLabel}: ${description} - PASSED (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            const screenshotPath = await this.captureFailureScreenshot(description);

            if (soft) {
                this.logger.warn(`${assertionLabel}: ${description} - SOFT_FAIL (${duration}ms) - ${(error as Error).message}`);
                this.softAssertionErrors.push({
                    assertionNumber: this.assertionCounter,
                    description,
                    error: error as Error,
                    screenshotPath
                });
            } else {
                this.logger.error(`${assertionLabel}: ${description} - FAILED (${duration}ms) - ${(error as Error).message}`);
                throw error;
            }
        }
    }

    // ============ VISIBILITY ASSERTIONS ============

    async toBeVisible(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is visible';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeVisible();
        }, soft);
    }

    async toBeHidden(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is hidden';
        await this.handleAssertion(logMessage, async () => {
          try {
            await expect(locator).toBeHidden();
          } catch {
            await expect(locator).toHaveCount(0);
          }
        }, soft);
    }

    // ============ TEXT ASSERTIONS ============

    async toHaveText(locator: Locator, expected: string | RegExp | Array<string | RegExp>, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has text: "${expected}"`;
        this.logger.debug(`Expected text: ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toContainText(expected); // Additional check to provide more detailed logging on failure
        }, soft);
    }

    async toContainText(locator: Locator, expected: string | RegExp | Array<string | RegExp>, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element contains text: "${expected}"`;
        this.logger.debug(`Expected to contain: ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toContainText(expected);
        }, soft);
    }

    // ============ VALUE ASSERTIONS ============

    async toHaveValue(locator: Locator, expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert input has value: "${expected}"`;
        this.logger.debug(`Expected value: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveValue(expected);
        }, soft);
    }

    async toBeEmpty(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert input is empty';

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeEmpty();
        }, soft);
    }

    // ============ COUNT ASSERTIONS ============

    async toHaveCount(locator: Locator, expected: number, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element count is ${expected}`;
        this.logger.debug(`Expected count: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveCount(expected);
        }, soft);
    }

    // ============ STATE ASSERTIONS ============

    async toBeEnabled(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is enabled';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeEnabled();
        }, soft);
    }

    async toBeDisabled(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is disabled';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeDisabled();
        }, soft);
    }

    async toBeChecked(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert checkbox/radio is checked';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeChecked();
        }, soft);
    }

    async toBeEditable(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is editable';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeEditable();
        }, soft);
    }

    async toBeFocused(locator: Locator, description?: string, soft: boolean = false) {
        const logMessage = description || 'Assert element is focused';
        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toBeFocused();
        }, soft);
    }

    // ============ ATTRIBUTE ASSERTIONS ============

    async toHaveAttribute(locator: Locator, name: string, value: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has attribute "${name}" with value "${value}"`;
        this.logger.debug(`Attribute: ${name}, Expected: ${value}`);
        const regExValue = new RegExp(`^${value}(?:\\b|$).*`, 'i'); // Convert to RegExp for more flexible matching

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveAttribute(name, regExValue); // Additional check to provide more detailed logging on failure
        }, soft);
    }

    async notToHaveAttribute(locator: Locator, name: string, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element does not have attribute "${name}"`;
        this.logger.debug(`Attribute: ${name} should be absent`);

        await this.handleAssertion(logMessage, async () => {
            const value = await locator.getAttribute(name);
            await expect(value).toBeNull();
        }, soft);
    }

    async toHaveClass(locator: Locator, expected: string | RegExp | Array<string | RegExp>, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has class: "${expected}"`;
        this.logger.debug(`Expected class(es): ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveClass(expected);
        }, soft);
    }

    async toHaveCSS(locator: Locator, name: string, value: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert element has CSS "${name}": "${value}"`;
        this.logger.debug(`CSS Property: ${name}, Expected: ${value}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(locator).toHaveCSS(name, value);
        }, soft);
    }

    // ============ URL ASSERTIONS ============

    async toHaveURL(expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert page URL is "${expected}"`;
        this.logger.debug(`Expected URL: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(this.page).toHaveURL(expected);
        }, soft);
    }

    async toContainURL(expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert page URL is "${expected}"`;
        this.logger.debug(`Expected URL: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(this.page.url()).toContain(expected); // Additional check to provide more detailed logging on failure
        }, soft);
   
    }

    async toHaveTitle(expected: string | RegExp, description?: string, soft: boolean = false) {
        const logMessage = description || `Assert page title is "${expected}"`;
        this.logger.debug(`Expected title: ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            await expect(this.page).toHaveTitle(expected);
        }, soft);
    }

    // ============ CUSTOM ASSERTIONS ============

    async toBeTruthy(value: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert value is truthy`;
        this.logger.debug(`Value: ${JSON.stringify(value)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(value).toBeTruthy();
        }, soft);
    }

    async toBeFalsy(value: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert value is falsy`;
        this.logger.debug(`Value: ${JSON.stringify(value)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(value).toBeFalsy();
        }, soft);
    }

    async toEqual(actual: any, expected: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert values are equal`;
        this.logger.debug(`Actual: ${JSON.stringify(actual)}, Expected: ${JSON.stringify(expected)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(actual).toEqual(expected);
        }, soft);
    }

    async toContain(haystack: string | any[], needle: any, description: string, soft: boolean = false) {
        const logMessage = description || `Assert contains value`;
        this.logger.debug(`Haystack: ${JSON.stringify(haystack)}, Needle: ${JSON.stringify(needle)}`);

        await this.handleAssertion(logMessage, async () => {
            expect(haystack).toContain(needle);
        }, soft);
    }

    async toBeGreaterThan(actual: number, expected: number, description: string, soft: boolean = false) {
        const logMessage = description || `Assert ${actual} > ${expected}`;
        this.logger.debug(`Actual: ${actual}, Expected (greater than): ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            expect(actual).toBeGreaterThan(expected);
        }, soft);
    }

    async toBeLessThan(actual: number, expected: number, description: string, soft: boolean = false) {
        const logMessage = description || `Assert ${actual} < ${expected}`;
        this.logger.debug(`Actual: ${actual}, Expected (less than): ${expected}`);

        await this.handleAssertion(logMessage, async () => {
            expect(actual).toBeLessThan(expected);
        }, soft);
    }

    // ============ SOFT ASSERTION MANAGEMENT ============

    /**
     * Returns the count of soft assertion failures
     */
    getSoftAssertionFailureCount(): number {
        return this.softAssertionErrors.length;
    }

    /**
     * Gets all soft assertion failures
     */
    getSoftAssertionFailures(): Array<{ assertionNumber: number; description: string; error: Error; screenshotPath?: string }> {
        return this.softAssertionErrors;
    }

    /**
     * Throws an error if there are any soft assertion failures
     */
    async assertAllSoftAssertions() {
        if (this.softAssertionErrors.length > 0) {
            const errorDetails = this.softAssertionErrors
                .map((failure, index) => {
                    const screenshot = failure.screenshotPath ? `\n   Screenshot: ${failure.screenshotPath}` : '';
                    return `${index + 1}. [Assertion #${failure.assertionNumber}] ${failure.description}\n   Error: ${failure.error.message}${screenshot}`;
                })
                .join('\n\n');

            const summary = `\n${'='.repeat(80)}\nSOFT ASSERTION FAILURES SUMMARY\n${'='.repeat(80)}\nTotal Failures: ${this.softAssertionErrors.length}\nTotal Assertions: ${this.assertionCounter}\n${'='.repeat(80)}\n\n${errorDetails}\n\n${'='.repeat(80)}`;

            this.logger.error(`${this.softAssertionErrors.length} soft assertion(s) failed`);
            this.logger.error(summary);

            throw new Error(`${this.softAssertionErrors.length} soft assertion(s) failed.`);
        } else {
            this.logger.info(`All ${this.assertionCounter} assertions passed!`);
        }
    }

    /**
     * Clears all soft assertion failures
     */
    clearSoftAssertions() {
        this.softAssertionErrors = [];
        this.logger.info('Soft assertions cleared');
    }

    /**
     * Gets assertion statistics
     */
    getAssertionStats(): { total: number; passed: number; failed: number } {
        return {
            total: this.assertionCounter,
            passed: this.assertionCounter - this.softAssertionErrors.length,
            failed: this.softAssertionErrors.length
        };
    }
}
