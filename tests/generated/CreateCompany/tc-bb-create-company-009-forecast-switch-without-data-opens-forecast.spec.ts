import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3828
 * @title  Automation-Company Creation: Verify that navigating to an existing forecast displays an unsaved changes confirmation dialog when data has been entered, and redirects directly to the selected Forecast page when no data has been entered
 */
const input = createCompanyInputs.forecastSwitchWithoutData;

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

        // ── Open the wizard without entering data ────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.assertDescribeStepLoaded(input.describeOptions);
        await pomSelfHealing.createCompanyPage.assertNoDescribeOptionSelected();

        // ── Switch forecast, land on the Forecast page with no dialog ────────
        await pomSelfHealing.homePage.openFoecastsMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.targetForecast);
        await pomSelfHealing.financialDashboard.assertForecastPageLoaded();
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogNotShown();
        await pomSelfHealing.homePage.assertSelectedForecast(input.targetForecast);
    });
});
