import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-003
 * @title        Choose a company stage and move to the Business Information step
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company,
 *     so the companies menu is shown in the side bar.
 *   - No company is created — the flow stops on step 3 of the wizard.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name in the side bar, then "Create New Company".
 *   3. Choose a describe card and click Next.
 *   4. Assert the wizard is on step 2, "Company Stage", showing Idea / Startup / Growth, none selected.
 *   5. Click one of the stage cards.
 *   6. Assert that card is selected and Next is enabled.
 *   7. Click Next.
 *   8. Assert the wizard is on step 3, "Business Information".
 */
const input = createCompanyInputs.chooseStageAndGoNext;

test.describe('CreateCompany - Company Stage step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Open the Create New Company wizard and pass the describe step ────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.clickNext();

        // ── Company Stage step ───────────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.assertCompanyStageStepLoaded(input.stageStepNumber, input.stageStepTitle, input.stages);
        await pomSelfHealing.createCompanyPage.assertNoCompanyStageSelected();
        await pomSelfHealing.createCompanyPage.assertNextDisabled();

        await pomSelfHealing.createCompanyPage.selectCompanyStage(input.selectedStage);
        await pomSelfHealing.createCompanyPage.assertCompanyStageSelected(input.selectedStage);
        await pomSelfHealing.createCompanyPage.assertNextEnabled();
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
