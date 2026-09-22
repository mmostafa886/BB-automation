/**
 * @testcase  
 * @title     Sign in with a valid email in different letter casing
 * @module    Login
 * @area      Authentication
 * @priority  2
 * @tags      @login @P2 @regression
 *
 * @preconditions
 *   - A registered BznsBuilder account exists for the address in loginData.caseSensitiveUser
 *   - That address is entered here in a DIFFERENT letter casing than it was registered with
 *   - Credentials are sourced from test-data/login.json (never hardcoded)
 *
 * @steps
 *   1. Navigate to the BznsBuilder staging app (auto-redirects to /auth)
 *   2. Assert the auth page is loaded with the Sign in trigger visible
 *   3. Click "Sign in" to open the sign-in modal
 *   4. Assert the modal is fully rendered with email/password fields
 *   5. Fill in the case-variant email together with the account's correct password
 *   6. Click the "Sign in" submit button
 *   7. Assert the home dashboard is loaded — sign-in succeeded despite the casing difference
 *
 * @expectedResult
 *   Email addresses are case-insensitive, so the account is matched and the user is signed
 *   in exactly as if the original casing had been typed.
 *
 * NOTE: a failure here means the login lookup is case-SENSITIVE — the account exists but the
 * user is locked out by their own capitalisation. That is a defect to report, not a test to
 * "fix" by relaxing the assertion.
 */

import { test } from '../../fixtures/self-healing-fixture';
import loginData from '../../../test-data/login.json';

test.describe('Login - Email case insensitivity', () => {

    test(
        'TC-BB-002: Sign in with a valid email in different letter casing @login @P2 @regression',
        async ({ selfHealingFixture: { pomSelfHealing } }) => {

            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.assertAuthPageVisible();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.assertSignInModalVisible();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                loginData.caseSensitiveUser.email,
                loginData.caseSensitiveUser.password,
            );
            await pomSelfHealing.homePage.assertPageLoaded();
        },
    );

});
