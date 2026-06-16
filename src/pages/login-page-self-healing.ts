import { type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { loginLocators } from '../locators/login-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * LoginPageSelfHealing — Page Object for the OrangeHRM login page.
 *
 * Extends `SelfHealingPageBase` and wires every locator from the
 * `loginLocators` repository through `SelfHealingLocator.from()`.
 *
 * All locators support three-phase self-healing:
 *   Phase 1 → primary CSS/XPath selector
 *   Phase 2 → semantic Playwright strategies (role, label, placeholder …)
 *   Phase 3 → AI healing via Playwright MCP (opt-in, requires aiProvider)
 */
export class LoginPageSelfHealing extends SelfHealingPageBase {
    readonly usernameInput:       SelfHealingLocator;
    readonly passwordInput:       SelfHealingLocator;
    readonly loginButton:         SelfHealingLocator;
    readonly errorMessage:        SelfHealingLocator;
    readonly dashboardHeader:     SelfHealingLocator;
    readonly invalidLoginMessage: SelfHealingLocator;

    private readonly page: Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`LoginPageSelfHealing-${testName}`);

        this.usernameInput       = SelfHealingLocator.from(page, loginLocators.usernameInput,       logger, aiProvider);
        this.passwordInput       = SelfHealingLocator.from(page, loginLocators.passwordInput,       logger, aiProvider);
        this.loginButton         = SelfHealingLocator.from(page, loginLocators.loginButton,         logger, aiProvider);
        this.errorMessage        = SelfHealingLocator.from(page, loginLocators.errorMessage,        logger, aiProvider);
        this.dashboardHeader     = SelfHealingLocator.from(page, loginLocators.dashboardHeader,     logger, aiProvider);
        this.invalidLoginMessage = SelfHealingLocator.from(page, loginLocators.invalidLoginMessage, logger, aiProvider);
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    /** Navigate to the OrangeHRM login page */
    async navigateToLogin(baseURL = '/'): Promise<void> {
        await this.actions.goto(baseURL, 'Navigate to login page');
    }

    // ── Action Methods (NO assertions, NO test.step calls) ──────────────────

    /**
     * Perform a login with the given credentials.
     * Resolves each locator through self-healing before interacting.
     */
    async login(username: string, password: string): Promise<void> {
        await this.actions.fill(await this.usernameInput.get(), username, 'Fill username field');
        await this.actions.fill(await this.passwordInput.get(), password, 'Fill password field', true);
        await this.actions.click(await this.loginButton.get(), 'Click login button');
    }

    // ── Assertion Methods (NO test.step calls — StepRunner handles wrapping) ─

    /**
     * Assert that the Dashboard header is visible (i.e. login succeeded).
     */
    async assertDashboardVisible(): Promise<void> {
        await this.assert.toBeVisible(await this.dashboardHeader.get(), 'Dashboard header is visible');
    }

    /**
     * Assert that the invalid-credentials error is visible.
     */
    async assertInvalidCredentialsError(): Promise<void> {
        await this.assert.toBeVisible(await this.invalidLoginMessage.get(), 'Invalid credentials error message is visible');
    }

    /** Asserts that the login page is displayed correctly with all expected elements visible */
    async assertLoginPageVisible(): Promise<void> {
        await this.assert.toBeVisible(await this.usernameInput.get(), 'Verify username input is visible');
        await this.assert.toBeVisible(await this.passwordInput.get(), 'Verify password input is visible');
        await this.assert.toBeVisible(await this.loginButton.get(), 'Verify login button is visible');
    }

    /**
     * Verifies the login page is displayed with all expected elements visible.
     * @generated-impl Polish_Generated_Code Task 4
     */
    async verifyLoginPageIsDisplayed(): Promise<void> {
        await this.assert.toBeVisible(await this.usernameInput.get(), 'Username input is visible on login page');
        await this.assert.toBeVisible(await this.passwordInput.get(), 'Password input is visible on login page');
        await this.assert.toBeVisible(await this.loginButton.get(), 'Login button is visible on login page');
    }

    /**
     * Verifies the login page content (title, inputs, button) — used after a logout redirect.
     * @generated-impl Polish_Generated_Code Task 4
     */
    async verifyPageContent(): Promise<void> {
        await this.assert.toBeVisible(await this.loginButton.get(), 'Login button is visible — login page is displayed');
        await this.assert.toBeVisible(await this.usernameInput.get(), 'Username input is visible');
        await this.assert.toBeVisible(await this.passwordInput.get(), 'Password input is visible');
    }

    /**
     * Logs in as a Medicinal Chemist using the credentials from the environment.
     * Falls back to a default test Medicinal Chemist account when env vars are absent.
     * @generated-impl Polish_Generated_Code Task 4
     */
    async loginAsMedicinalChemist(): Promise<void> {
        const username = process.env.MEDICINAL_CHEMIST_USERNAME ?? process.env.MC_USERNAME ?? 'medicinal_chemist';
        const password = process.env.MEDICINAL_CHEMIST_PASSWORD ?? process.env.MC_PASSWORD ?? 'password';
        await this.actions.fill(await this.usernameInput.get(), username, 'Fill Medicinal Chemist username');
        await this.actions.fill(await this.passwordInput.get(), password, 'Fill Medicinal Chemist password', true);
        await this.actions.click(await this.loginButton.get(), 'Click login button as Medicinal Chemist');
    }

    // ── Combined Methods (navigation + assertion) ────────────────────────────

    /** Navigate directly to a protected URL and assert redirection to the login page */
    async navigateToProtectedRoute(protectedUrl: string): Promise<void> {
        await this.actions.goto(protectedUrl, 'Navigate directly to protected route');
        await this.assert.toHaveURL(/login/, 'Assert redirected to login page URL');
        await this.assert.toBeVisible(await this.loginButton.get(), 'Assert login button is visible on redirected login page');
    }

}
