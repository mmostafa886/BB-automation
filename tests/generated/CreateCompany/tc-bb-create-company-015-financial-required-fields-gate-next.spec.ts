import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-015
 * @title        Every required field on the Financial step must be filled before reaching Funding
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company.
 *   - No company is created — the flow stops on step 6 and never subscribes.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name, then "Create New Company".
 *   3. Pass steps 1–4: describe card → Next, company stage → Next, industry → Next, company name → Next.
 *   4. On step 5 assert the 1st year of forecast is empty, currency and intent are pre-filled,
 *      and Next is disabled.
 *   5. Pick the 1st year of forecast; assert Next is STILL disabled.
 *   6. Pick the duration; assert Next is STILL disabled.
 *   7. Pick the monthly detail; assert Next is STILL disabled.
 *   8. Pick the number format — the last required field; assert Next becomes enabled.
 *   9. Click Next; assert the wizard moves to step 6, "Funding".
 *
 * Notes:
 *   - Four fields gate Next: 1st year of forecast, duration, monthly detail and number format.
 *     Filling them one at a time shows each is needed — Next only enables on the last one.
 *   - Currency ("Dollar($)") and intent ("before") arrive pre-filled, so they do not block the step;
 *     the test asserts their defaults instead of setting them.
 *   - The date is picked in the month the picker opens on, so the test does not depend on the day it runs.
 *   - Prev is not used: going back to this step re-renders the date as a raw JS date and opens the
 *     picker on "Invalid date" (seen on UAT).
 */
const input = createCompanyInputs.financialRequiredFieldsGateNext;

test.describe('CreateCompany - Financial step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Pass steps 1–4 ───────────────────────────────────────────────────
        await wizard.openCompaniesMenu();
        await wizard.clickCreateNewCompany();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.selectIndustry(input.industry);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);
        await wizard.fillCompanyName(input.companyName);
        await wizard.clickNext();

        // ── Step 5 with nothing filled → Next disabled ───────────────────────
        await wizard.assertCurrentStep(input.financialStepNumber, input.financialStepTitle);
        await wizard.assertFirstYearOfForecastEmpty();
        await wizard.assertFinancialDefaults(input.defaultCurrency, input.defaultIntent);
        await wizard.assertNextDisabled();

        // ── 1 of 4: 1st year of forecast ─────────────────────────────────────
        await wizard.pickFirstYearOfForecast(input.forecastStartDay);
        await wizard.assertFirstYearOfForecastSet();
        await wizard.assertNextDisabled();

        // ── 2 of 4: duration ─────────────────────────────────────────────────
        await wizard.selectDuration(input.durationYears);
        await wizard.assertSelectedDuration(input.durationYears);
        await wizard.assertNextDisabled();

        // ── 3 of 4: monthly detail ───────────────────────────────────────────
        await wizard.selectMonthlyDetail(input.monthlyDetail);
        await wizard.assertSelectedMonthlyDetail(input.monthlyDetail);
        await wizard.assertNextDisabled();

        // ── 4 of 4: number format → Next enabled ─────────────────────────────
        await wizard.selectNumberFormat(input.numberFormat);
        await wizard.assertSelectedNumberFormat(input.numberFormat);
        await wizard.assertNextEnabled();

        // ── Step 6 ───────────────────────────────────────────────────────────
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
