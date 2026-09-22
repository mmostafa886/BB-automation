import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-018
 * @title        The Subscription Details step lists the plans with monthly and annual pricing and features
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` already has a company, so its wizard has the
 *     8-step shape that includes Subscription Details. A first-company account skips that step entirely
 *     (see TC-BB-Create-Company-017).
 *   - The prices in the test data are the EGP prices this account is shown; another currency or a
 *     price change means updating `monthlyPlans` / `annualPlans`.
 *   - No company is created and nothing is subscribed — Subscribe is only checked for presence.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Open "Create New Company" and pass steps 1–6 (describe card, stage, industry, company name,
 *      the four Financial fields, then Funding with its defaults).
 *   3. Assert the wizard is on step 7, "Subscription Details".
 *   4. Assert the billing period tabs read Monthly / Annually / Offers, with Monthly selected.
 *   5. Assert 3 plans are shown, each with its monthly price, "paid monthly", its feature count,
 *      a known feature and a Subscribe button.
 *   6. Switch to the Annually tab.
 *   7. Assert the same 3 plans now show their discounted annual price and "paid annually", still with
 *      their features and Subscribe buttons.
 *
 * Notes:
 *   - Every plan card of every billing period sits in the DOM at once, so the page object only ever
 *     looks at the visible ones.
 *   - On the annual tab the price block holds the original price struck through next to the discounted
 *     one; the test asserts the discounted price, which is what the plan actually costs there.
 *   - The Offers tab (a single "All-Access Relaunch" card) is out of scope for this case; only its tab
 *     is asserted.
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
            await wizard.assertPlanDetails(plan.name, plan.price, plan.periodText, plan.featureCount, plan.feature);
        }

        // ── The same plans with annual pricing ───────────────────────────────
        await wizard.selectBillingPeriod(input.annualBillingPeriod);
        await wizard.assertVisiblePlanCount(input.planCount);

        for (const plan of input.annualPlans) {
            await wizard.assertPlanDetails(plan.name, plan.price, plan.periodText, plan.featureCount, plan.feature);
        }
    });
});
