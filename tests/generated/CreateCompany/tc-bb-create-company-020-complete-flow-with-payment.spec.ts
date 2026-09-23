import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-020
 * @title        Completing the wizard and paying creates the company with the chosen package active
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation @payment
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` already has a company, so its wizard has the
 *     8-step shape ending in Subscription Details + Payment Method.
 *   - The account has a saved payment method (a Stripe test card, e.g. 4242 4242 4242 4242). The test
 *     pays with the card that is pre-selected on step 8; it never fills a card form. If the account
 *     has no saved card, add one first through Billing & Subscriptions → Payment Methods.
 *
 * ⚠ THIS TEST SPENDS MONEY AND LEAVES DATA BEHIND. Every run charges the saved card for the chosen
 *   package and creates one real company on the account, which cannot be removed from the test. Run
 *   it only against an account whose card is a test card. Each run uses a unique company name
 *   (`companyNamePrefix` + a timestamp) so repeated runs stay distinguishable.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Open "Create New Company" and fill steps 1–5 with valid data, then pass Funding on its defaults.
 *   3. On step 7 click Subscribe on the chosen package; assert it becomes the selected one and Next enables.
 *   4. Click Next; assert step 8, "Payment Method", shows a selected saved card, an order summary naming
 *      the package and its price, and a "Proceed to checkout" button.
 *   5. Click "Proceed to checkout" — this charges the card.
 *   6. Assert the app lands on the home dashboard with the new company selected and its default forecast.
 *   7. Open Billing & Subscriptions and assert the new company is listed carrying the chosen package.
 *
 * Notes:
 *   - Prices are not asserted anywhere: they are regional ("EGP 449" from Egypt, "$ 19" on the CI
 *     runner), and the order summary's VAT row only appears in some regions.
 *   - The subscription's expiry date and "Expired" badge are not asserted either — the check is that
 *     the company was created with the package, not how long that package runs for.
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
