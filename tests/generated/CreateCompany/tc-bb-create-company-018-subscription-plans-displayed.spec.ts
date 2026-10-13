import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3843
 * @title  Automation-Company Creation: Verify that available plans are displayed with monthly/annual pricing and features
 */
const input = createCompanyInputs.subscriptionPlansDisplayed;

test.describe('CreateCompany - Subscription Details step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Pass steps 1–6 ───────────────────────────────────────────────────
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
        await wizard.selectDuration(input.durationYears);
        await wizard.selectMonthlyDetail(input.monthlyDetail);
        await wizard.selectNumberFormat(input.numberFormat);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.fundingStepNumber, input.fundingStepTitle);
        await wizard.clickNext();

        // ── Step 7: the plans, on the default Monthly tab ────────────────────
        await wizard.assertCurrentStep(input.subscriptionStepNumber, input.subscriptionStepTitle);
        await wizard.assertBillingPeriodTabs(input.billingTabs, input.defaultBillingPeriod);
        await wizard.assertVisiblePlanCount(input.planCount);

        for (const plan of input.monthlyPlans) {
            await wizard.assertPlanDetails(plan.name, plan.periodText, plan.featureCount, plan.feature);
        }

        // ── The same plans with annual pricing ───────────────────────────────
        await wizard.selectBillingPeriod(input.annualBillingPeriod);
        await wizard.assertVisiblePlanCount(input.planCount);

        for (const plan of input.annualPlans) {
            await wizard.assertPlanDetails(plan.name, plan.periodText, plan.featureCount, plan.feature);
        }
    });
});
