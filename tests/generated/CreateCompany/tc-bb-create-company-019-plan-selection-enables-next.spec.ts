import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3844
 * @title  Automation-Company Creation: Verify that selecting a plan enables Next and allows the company creation flow to proceed
 */
const input = createCompanyInputs.planSelectionEnablesNext;

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

        // ── Step 7 on arrival: nothing selected, Next disabled ───────────────
        await wizard.assertCurrentStep(input.subscriptionStepNumber, input.subscriptionStepTitle);
        await wizard.assertVisiblePlanCount(input.planCount);
        await wizard.assertNoPlanSelected();
        await wizard.assertNextDisabled();

        // ── The card body is not the control that selects a plan ─────────────
        await wizard.clickPlanCardBody(input.planToSelect);
        await wizard.assertNoPlanSelected();
        await wizard.assertNextDisabled();

        // ── Subscribe selects the plan and enables Next ──────────────────────
        await wizard.selectPlan(input.planToSelect);
        await wizard.assertPlanSelected(input.planToSelect, input.selectedPlanLabel);
        await wizard.assertNextEnabled();

        // ── Next opens the Payment Method step ───────────────────────────────
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.paymentStepNumber, input.paymentStepTitle);
        await wizard.assertPrimaryCtaLabel(input.checkoutCtaLabel);
    });
});
