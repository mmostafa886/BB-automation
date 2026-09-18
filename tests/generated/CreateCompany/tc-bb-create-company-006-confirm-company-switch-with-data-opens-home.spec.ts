import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-006
 * @title        Confirming a switch to an existing company after entering data opens the Home page
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` has both `startCompany` and `targetCompany`.
 *   - No company is created — Confirm leaves the wizard without saving a company.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. From the home page, select `startCompany` so the company clicked later is a different one.
 *   3. Open "Create New Company", choose a describe card, click Next, and choose a company stage.
 *   4. Open the companies menu and click `targetCompany`.
 *   5. Assert the "Are You Sure ?" unsaved changes dialog is shown.
 *   6. Click Confirm.
 *   7. Assert the Home page is shown and `targetCompany` is the selected company.
 *
 * Notes:
 *   - `startCompany` is selected first because clicking the company that is ALREADY selected does not
 *     open the Home page: with no data entered it opens /financial/overview instead (seen on UAT).
 *     `targetCompany` must therefore differ from `startCompany`.
 */
const input = createCompanyInputs.confirmCompanySwitchWithData;

test.describe('CreateCompany - Leaving the wizard', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Start from a known company ───────────────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.startCompany);
        await pomSelfHealing.homePage.assertSelectedCompany(input.startCompany);

        // ── Enter data in the wizard ─────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.selectCompanyStage(input.selectedStage);

        // ── Switch company, confirm, land on Home ────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.targetCompany);
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogShown(input.unsavedChangesTitle, input.unsavedChangesMessage);
        await pomSelfHealing.createCompanyPage.confirmUnsavedChangesDialog();
        await pomSelfHealing.homePage.assertOnHomePage();
        await pomSelfHealing.homePage.assertSelectedCompany(input.targetCompany);
    });
});
