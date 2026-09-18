import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-016
 * @title        Monthly detail can equal the financial plan duration but never exceed it
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
 *   2. Pass steps 1–4 and pick the 1st year of forecast on step 5.
 *   3. For each duration in the test data (1, 3, 5, 7):
 *        a. Select the duration.
 *        b. Assert the monthly detail dropdown offers exactly the expected options — never a period
 *           longer than the duration.
 *        c. Select the highest offered option and assert it is selected (equal to the duration is allowed).
 *   4. Set duration 5 with "5 years of monthly detail", then lower the duration to 2; assert the
 *      monthly detail is re-clamped to "2 years of monthly detail" so it never exceeds the duration.
 *   5. Set the final duration with an equal monthly detail, select a number format, and click Next;
 *      assert the wizard reaches step 6, "Funding" — equal values are accepted.
 *
 * Notes:
 *   - The offered options are 1 .. min(duration, 5): 5 years is the highest the app offers, so a 7 or
 *     10 year plan tops out at 5 years of monthly detail rather than matching the duration.
 *   - Durations 1, 3 and 5 cover the "equal is allowed" case; 7 covers the 5-year cap.
 *   - Prev is not used: going back to this step re-renders the date as a raw JS date (seen on UAT).
 */
const input = createCompanyInputs.monthlyDetailLimitedByDuration;

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
        await wizard.assertCurrentStep(input.financialStepNumber, input.financialStepTitle);
        await wizard.pickFirstYearOfForecast(input.forecastStartDay);

        // ── Each duration offers only periods up to itself ───────────────────
        for (const durationCase of input.durationCases) {
            await wizard.selectDuration(durationCase.duration);
            await wizard.assertSelectedDuration(durationCase.duration);
            await wizard.assertMonthlyDetailOptions(durationCase.options);
            await wizard.selectMonthlyDetail(durationCase.highestAllowed);
            await wizard.assertSelectedMonthlyDetail(durationCase.highestAllowed);
        }

        // ── Lowering the duration re-clamps the monthly detail ───────────────
        await wizard.selectDuration(input.clampDurationFrom);
        await wizard.selectMonthlyDetail(input.clampMonthlyDetailBefore);
        await wizard.assertSelectedMonthlyDetail(input.clampMonthlyDetailBefore);
        await wizard.selectDuration(input.clampDurationTo);
        await wizard.assertSelectedDuration(input.clampDurationTo);
        await wizard.assertSelectedMonthlyDetail(input.clampMonthlyDetailAfter);

        // ── Equal duration and monthly detail is accepted ────────────────────
        await wizard.selectDuration(input.finalDuration);
        await wizard.selectMonthlyDetail(input.finalMonthlyDetail);
        await wizard.assertSelectedMonthlyDetail(input.finalMonthlyDetail);
        await wizard.selectNumberFormat(input.numberFormat);
        await wizard.assertNextEnabled();
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
