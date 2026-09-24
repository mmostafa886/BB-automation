import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-013
 * @title        Next stays disabled until an industry is selected on the Business Information step
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company.
 *   - No company is created — the flow stops on step 4.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name, then "Create New Company".
 *   3. Choose a describe card → Next, choose a company stage → Next.
 *   4. On step 3, assert no industry is selected and Next is disabled.
 *   5. Fill "What type of business is this"; assert Next is STILL disabled.
 *   6. Select an industry; assert it is selected and Next becomes enabled.
 *   7. Click Next; assert the wizard moves to step 4, "Company Details".
 *
 * Notes:
 *   - Step 5 proves the gate is the industry dropdown and not the text field: filling the type of
 *     business alone leaves Next disabled. (The reverse also holds on UAT — an industry with an empty
 *     type of business enables Next — but that is left to its own test case.)
 */
const input = createCompanyInputs.industryGatesNext;

test.describe('CreateCompany - Business Information step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Reach the Business Information step ──────────────────────────────
        await wizard.openCompaniesMenu();
        await wizard.clickCreateNewCompany();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);

        // ── No industry → Next disabled ──────────────────────────────────────
        await wizard.assertNoIndustrySelected();
        await wizard.assertNextDisabled();

        // ── Type of business alone does not enable Next ──────────────────────
        await wizard.fillTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertNoIndustrySelected();
        await wizard.assertNextDisabled();

        // ── Industry selected → Next enabled and usable ──────────────────────
        await wizard.selectIndustry(input.industry);
        await wizard.assertSelectedIndustry(input.industry);
        await wizard.assertNextEnabled();
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
