import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { resetPasswordLocators } from '../locators/reset-password-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * ResetPasswordPageSelfHealing — Page Object for the page opened by the link in the password
 * reset email (/auth/reset-password?token=…). Submitting it changes the password and signs the
 * user straight in.
 */
export class ResetPasswordPageSelfHealing extends SelfHealingPageBase {
    readonly newPasswordInput:        SelfHealingLocator;
    readonly confirmNewPasswordInput: SelfHealingLocator;
    readonly submitButton:            SelfHealingLocator;
    readonly successMessage:          SelfHealingLocator;

    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`ResetPasswordPageSelfHealing-${testName}`);

        this.newPasswordInput        = SelfHealingLocator.from(page, resetPasswordLocators.newPasswordInput,        logger, aiProvider);
        this.confirmNewPasswordInput = SelfHealingLocator.from(page, resetPasswordLocators.confirmNewPasswordInput, logger, aiProvider);
        this.submitButton            = SelfHealingLocator.from(page, resetPasswordLocators.submitButton,            logger, aiProvider);
        this.successMessage          = SelfHealingLocator.from(page, resetPasswordLocators.successMessage,          logger, aiProvider);
    }

    // ── Action Methods ───────────────────────────────────────────────────────

    async setNewPassword(password: string): Promise<void> {
        await test.step('Set a new password', async () => {
            await this.actions.fill(await this.newPasswordInput.get(), password, 'Fill new password', true);
            await this.actions.fill(await this.confirmNewPasswordInput.get(), password, 'Fill confirm new password', true);
            await this.actions.click(await this.submitButton.get(), 'Click Submit');
        });
    }

    // ── Assertion Methods ────────────────────────────────────────────────────

    async assertPasswordChanged(): Promise<void> {
        await test.step('Assert password was changed', async () => {
            await this.assert.toContainText(
                await this.successMessage.get(),
                'Password changed successfully',
                'Password-changed confirmation is shown',
            );
        });
    }
}
