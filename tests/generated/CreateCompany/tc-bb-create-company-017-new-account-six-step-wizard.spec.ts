import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-017
 * @title        A new account gets a 6-step wizard ending on Funding with a Start Free Trial button
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` (`newAccountSixStepWizard`) has NO company
 *     yet, so it is creating its first one. That is what makes the wizard 6 steps instead of 8 —
 *     an account that already has a company gets the 8-step version (see TC-BB-Create-Company-005).
 *   - The account keeps that state only while nobody finishes the flow: the test stops on the last
 *     step and never clicks "Start Free Trial", so no company and no trial are created.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page and sign in with the new account.
 *   2. Assert the app lands on the create company wizard by itself — no side-bar companies menu is used.
 *   3. Assert step 1 shows the 9 describe cards; choose one and click Next.
 *   4. Assert the stepper has exactly 6 steps, numbered 1 to 6, on step 2 and on every step after it.
 *   5. Pass steps 2–5: company stage → Next, industry → Next, company name → Next, then the four
 *      required Financial fields → Next.
 *   6. Assert the wizard is on step 6, "Funding" — the last step.
 *   7. Assert the primary button reads "Start Free Trial" and is enabled. It is NOT clicked.
 *
 * Notes:
 *   - A new account signs in straight into /create-company, so there is no dashboard to wait for and
 *     no "+" icon to click; `waitForWizardLoaded()` covers the slow post-login redirect.
 *   - The stepper is not rendered on step 1, so the 6-step count is first checked on step 2.
 *   - "Start Free Trial" is the same element as Next on earlier steps, relabelled on the last step.
 */
const input = createCompanyInputs.newAccountSixStepWizard;

test.describe('CreateCompany - New account wizard', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in — a new account lands on the wizard by itself ────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await wizard.waitForWizardLoaded();

        // ── Step 1 ───────────────────────────────────────────────────────────
        await wizard.assertDescribeStepLoaded(input.describeOptions);
        await wizard.assertPrevHidden();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();

        // ── Step 2: the stepper shows 6 steps, not 8 ─────────────────────────
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();

        // ── Step 3 ───────────────────────────────────────────────────────────
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.selectIndustry(input.industry);
        await wizard.clickNext();

        // ── Step 4 ───────────────────────────────────────────────────────────
        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.fillCompanyName(input.companyName);
        await wizard.clickNext();

        // ── Step 5 ───────────────────────────────────────────────────────────
        await wizard.assertCurrentStep(input.financialStepNumber, input.financialStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.pickFirstYearOfForecast(input.forecastStartDay);
        await wizard.selectDuration(input.durationYears);
        await wizard.selectMonthlyDetail(input.monthlyDetail);
        await wizard.selectNumberFormat(input.numberFormat);
        await wizard.clickNext();

        // ── Step 6: the last step, with the Start Free Trial call to action ──
        await wizard.assertCurrentStep(input.lastStepNumber, input.lastStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.assertPrimaryCtaLabel(input.primaryCtaLabel);
        await wizard.assertNextEnabled();
    });
});
