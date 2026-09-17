/**
 * @testcase  TC-BB-003
 * @title     Sign in with a leading or trailing space email
 * @module    Login
 * @area      Authentication
 * @priority  2
 * @tags      @login @P2 @regression
 *
 * @preconditions
 *   - A registered BznsBuilder account exists for the address in loginData.trailingSpaceUser
 *   - Credentials are sourced from test-data/login.json (never hardcoded)
 *
 * @steps
 *   1. Navigate to the BznsBuilder staging app (auto-redirects to /auth)
 *   2. Assert the auth page is loaded with the Sign in trigger visible
 *   3. Click "Sign in" to open the sign-in modal
 *   4. Assert the modal is fully rendered with email/password fields
 *   5. Fill in the trailing or leading space email together with the account's correct password
 *   6. Click the "Sign in" submit button
 *   7. Assert 'invalid format' message is displayed
 *
 * @expectedResult
 *   'Invalid format' message is displayed and user can't login
 *
 
 */

import { test } from '../../fixtures/self-healing-fixture';
import loginData from '../../../test-data/login.json';

test.describe('Login - Email with trailing or leading space', () => {

    const testData = [
        { label: 'leading space', data: loginData.leadingSpaceUser },
        { label: 'trailing space', data: loginData.trailingSpaceUser },
    ];

    for (const { label, data } of testData) {
        test(`TC-BB-003: Sign in with a ${label} email @login @P2 @regression`,
            async ({ selfHealingFixture: { pomSelfHealing } }) => {

                await pomSelfHealing.loginPage.navigateToLogin();
                await pomSelfHealing.loginPage.assertAuthPageVisible();
                await pomSelfHealing.loginPage.openSignInModal();
                await pomSelfHealing.loginPage.assertSignInModalVisible();
                await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                    data.email,
                    data.password,
                );
                await pomSelfHealing.loginPage.assertInvalidFormatMsgVisible();
            },
        );
    }
});
