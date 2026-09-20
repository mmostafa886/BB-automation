import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { forgotPasswordLocators } from '../locators/forgot-password-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { GmailClient } from '../utils/gmail-client';

const RESET_EMAIL_SUBJECT = 'Reset your BznsBuilder password';

/**
 * ForgotPasswordPageSelfHealing — Page Object for the "Password Reset" form in the auth modal,
 * reached from the sign-in modal's "Forgot password?" link, plus the email step that follows it.
 */
export class ForgotPasswordPageSelfHealing extends SelfHealingPageBase {
    readonly emailInput:          SelfHealingLocator;
    readonly resetButton:         SelfHealingLocator;
    readonly confirmationMessage: SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`ForgotPasswordPageSelfHealing-${testName}`);

        this.emailInput          = SelfHealingLocator.from(page, forgotPasswordLocators.emailInput,          logger, aiProvider);
        this.resetButton         = SelfHealingLocator.from(page, forgotPasswordLocators.resetButton,         logger, aiProvider);
        this.confirmationMessage = SelfHealingLocator.from(page, forgotPasswordLocators.confirmationMessage, logger, aiProvider);
    }

    // ── Action Methods ───────────────────────────────────────────────────────

    /**
     * Requests a reset email for the given address. Returns the moment the request was made,
     * so the email lookup can ignore older reset emails still sitting in the inbox.
     *
     * The app allows one reset request per email address per minute and otherwise answers
     * "Too many reset requests… Please wait N seconds". That is expected whenever the test runs
     * again soon after itself — Playwright's automatic retry, or a quick local re-run — so it
     * waits the time the app asks for and submits once more instead of failing.
     */
    async requestPasswordReset(email: string): Promise<Date> {
        return test.step(`Request a password reset for ${email}`, async () => {
            await this.actions.fill(await this.emailInput.get(), email, 'Fill email');
            let requestedAt = new Date();
            await this.actions.click(await this.resetButton.get(), 'Click Password Reset');

            const message = await this.confirmationMessage.get();
            await message.waitFor({ state: 'visible' });
            const waitSeconds = Number((await message.textContent())?.match(/wait (\d+) seconds/i)?.[1]);

            if (waitSeconds) {
                await this.page.waitForTimeout((waitSeconds + 2) * 1000);
                requestedAt = new Date();
                await this.actions.click(await this.resetButton.get(), 'Click Password Reset again after the rate limit');
            }
            return requestedAt;
        });
    }

    /** Waits for the reset email in the test inbox and opens the link it contains. */
    async openResetLinkFromEmail(email: string, requestedAt: Date): Promise<void> {
        await test.step('Open the password-reset link from the email', async () => {
            const message = await GmailClient.fromEnv().waitForEmail({
                to: email,
                subject: RESET_EMAIL_SUBJECT,
                receivedAfter: requestedAt,
            });
            const resetLink = GmailClient.extractLink(message, /\/auth\/reset-password\?/);
            // The description, not the URL, is what gets logged: the link carries a live reset token.
            await this.actions.goto(resetLink, 'Open the reset link from the email');
        });
    }

    // ── Assertion Methods ────────────────────────────────────────────────────

    async assertResetEmailRequested(): Promise<void> {
        await test.step('Assert reset instructions were sent', async () => {
            await this.assert.toContainText(
                await this.confirmationMessage.get(),
                'You will receive an email with instructions to reset your password',
                'Reset-instructions confirmation is shown',
            );
        });
    }
}
