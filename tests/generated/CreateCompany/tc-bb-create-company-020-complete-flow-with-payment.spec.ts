import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3845
 * @title  Automation-Company Creation: Verify that completing the company creation flow with valid data and selecting a plan makes a successful payment and creates the company with the selected package activated
 *
 * @jira   BZNS-3782
 * @title  Automation-Company Creation: Verify that only 8 steps are displayed when the company is not the first company
 *
 * ⚠ Spends money: every run charges the account's saved card and leaves one real company behind.
 *   Run it only against an account whose saved payment method is a Stripe test card.
 */
const input = createCompanyInputs.completeFlowWithPayment;

test.describe('CreateCompany - Paid flow', () => {
    test(`${input.test} @createcompany @automation @payment`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;
        // Unique per run: the account keeps every company this test creates.
        const companyName = `${input.companyNamePrefix} ${Date.now()}`;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Steps 1–4: valid data ────────────────────────────────────────────
        await wizard.openCompaniesMenu();
        await wizard.clickCreateNewCompany();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.fillTypeOfBusiness(input.typeOfBusiness);
        await wizard.selectIndustry(input.industry);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);
        await wizard.fillCompanyName(companyName);
        await wizard.fillTagline(input.tagline);
        await wizard.clickNext();

        // ── Step 5: the four required Financial fields ───────────────────────
        await wizard.assertCurrentStep(input.financialStepNumber, input.financialStepTitle);
        await wizard.pickFirstYearOfForecast(input.forecastStartDay);
        await wizard.selectDuration(input.durationYears);
        await wizard.selectMonthlyDetail(input.monthlyDetail);
        await wizard.selectNumberFormat(input.numberFormat);
        await wizard.clickNext();

        // ── Step 6: Funding keeps its defaults ───────────────────────────────
        await wizard.assertCurrentStep(input.fundingStepNumber, input.fundingStepTitle);
        await wizard.clickNext();

        // ── Step 7: choose the package ───────────────────────────────────────
        await wizard.assertCurrentStep(input.subscriptionStepNumber, input.subscriptionStepTitle);
        await wizard.assertNextDisabled();
        await wizard.selectPlan(input.planToBuy);
        await wizard.assertPlanSelected(input.planToBuy, input.selectedPlanLabel);
        await wizard.assertNextEnabled();
        await wizard.clickNext();

        // ── Step 8: pay with the saved card ──────────────────────────────────
        await wizard.assertCurrentStep(input.paymentStepNumber, input.paymentStepTitle);
        await wizard.assertPaymentStepReady(input.planToBuy, input.checkoutCtaLabel);
        await wizard.proceedToCheckout();

        // ── The company is created and opened ────────────────────────────────
        await pomSelfHealing.homePage.assertOnHomePage();
        await pomSelfHealing.homePage.assertSelectedCompany(companyName);
        await pomSelfHealing.homePage.assertSelectedForecast(input.defaultForecastName);

        // ── It carries the package that was paid for ─────────────────────────
        await pomSelfHealing.subscriptionsPage.navigateToSubscriptions();
        await pomSelfHealing.subscriptionsPage.assertCompanySubscribedTo(companyName, input.planToBuy);
    });
});
