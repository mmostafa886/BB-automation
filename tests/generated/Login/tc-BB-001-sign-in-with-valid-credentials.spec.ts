/**
 * @testcase  TC-BB-001
 * @title     Sign in with valid credentials
 * @module    Login
 * @area      Authentication
 * @priority  1
 * @tags      @login @P1 @smoke
 *
 * @preconditions
 *   - The user has a registered BznsBuilder account
 *   - Credentials are sourced from test-data/login.json (never hardcoded)
 *
 * @steps
 *   1. Navigate to the BznsBuilder staging app (auto-redirects to /auth)
 *   2. Assert the auth page is loaded with the Sign in trigger visible
 *   3. Click "Sign in" to open the sign-in modal
 *   4. Assert the modal is fully rendered with email/password fields
 *   5. Fill in valid email and password from test data
 *   6. Click the "Sign in" submit button
 *   7. Assert the user is redirected away from /auth (successful login)
 *   8. Assert the home dashboard is loaded — "Welcome!" heading and user avatar icon visible
 */

import { test, expect } from '../../fixtures/self-healing-fixture';
import loginData from '../../../test-data/login.json';

test.describe('Login - Sign in with valid credentials', () => {

    test(
        'TC-BB-001: Sign in with valid credentials @login @P1 @smoke',
        async ({ selfHealingFixture: { pomSelfHealing } }) => {

            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.assertAuthPageVisible();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.assertSignInModalVisible();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                loginData.validUser.email,
                loginData.validUser.password,
            );
            await pomSelfHealing.homePage.assertPageLoaded();
        },
    );

});
