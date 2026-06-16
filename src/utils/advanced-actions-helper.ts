import { Locator, Page } from "@playwright/test";
import fs from "fs";
import path from "path";
import winston from "winston";
import { Logger } from "../utils/Logger";
import { StepRunner } from "../utils/step-runner";

/**
 * AdvancedActionsHelper — A wrapper around common Playwright page interactions
 * that adds comprehensive logging, step tracking, and failure diagnostics.
 *
 * Features:
 *   - Logging via Winston: every action is logged to console and file
 *   - Playwright test.step() integration: every action appears in the HTML report
 *   - Automatic step numbering (Step 1, Step 2, ...) in log files for traceability
 *   - Performance timing: each action records its duration in milliseconds
 *   - Screenshot on failure: when an action throws, a full-page screenshot is saved
 *   - Sensitive data masking: the fill() method can mask passwords in log output
 *
 * Ownership of step identity is split by concern:
 *   - StepRunner (Playwright report): uses the plain description as the step title
 *   - Winston (log files): prefixes with "Step N:" for sequential ordering in text
 *
 * Each Page Object (LoginPage, HomePage, etc.) creates its own instance of this class
 * so that logs are separated per test and per page.
 */
export class AdvancedActionsHelper {
    readonly page: Page;
    private readonly logger: winston.Logger;
    private stepCounter: number = 0;       // Auto-incrementing counter for sequential step labels in log files
    private screenshotDir: string;          // Directory where failure screenshots are stored

    /**
     * Creates a new AdvancedActionsHelper and initializes logging.
     * @param page - Playwright Page instance to perform actions on
     * @param testName - Used to label log output for this helper instance
     */
    constructor(page: Page, testName?: string) {
        this.page = page;
        this.logger = Logger.getLogger(`Actions-${testName || "default"}`);

        // Configure screenshot output directory
        this.screenshotDir = path.join(process.cwd(), 'test-logs', 'failure-screenshots');
        this.ensureDirectoryExists(this.screenshotDir);

        this.logger.info(`=== Actions Helper Started: ${testName || "default"} ===`);
    }

    /** Creates a directory (and parents) if it does not already exist */
    private ensureDirectoryExists(dir: string) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    /**
     * Captures a full-page screenshot when an action fails.
     * The screenshot file name includes the failed action and a timestamp to ensure uniqueness.
     * @returns The file path of the saved screenshot, or empty string if capture failed
     */
    private async captureFailureScreenshot(actionName: string): Promise<string> {
        const timestamp = Date.now();
        const screenshotName = `failure-${actionName.replace(/\s+/g, '-')}-${timestamp}.png`;
        const screenshotPath = path.join(this.screenshotDir, screenshotName);

        try {
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true
            });
            this.logger.error(`Screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            this.logger.error(`Could not capture screenshot: ${error}`);
            return '';
        }
    }

    /**
     * Navigates to the given URL with logging and performance measurement.
     * Waits for "domcontentloaded" event before resolving.
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param url - The URL to navigate to
     * @param description - Optional human-readable description for log output
     */
    async goto(url: string, description?: string) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || `Navigate to ${url}`;

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                await this.page.goto(url, { waitUntil: 'domcontentloaded' });
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Waits for any in-progress Radix close animation to drain from the DOM.
     *
     * Radix keeps portal content alive (with `data-state="closed"`) while its CSS
     * exit animation plays, then unmounts it. Clicking a Radix trigger during this
     * window silently misfires — the popover opens but is immediately forced closed
     * by the still-running exit animation. This guard blocks until the DOM is clean.
     *
     * Returns immediately when no Radix popper is animating — near-zero overhead for
     * non-Radix clicks. A 3 s safety cap prevents test hangs when animations are
     * disabled or Radix behaves unexpectedly.
     */
    private async waitForRadixSettled(): Promise<void> {
        await this.page.waitForFunction(
            () => document.querySelectorAll(
                '[data-radix-popper-content-wrapper] [data-state="closed"]'
            ).length === 0,
            { timeout: 3000 }
        ).catch(() => {
            this.logger.warn('waitForRadixSettled: Radix close animation did not drain within 3 s — proceeding anyway');
        });
    }

    /**
     * Waits for the Radix open animation to finish after a dropdown/select was just opened.
     *
     * When a Radix Select or Popover opens, its content animates in. The options are visible
     * in the DOM immediately but their positions are changing (CSS transition/animation).
     * Playwright's stability check rejects clicks on moving elements, causing "element is not
     * stable" → retries → element detaches (dropdown closes) → infinite wait → timeout.
     *
     * This guard polls `getAnimations({ subtree: true })` on the open popper content until
     * all running animations/transitions have finished, then returns — so the caller's next
     * click on an option starts from a geometrically stable DOM.
     *
     * A 3 s safety cap prevents test hangs when animations are disabled or already complete.
     */
    private async waitForRadixOpenSettled(): Promise<void> {
        await this.page.waitForFunction(
            () => {
                const el = document.querySelector('[data-radix-popper-content-wrapper] [data-state="open"]');
                if (!el) return true; // no open popper — nothing to wait for
                // getAnimations({ subtree: true }) covers CSS animations AND transitions on
                // the content element and all its descendants (Chrome 101+, used by Playwright).
                const anims = (el as Element).getAnimations({ subtree: true });
                return anims.length === 0 || anims.every((a: Animation) => a.playState !== 'running');
            },
            { timeout: 3000 }
        ).catch(() => {
            this.logger.warn('waitForRadixOpenSettled: Radix open animation did not settle within 3 s — proceeding anyway');
        });
    }

    /**
     * Waits for any running CSS animations or transitions on a specific element to finish.
     *
     * `waitFor({ state: 'visible' })` resolves the moment an element appears in the viewport,
     * but the element (or its containing panel) may still be mid-animation (fade-in, slide-in,
     * scale-in). Playwright's own actionability check polls bounding-box stability and will
     * eventually unblock — but this explicit guard makes the wait visible in logs and caps it
     * at 3 s to prevent silent budget exhaustion.
     *
     * Uses `locator.evaluate()` + `Animation.finished` Promises — zero polling overhead when
     * no animations are running (resolves on the first microtask tick).
     *
     * A 3 s safety cap via `Promise.race` prevents hangs when animations are disabled (e.g.
     * `prefers-reduced-motion`) or already complete before the call arrives.
     */
    private async waitForElementStable(locator: Locator, timeout = 3000): Promise<void> {
        await Promise.race([
            locator.evaluate((el) =>
                new Promise<void>((resolve) => {
                    const anims = el.getAnimations({ subtree: false });
                    if (anims.length === 0 || anims.every(a => a.playState !== 'running')) {
                        resolve();
                        return;
                    }
                    // Wait for all running animations/transitions to reach their finished state.
                    Promise.all(anims.map(a => a.finished))
                        .then(() => resolve())
                        .catch(() => resolve()); // treat animation cancel/abort as settled
                })
            ).catch(() => {
                this.logger.warn('waitForElementStable: evaluate failed — proceeding anyway');
            }),
            new Promise<void>(resolve => setTimeout(resolve, timeout)),
        ]);
    }

    /**
     * Clicks an element with logging. Before clicking, logs the element's visibility and enabled state
     * so failures can be diagnosed from the log file alone.
     *
     * Radix-aware: drains any in-progress Radix close animation before clicking (prevents
     * silent misfire when a Radix dropdown is still animating closed). When the clicked
     * element is itself a Radix trigger (detected via `data-state` attribute), also waits
     * after the click for the resulting open/close animation to fully settle.
     *
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param locator - Playwright Locator pointing to the target element
     * @param description - Optional human-readable description for log output
     * @param skipRadixGuards - When true, skips all Radix animation guards (for non-Radix buttons)
     */
    async click(locator: Locator, description?: string, skipRadixGuards = false) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Click element';

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                const isVisible = await locator.isVisible();
                const isEnabled = await locator.isEnabled();
                this.logger.debug(`Element state - Visible: ${isVisible}, Enabled: ${isEnabled}`);

                // Read pre-click attributes for reliable tab-trigger detection.
                // Both are read BEFORE click because reading them after races with React's
                // async DOM update and can return stale values.
                const preClickDataState    = await locator.getAttribute('data-state').catch(() => null);
                const preClickAriaSelected = await locator.getAttribute('aria-selected').catch(() => null);

                // Drain any in-progress Radix close animations before clicking.
                // Prevents a click on a Radix trigger from silently misfiring while
                // a prior dropdown's exit animation is still running.
                await this.waitForRadixSettled();
                await locator.waitFor({ state: 'visible' });

                await locator.click();

                // Skip all post-click Radix guards if requested (for non-Radix buttons)
                if (skipRadixGuards) {
                    const duration = Date.now() - startTime;
                    this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
                    return;
                }

                // ── ARIA Tab trigger guard (aria-selected pattern) ────────────────────
                // Some tab components use the standard ARIA pattern: aria-selected="false"
                // on inactive triggers, aria-selected="true" once activated. React mounts
                // the panel asynchronously after the click, re-rendering the parent tree.
                // Any Playwright action during this window can misfire onto the nav sidebar
                // → TOCTOU redirect. Polling for aria-selected="true" retries until React
                // confirms the state change, regardless of reconciliation duration.
                if (preClickAriaSelected === 'false') {
                    await locator.and(this.page.locator('[aria-selected="true"]'))
                        .waitFor({ state: 'visible', timeout: 10000 });
                    this.logger.debug('ARIA Tab trigger settled (aria-selected="false" → "true")');
                }
                // ── Radix Tab trigger guard (data-state pattern) ──────────────────────
                // Radix Tabs uses data-state="inactive" → "active" instead of aria-selected.
                else if (preClickDataState === 'inactive') {
                    await locator.and(this.page.locator('[data-state="active"]'))
                        .waitFor({ state: 'visible', timeout: 10000 });
                    this.logger.debug('Radix Tab trigger settled (data-state="inactive" → "active")');
                }
                // ── Radix Dropdown / Popover guard ────────────────────────────────────
                // Dropdown triggers use data-state="closed" → "open". The transition is fast
                // enough that reading post-click is reliable (unlike the tab cases above).
                else {
                    const postClickDataState = await locator.getAttribute('data-state').catch(() => null);
                    if (postClickDataState !== null) {
                        await this.waitForRadixSettled();
                        if (postClickDataState === 'open') {
                            // Dropdown just opened: wait for the open animation to complete so
                            // that child options are geometrically stable before the caller clicks them.
                            await this.waitForRadixOpenSettled();
                        }
                        this.logger.debug(`Radix trigger detected — settled after click (was data-state="${postClickDataState}")`);
                    }
                }

                // ── Radix Select / Combobox guard ─────────────────────────────────────
                // Radix Select triggers use role="combobox" + aria-expanded instead of data-state.
                // If the click expanded such a trigger, wait for the open animation to settle
                // so that the caller's next clickOption() starts from a geometrically stable DOM.
                const postClickAriaExpanded = await locator.getAttribute('aria-expanded').catch(() => null);
                if (postClickAriaExpanded === 'true') {
                    await this.waitForRadixOpenSettled();
                    this.logger.debug(`Radix combobox trigger detected (aria-expanded="true") — open animation settled`);
                }

                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Clicks an option inside an already-open Radix Select, DropdownMenu, or Combobox.
     *
     * Raw `locator.click()` on a Radix option bypasses all animation guards, causing two
     * failure modes:
     *   1. "element not stable" — the option animates in after the dropdown opens; clicking
     *      during the animation causes Playwright to retry → the retry closes the dropdown →
     *      infinite wait → timeout.
     *   2. Next trigger misfire — after selection the dropdown plays a close animation;
     *      clicking the next trigger before it drains silently misfires.
     *
     * This method eliminates both failure modes:
     *   1. `waitForRadixOpenSettled()` — blocks until all open animations finish (geometry stable)
     *   2. `locator.waitFor({ state: 'visible' })` — ensures the option is scrolled into view
     *   3. `locator.click()` — performs the actual click
     *   4. `waitForRadixSettled()` — blocks until the close animation drains
     *
     * Use this method for every option click inside a Radix-managed floating panel.
     * @param locator - Playwright Locator pointing to the option element
     * @param description - Optional human-readable description for log output
     */
    async clickOption(locator: Locator, description?: string) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Click Radix option';

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                // Wait for open animation to settle — options must be geometrically stable
                // before Playwright attempts a click, otherwise "element not stable" retries
                // cause the dropdown to close before the selection lands.
                await this.waitForRadixOpenSettled();

                // Ensure the option is visible (may require scrolling within the list).
                // Explicit timeout prevents budget exhaustion when a Radix Select (non-popper)
                // closes due to a race condition — fail fast so retries can start sooner.
                await locator.waitFor({ state: 'visible', timeout: 15000 });

                await locator.click();

                // Wait for the dropdown close animation triggered by the selection.
                // Without this, the caller's next trigger click fires while the close is
                // still running and is silently dropped by Radix.
                await this.waitForRadixSettled();

                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Fills an input field with text. Sensitive values (e.g., passwords) are masked
     * as "***MASKED***" in the log output when isSensitive is true.
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param locator - Playwright Locator pointing to the input element
     * @param value - The text to type into the field
     * @param description - Optional human-readable description for log output
     * @param isSensitive - When true, the actual value is replaced with "***MASKED***" in logs
     */
    async fill(locator: Locator, value: string, description?: string, isSensitive: boolean = false) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Fill input field';

        await StepRunner.run(logMessage, async () => {
            const displayValue = isSensitive ? '***MASKED***' : `"${value}"`;
            this.logger.debug(`Input value: ${displayValue}`);
            const startTime = Date.now();

            try {
                // 1. Drain any in-progress Radix close animations (parity with click()).
                //    A closing dropdown can briefly re-layout the form, detaching inner inputs.
                await this.waitForRadixSettled();
                // 2. Wait for the element to be visible — stricter than 'attached' and aligned
                //    with Playwright's own actionability requirement for fill() / clear().
                await locator.waitFor({ state: 'visible' });
                // 3. Wait for any CSS animations/transitions on the element itself to finish.
                //    Covers inputs inside panels that animate in (fade, slide) after a tab switch
                //    or dialog open — visible too early but bounding box still changing.
                await this.waitForElementStable(locator);
                await locator.clear();
                await locator.fill(value);
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    async clear(locator: Locator, description?: string) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Clear input field';

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                await this.waitForRadixSettled();
                await locator.waitFor({ state: 'visible' });
                await this.waitForElementStable(locator);
                await locator.clear();
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Waits for an element to become visible within the specified timeout.
     * Useful before interacting with elements that load asynchronously.
     * @param locator - Playwright Locator for the target element
     * @param description - Optional human-readable description for log output
     * @param timeout - Maximum wait time in ms (default 30s)
     */
    async waitForVisible(locator: Locator, description?: string, timeout: number = 30000) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Wait for element to be visible';

        await StepRunner.run(logMessage, async () => {
            this.logger.debug(`Timeout: ${timeout}ms`);
            const startTime = Date.now();

            try {
                await locator.waitFor({ state: 'visible', timeout });
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Timeout or Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Extracts the text content of an element and logs it.
     * Returns empty string if the element has no text.
     * @param locator - Playwright Locator for the target element
     * @param description - Optional human-readable description for log output
     * @returns The text content of the element
     */
    async getText(locator: Locator, description?: string): Promise<string> {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || 'Get text content';

        return await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                // Wait for the element to be attached before reading.
                // Radix state transitions (e.g., Select option change) briefly re-render
                // surrounding content; without this guard textContent() can throw
                // "element is not attached" on the first call.
                await locator.waitFor({ state: 'attached' });
                const text = await locator.textContent() || '';
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
                this.logger.debug(`Retrieved text: "${text}"`);
                return text;
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Selects an option in a <select> element by value, label, or index.
     * On failure: logs the error, captures a screenshot, and re-throws.
     * @param locator - Playwright Locator pointing to the <select> element
     * @param value - The option value, label text, or {index: N} to select
     * @param description - Optional human-readable description for log output
     */
    async selectOption(locator: Locator, value: string | { index: number } | { value: string } | { label: string }, description?: string) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;
        const logMessage = description || `Select option: ${JSON.stringify(value)}`;

        await StepRunner.run(logMessage, async () => {
            const startTime = Date.now();

            try {
                await locator.selectOption(value as any);
                const duration = Date.now() - startTime;
                this.logger.info(`${step}: ${logMessage} - SUCCESS (${duration}ms)`);
            } catch (error) {
                const duration = Date.now() - startTime;
                this.logger.error(`${step}: ${logMessage} - FAILED (${duration}ms) - Error: ${error}`);
                await this.captureFailureScreenshot(logMessage);
                throw error;
            }
        });
    }

    /**
     * Logs a custom assertion result (pass/fail) without running Playwright's expect().
     * Captures a screenshot if the assertion failed.
     * @param description - What was being asserted
     * @param expected - The expected value
     * @param actual - The actual value observed
     * @param passed - Whether the assertion passed
     */
    async logAssertion(description: string, expected: any, actual: any, passed: boolean) {
        this.stepCounter++;
        const step = `Step ${this.stepCounter}`;

        await StepRunner.run(`ASSERTION - ${description}`, async () => {
            this.logger.debug(`Expected: ${JSON.stringify(expected)}, Actual: ${JSON.stringify(actual)}, Passed: ${passed}`);

            if (!passed) {
                this.logger.error(`${step}: ASSERTION FAILED - ${description}`);
                await this.captureFailureScreenshot(description);
            } else {
                this.logger.info(`${step}: ASSERTION PASSED - ${description}`);
            }
        });
    }

    /**
     * Generates and returns a summary of all steps executed in this helper.
     * @returns A multi-line string with step count
     */
    getSummary(): string {
        const summary = `\n=== Test Summary ===\nTotal Steps: ${this.stepCounter}\n`;
        this.logger.info(summary);
        return summary;
    }
}
