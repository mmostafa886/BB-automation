import { test } from '../../fixtures/self-healing-fixture';
import signUpInputs from '../../../test-data/SignUpInputs.json';

/**
 * @testcase     TC-BB-SignUp
 * @title        Sign-up form — social buttons, field entry, and per-flag validation
 * @module       SignUp
 * @priority     P1
 * @tags         @signup @automation
 * @preconditions  App reachable at BASE_URL; the auth landing page is shown.
 * @steps
 *   1. Assert the social-media login buttons exist on the auth modal.
 *   2. Open the sign-up modal.
 *   3. Fill email (unique when flag = "valid"), password, first name, last name.
 *   4. Branch on the row's `flag` to run the matching assertion:
 *        valid           → success message shown
 *        cancel          → close modal, success gone, trigger still present
 *        empty           → required-field validation shown
 *        invalidmail     → invalid-email-format validation shown
 *        oldmail         → duplicate-email validation shown, no success
 *        invalidpassword → minimum-length validation shown
 *        placeholders    → email/password placeholders contain expected text
 *
 * Migrated from the legacy TestCafe spec `signupTestCase.js`.
 * Data-driven over `test-data/SignUpInputs.json` (one Playwright test per row, mirroring the
 * legacy `data.forEach`). The legacy fixture targeted `https://stgapp.bznsbuilder.com/auth`;
 * that URL is dropped — navigation comes from `playwright.config.ts` (`BASE_URL`).
 *
 * Notes:
 *   - `maximizeWindow()` is dropped — viewport is controlled by `playwright.config.ts`.
 *   - The legacy spec did not navigate explicitly (the TestCafe fixture's `.page()` did);
 *     `navigateToLogin()` performs that navigation here.
 *   - The legacy `checkPlaceHolder()` was called with no arguments (a bug — it asserted against
 *     `undefined`). Here it is driven from the row's `emailPlaceholder` / `passwordPlaceholder`
 *     keys so the assertion is meaningful. ⚠ verify the expected placeholder text on the live app.
 *   - ⚠ `SignUpInputs.json` is a TEMPLATE — populate it with real emails/passwords (a genuinely
 *     existing account for the `oldmail` row, the real placeholder copy for `placeholders`).
 */

// Loosely typed: the inputs JSON is data, not a contract.
const inputs = signUpInputs as any[];

for (const d of inputs) {
    test(`${d.test} @signup @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();

        await pomSelfHealing.signUpPage.checkExistanceOfSocialMediaButtons();
        await pomSelfHealing.signUpPage.openSignupPopUp();
        await pomSelfHealing.signUpPage.fillEmail(d.flag, d.email);
        await pomSelfHealing.signUpPage.fillPassword(d.password);
        await pomSelfHealing.signUpPage.fillFirstName(d.firstName);
        await pomSelfHealing.signUpPage.fillLastName(d.lastName);


        switch (d.flag) {
            case 'valid':
                await pomSelfHealing.signUpPage.validSighupAssertion();
                break;
            case 'cancel':
                await pomSelfHealing.signUpPage.closeSignupPopUp();
                break;
            case 'empty':
                await pomSelfHealing.signUpPage.emptyFieldAssertion();
                break;
            case 'invalidmail':
                await pomSelfHealing.signUpPage.invalidEmailAssertion();
                break;
            case 'oldmail':
                await pomSelfHealing.signUpPage.oldEmailAssertion();
                break;
            case 'invalidpassword':
                await pomSelfHealing.signUpPage.invalidPassword();
                break;
            case 'placeholders':
                await pomSelfHealing.signUpPage.checkPlaceHolder(d.emailPlaceholder, d.passwordPlaceholder);
                break;
        }
    });

}
