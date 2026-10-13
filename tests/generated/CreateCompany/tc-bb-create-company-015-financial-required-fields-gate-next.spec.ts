import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3832
 * @title  Automation-Company Creation: Verify that all required fields in Step 5 must be completed before proceeding to Step 6.
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
