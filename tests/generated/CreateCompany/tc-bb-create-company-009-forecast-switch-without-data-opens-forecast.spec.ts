import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-009
 * @title        Switching to an existing forecast before entering any data opens the Forecast page directly
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` has `company`, and that company has `targetForecast`.
 *     It is deliberately NOT "Start Up", whose forecasts the Dividends specs rely on.
 *   - No company is created.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. From the home page, select `company` so its forecasts are listed in the forecasts menu.
 *   3. Open "Create New Company"; assert step 1 is shown with no card selected (no data entered).
 *   4. Open the forecasts menu and click `targetForecast`.
 *   5. Assert the Forecast page (/financial/overview) is shown, no unsaved changes dialog appeared,
 *      and `targetForecast` is the selected forecast.
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
