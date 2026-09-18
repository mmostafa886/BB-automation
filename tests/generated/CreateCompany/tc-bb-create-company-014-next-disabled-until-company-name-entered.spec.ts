import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-014
 * @title        Next stays disabled until a company name is entered on the Company Details step
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company.
 *   - No company is created — the flow stops on step 4 and never subscribes.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name, then "Create New Company".
 *   3. Choose a describe card → Next, choose a company stage → Next, select an industry → Next.
 *   4. On step 4 with the company name empty, assert Next is disabled.
 *   5. Fill the tagline only; assert Next is STILL disabled.
 *   6. Type only spaces into the company name; assert Next is STILL disabled.
 *   7. Enter a real company name; assert Next becomes enabled.
 *   8. Clear the company name; assert Next is disabled again.
 *
 * Notes:
 *   - Steps 5 and 6 prove the gate is the company name itself, and that whitespace does not count.
 *   - Next is not clicked: step 5 (Financial) is not part of this test case.
 */
const input = createCompanyInputs.companyNameGatesNext;

test.describe('CreateCompany - Company Details step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Reach the Company Details step ───────────────────────────────────
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

        // ── Empty company name → Next disabled ───────────────────────────────
        await wizard.assertCompanyName('');
        await wizard.assertNextDisabled();

        // ── Another field filled → Next still disabled ───────────────────────
        await wizard.fillTagline(input.tagline);
        await wizard.assertTagline(input.tagline);
        await wizard.assertNextDisabled();

        // ── Whitespace only → Next still disabled ────────────────────────────
        await wizard.fillCompanyName(input.whitespaceName);
        await wizard.assertCompanyName(input.whitespaceName);
        await wizard.assertNextDisabled();

        // ── Company name entered → Next enabled ──────────────────────────────
        await wizard.fillCompanyName(input.companyName);
        await wizard.assertCompanyName(input.companyName);
        await wizard.assertNextEnabled();

        // ── Company name cleared → Next disabled again ───────────────────────
        await wizard.clearCompanyName();
        await wizard.assertCompanyName('');
        await wizard.assertNextDisabled();
    });
});
