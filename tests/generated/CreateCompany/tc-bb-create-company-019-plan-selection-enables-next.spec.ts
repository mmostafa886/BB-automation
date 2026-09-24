import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-019
 * @title        Selecting a plan enables Next and opens the Payment Method step
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` already has a company, so its wizard has the
 *     8-step shape that includes Subscription Details and Payment Method.
 *   - Nothing is paid for and no company is created: the test stops on the Payment Method step and
 *     never clicks "Proceed to checkout" (TC-BB-Create-Company-020 covers the paid flow).
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Open "Create New Company" and pass steps 1–6.
 *   3. Assert step 7 shows 3 plans with none selected and Next disabled.
 *   4. Click a plan card's body (its name, not Subscribe); assert nothing is selected and Next is
 *      still disabled — the card body is not the control that selects a plan.
 *   5. Click Subscribe on that plan; assert its card becomes the selected one, its button now reads
 *      "Selected", and Next becomes enabled.
 *   6. Click Next; assert the wizard moves to step 8, "Payment Method", whose primary button reads
 *      "Proceed to checkout".
 *
 * Notes:
 *   - "Subscribe" is the control that SELECTS a package; it does not charge anything. The card on file
 *     is charged on step 8 by "Proceed to checkout", which this test deliberately does not click.
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
