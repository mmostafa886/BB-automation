import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-012
 * @title        Generate Suggestions is disabled while the type of business is empty and enabled once it is filled
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company.
 *   - No company is created — the flow stops on step 3.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name, then "Create New Company".
 *   3. Choose a describe card → Next, choose a company stage → Next.
 *   4. On step 3 with "What type of business is this" empty, assert "Generate Suggestions" is disabled.
 *   5. Fill the type of business; assert "Generate Suggestions" becomes enabled.
 *   6. Clear the field again; assert "Generate Suggestions" is disabled again.
 *
 * Notes:
 *   - The button sits in the industry column of the step, but its state is driven by the
 *     "What type of business is this" field, not by the industry dropdown.
 *   - The button is never clicked: it calls the AI suggestion service.
 *   - Whitespace is NOT trimmed by the app — typing only spaces enables the button (seen on UAT).
 *     That is left out of the assertions here; it is worth its own test case if it is a real bug.
 */
const input = createCompanyInputs.generateSuggestionsGatedByTypeOfBusiness;

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

        // ── Empty field → button disabled ────────────────────────────────────
        await wizard.assertTypeOfBusiness('');
        await wizard.assertGenerateSuggestionsDisabled();

        // ── Data entered → button enabled ────────────────────────────────────
        await wizard.fillTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertGenerateSuggestionsEnabled();

        // ── Cleared again → button disabled again ────────────────────────────
        await wizard.clearTypeOfBusiness();
        await wizard.assertTypeOfBusiness('');
        await wizard.assertGenerateSuggestionsDisabled();
    });
});
