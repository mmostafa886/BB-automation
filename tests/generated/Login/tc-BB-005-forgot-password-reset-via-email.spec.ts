/**
 * @testcase  TC-BB-005
 * @title     Reset a forgotten password via the emailed link and sign in with the new password
 * @module    Login
 * @area      Authentication
 * @priority  1
 * @tags      @login @P1
 *
 * @preconditions
 *   - A dedicated, activated account exists for this test: `passwordResetUser` in
 *     test-data/login.json (testautobb+reset@gmail.com — a `+` alias, so its mail lands in the
 *     shared test inbox). Its password is never stored: every run sets a new random one.
 *   - GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN are set (see
 *     `npm run auth:gmail`). The test is SKIPPED with instructions when they are missing.
 *
 * @steps
 *   1. Navigate to the auth page and open the sign-in modal.
 *   2. Click "Forgot password?".
 *   3. Enter the account email and click Password Reset.
 *   4. Assert the "you will receive an email" confirmation is shown.
 *   5. Wait for the "Reset your BznsBuilder password" email and open its reset link.
 *   6. Enter and confirm a new password, then submit.
 *   7. Assert "Password changed successfully" is shown.
 *   8. Sign out, then sign in again with the new password.
 *   9. Assert the user lands on the company-creation page — the new password works.
 */

import { test } from '../../fixtures/self-healing-fixture';
import loginData from '../../../test-data/login.json';
import { GmailClient } from '../../../src/utils/gmail-client';
import { generateStrongPassword } from '../../../src/utils/generate-password';

test.describe('Login - Forgot password', () => {

    test.beforeEach(() => {
        test.skip(
            !GmailClient.isConfigured(),
            'Gmail API credentials are not set — add GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET to .env ' +
            'and run "npm run auth:gmail".',
        );
    });

    test(
        'TC-BB-005: Reset a forgotten password via the emailed link and sign in with the new password @login @P1',
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            // Includes waiting for a real email to arrive.
            test.setTimeout(180_000);

            const { email } = loginData.passwordResetUser;
            const newPassword = generateStrongPassword();

            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.openForgotPasswordForm();

            const requestedAt = await pomSelfHealing.forgotPasswordPage.requestPasswordReset(email);
            await pomSelfHealing.forgotPasswordPage.assertResetEmailRequested();
            await pomSelfHealing.forgotPasswordPage.openResetLinkFromEmail(email, requestedAt);

            await pomSelfHealing.resetPasswordPage.setNewPassword(newPassword);
            await pomSelfHealing.resetPasswordPage.assertPasswordChanged();

            await pomSelfHealing.loginPage.signOutByClearingSession();
            await pomSelfHealing.loginPage.login(email, newPassword);
            await pomSelfHealing.homePage.assertPageLoaded();
        },
    );

});
