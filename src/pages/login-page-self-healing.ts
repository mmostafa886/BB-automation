import { test, expect, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { loginLocators } from '../locators/login-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * LoginPageSelfHealing — Page Object for the BznsBuilder auth page.
 *
 * The sign-in flow is two-step:
 *   1. Click the trigger button on /auth to open the sign-in modal
 *   2. Fill email + password inside the modal and submit
 *
 * All locators support three-phase self-healing:
 *   Phase 1 → primary CSS/XPath selector
 *   Phase 2 → semantic Playwright strategies (role, label, placeholder …)
 *   Phase 3 → AI healing via Playwright MCP (opt-in, requires aiProvider)
 */
export class LoginPageSelfHealing extends SelfHealingPageBase {
    readonly signInTriggerButton: SelfHealingLocator;
    readonly emailInput:          SelfHealingLocator;
    readonly passwordInput:       SelfHealingLocator;
    readonly signInSubmitButton:  SelfHealingLocator;
    readonly signInModal:         SelfHealingLocator;
    readonly errorToast:          SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`LoginPageSelfHealing-${testName}`);

        this.signInTriggerButton = SelfHealingLocator.from(page, loginLocators.signInTriggerButton, logger, aiProvider);
        this.emailInput          = SelfHealingLocator.from(page, loginLocators.emailInput,          logger, aiProvider);
        this.passwordInput       = SelfHealingLocator.from(page, loginLocators.passwordInput,       logger, aiProvider);
        this.signInSubmitButton  = SelfHealingLocator.from(page, loginLocators.signInSubmitButton,  logger, aiProvider);
        this.signInModal         = SelfHealingLocator.from(page, loginLocators.signInModal,         logger, aiProvider);
        this.errorToast          = SelfHealingLocator.from(page, loginLocators.errorToast,          logger, aiProvider);
    }

    // ── Navigation ──────────────────────────────────────────────────────────

    /** Navigate to the BznsBuilder root — the app auto-redirects to /auth */
    async navigateToLogin(): Promise<void> {
        await test.step('Navigate to BznsBuilder auth page', async () => {
            await this.actions.goto('/', 'Navigate to BznsBuilder — auto-redirects to /auth');
        });
    }

    // ── Action Methods ───────────────────────────────────────────────────────

    /** Click the main-page trigger to open the sign-in modal */
    async openSignInModal(): Promise<void> {
        await test.step('Open sign-in modal', async () => {
            await this.actions.click(await this.signInTriggerButton.get(), 'Click Sign in trigger to open modal');
        });
    }

    /**
     * Fill email + password inside an already-open modal and click submit.
     * Call openSignInModal() first if the modal is not yet open.
     */
    async fillAndSubmitSignInForm(email: string, password: string): Promise<void> {
        await test.step(`Fill and submit sign-in form: ${email}`, async () => {
            await this.actions.fill(await this.emailInput.get(), email, 'Fill email field');
            await this.actions.fill(await this.passwordInput.get(), password, 'Fill password field', true);
            await this.actions.click(await this.signInSubmitButton.get(), 'Click Sign in submit button');
        });
    }

    /**
     * Convenience method: open modal + fill + submit in one call.
     * Use fillAndSubmitSignInForm() instead when asserting the modal state mid-flow.
     */
    async login(email = '', password = ''): Promise<void> {
        await test.step(`Login: ${email}`, async () => {
            await this.openSignInModal();
            await this.fillAndSubmitSignInForm(email, password);
        });
    }

    // ── Assertion Methods ────────────────────────────────────────────────────

    /** Assert the main auth page is loaded with the Sign in trigger visible */
    async assertAuthPageVisible(): Promise<void> {
        await test.step('Assert auth page is visible', async () => {
            await this.assert.toHaveURL(/\/auth/, 'Auth page URL contains /auth');
            await this.assert.toBeVisible(await this.signInTriggerButton.get(), 'Sign in trigger button is visible');
        });
    }

    /** Assert the sign-in modal is open with all form elements present */
    async assertSignInModalVisible(): Promise<void> {
        await test.step('Assert sign-in modal is visible', async () => {
            await this.assert.toBeVisible(await this.signInModal.get(),         'Sign-in modal is visible');
            await this.assert.toBeVisible(await this.emailInput.get(),          'Email input is visible');
            await this.assert.toBeVisible(await this.passwordInput.get(),       'Password input is visible');
            await this.assert.toBeVisible(await this.signInSubmitButton.get(),  'Sign in submit button is visible');
            await this.assertAuthPageVisible();
        });
    }

    /** Assert the error snackbar is displayed after a failed sign-in attempt */
    async assertErrorToastVisible(): Promise<void> {
        await test.step('Assert error toast is visible', async () => {
            await this.assert.toBeVisible(await this.errorToast.get(), 'Error toast notification is visible');
        });
    }

    
}
