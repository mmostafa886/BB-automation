import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-005
 * @title        Switching company or forecast during the wizard keeps its 8 steps
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` already has more than one company, so the
 *     new company is not its first one.
 *   - The company in the test data exists on that account and has the forecast in the test data.
 *     It is deliberately NOT "Start Up": the Dividends specs select a forecast on "Start Up", and
 *     switching that company's forecast here could interfere with them when run together.
 *   - No company is created — the wizard is only taken to step 3.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name; assert the menu lists more than one company.
 *   3. Click "Create New Company", choose a describe card, and click Next.
 *   4. Assert the wizard is on step 2 and the stepper has 8 steps.
 *   5. While on step 2, open the companies menu and click the company name from the test data.
 *   6. Assert the "Are You Sure ?" unsaved changes dialog is shown, then click Close.
 *   7. Assert the company is selected, the wizard is still on step 2, and the stepper still has 8 steps.
 *   8. While on step 2, open the forecasts menu and click the forecast name from the test data.
 *   9. Assert the unsaved changes dialog is shown, then click Close.
 *  10. Assert the forecast is selected, the wizard is still on step 2, and the stepper still has 8 steps.
 *  11. Choose a company stage and click Next.
 *  12. Assert the wizard is on step 3 and the stepper still has 8 steps.
 *
 * Notes:
 *   - The stepper is not rendered on step 1, so the switching is done on step 2.
 *   - The dialog opens on every company/forecast click inside the wizard, even for the one that is
 *     already selected, so the test does not depend on what an earlier run left selected.
 *   - The dialog's Confirm button is not exercised here.
 */
const input = createCompanyInputs.stepCountNotAffectedByCompanyAndForecast;

test.describe('CreateCompany - Wizard steps', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Open the wizard on a step that shows the stepper (step 2) ────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.assertAccountHasMultipleCompanies();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);

        // ── Click a company name from the companies menu ─────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.company);
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogShown(input.unsavedChangesTitle, input.unsavedChangesMessage);
        await pomSelfHealing.createCompanyPage.closeUnsavedChangesDialog();
        await pomSelfHealing.homePage.assertSelectedCompany(input.company);
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);

        // ── Click a forecast name from the forecasts menu ────────────────────
        await pomSelfHealing.homePage.openFoecastsMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.forecast);
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogShown(input.unsavedChangesTitle, input.unsavedChangesMessage);
        await pomSelfHealing.createCompanyPage.closeUnsavedChangesDialog();
        await pomSelfHealing.homePage.assertSelectedForecast(input.forecast);
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);

        // ── The wizard carries on with the same 8 steps ──────────────────────
        await pomSelfHealing.createCompanyPage.selectCompanyStage(input.selectedStage);
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);
    });
});
