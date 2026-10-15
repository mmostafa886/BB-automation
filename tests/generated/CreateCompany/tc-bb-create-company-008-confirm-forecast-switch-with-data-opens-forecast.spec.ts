import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3828
 * @title  Automation-Company Creation: Verify that navigating to an existing forecast displays an unsaved changes confirmation dialog when data has been entered, and redirects directly to the selected Forecast page when no data has been entered
 *
 * @jira   BZNS-3783
 * @title  Automation-Company Creation: Verify that a confirmation dialog is displayed when navigating away from the page without saving the entered data
 */
const input = createCompanyInputs.confirmForecastSwitchWithData;

test.describe('CreateCompany - Leaving the wizard', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Select the company whose forecast will be opened ─────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.company);
        await pomSelfHealing.homePage.assertSelectedCompany(input.company);

        // ── Enter data in the wizard ─────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.selectCompanyStage(input.selectedStage);

        // ── Switch forecast, confirm, land on the Forecast page ──────────────
        await pomSelfHealing.homePage.openFoecastsMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.targetForecast);
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogShown(input.unsavedChangesTitle, input.unsavedChangesMessage);
        await pomSelfHealing.createCompanyPage.confirmUnsavedChangesDialog();
        await pomSelfHealing.financialDashboard.assertForecastPageLoaded();
        await pomSelfHealing.homePage.assertSelectedForecast(input.targetForecast);
    });
});
