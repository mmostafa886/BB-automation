import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-008
 * @title        Confirming a switch to an existing forecast after entering data opens the Forecast page
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` has `company`, and that company has `targetForecast`.
 *     It is deliberately NOT "Start Up", whose forecasts the Dividends specs rely on.
 *   - No company is created — Confirm leaves the wizard without saving a company.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. From the home page, select `company` so its forecasts are listed in the forecasts menu.
 *   3. Open "Create New Company", choose a describe card, click Next, and choose a company stage.
 *   4. Open the forecasts menu and click `targetForecast`.
 *   5. Assert the "Are You Sure ?" unsaved changes dialog is shown.
 *   6. Click Confirm.
 *   7. Assert the Forecast page (/financial/overview) is shown and `targetForecast` is the selected forecast.
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
