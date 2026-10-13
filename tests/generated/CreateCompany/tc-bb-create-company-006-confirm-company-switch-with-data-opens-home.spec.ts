import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3827
 * @title  Automation-Company Creation: Verify that navigating to an existing company displays an unsaved changes confirmation dialog when data has been entered, and redirects directly to the Home page when no data has been entered
 *
 * @jira   BZNS-3783
 * @title  Automation-Company Creation: Verify that a confirmation dialog is displayed when navigating away from the page without saving the entered data
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
