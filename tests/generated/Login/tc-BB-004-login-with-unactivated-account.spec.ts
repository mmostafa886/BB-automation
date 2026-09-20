/**
 * @testcase  TC-BB-005
 * @title     Sign in with an unactivated (unverified) account
 * @module    Login
 * @area      Authentication
 * @priority  2
 * @tags      @login @P2 @regression
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - Base credentials are sourced from test-data/login.json (never hardcoded); a unique email
 *     is derived at runtime so the sign-up step never collides with a prior run's account.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page.
 *   2. Open the sign-up modal and register a brand-new account.
 *   3. Assert the sign-up success message is shown, then close the sign-up modal.
 *   4. Open the sign-in modal and sign in with that same, still-unverified account.
 *   5. Assert the "Please, verify your email!" toast is shown instead of a successful login.
 *
 * @expectedResult
 *   The unverified-email toast is displayed and the user is not signed in.
 */

import { test } from '../../fixtures/self-healing-fixture';
import loginData from '../../../test-data/login.json';
import { RandomNumberGenerator } from '../../../src/utils/generate-random-number';

test.describe('Login - Unactivated account', () => {

    test('TC-BB-004: Sign in with an unactivated account @login @P2 @regression',
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            const { email, password, firstName, lastName } = loginData.unactivatedUser;
            // Prefix with a unique number so the sign-up step never collides with a prior run's
            // account — mirrors the prefixing fillEmail() itself applies for flag === 'valid'.
            const uniqueEmail = `${RandomNumberGenerator.unique()}${email}`;

            await pomSelfHealing.loginPage.navigateToLogin();

            await pomSelfHealing.signUpPage.openSignupPopUp();
            await pomSelfHealing.signUpPage.fillEmail('unactivated', uniqueEmail);
            await pomSelfHealing.signUpPage.fillPassword(password);
            await pomSelfHealing.signUpPage.fillFirstName(firstName);
            await pomSelfHealing.signUpPage.fillLastName(lastName);
            await pomSelfHealing.signUpPage.validSighupAssertion();
            await pomSelfHealing.signUpPage.closeSignupPopUp();

            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.assertSignInModalVisible();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(uniqueEmail, password);
            await pomSelfHealing.loginPage.assertUnverifiedEmailToastVisible();
        },
    );

});
