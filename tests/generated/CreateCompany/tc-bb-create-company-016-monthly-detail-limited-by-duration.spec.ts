import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3833
 * @title  Automation-Company Creation: Verify that the selected financial plan duration is greater than or equal to the selected Monthly Detail period, allowing equal values.
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
