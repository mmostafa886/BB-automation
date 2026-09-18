import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-010
 * @title        Prev is not shown on the first step and appears from the second step
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company.
 *   - No company is created — the flow never goes past step 2.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name, then "Create New Company".
 *   3. Assert step 1 is shown and Prev is not shown.
 *   4. Choose a describe card; assert Prev is still not shown on step 1.
 *   5. Click Next; assert the wizard is on step 2 and Prev is shown and enabled.
 *   6. Click Prev; assert the wizard is back on step 1 and Prev is not shown again.
 */
const input = createCompanyInputs.prevHiddenOnFirstStep;

test.describe('CreateCompany - Prev button', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Step 1: no Prev ──────────────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.assertDescribeStepLoaded(input.describeOptions);
        await pomSelfHealing.createCompanyPage.assertPrevHidden();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.assertPrevHidden();

        // ── Step 2: Prev appears ─────────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertPrevVisible();

        // ── Back on step 1: Prev is gone again ───────────────────────────────
        await pomSelfHealing.createCompanyPage.clickPrev();
        await pomSelfHealing.createCompanyPage.assertStillOnDescribeStep();
        await pomSelfHealing.createCompanyPage.assertPrevHidden();
    });
});
