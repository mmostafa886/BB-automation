import { test } from '../../fixtures/self-healing-fixture';
import { dividendsInputs } from '../../../test-data/dividends-inputs';

/**
 * @jira   BZNS-3766
 * @title  Automation-Forecast: All Dividends-Input Field Rejects Invalid Format
 */
const input = dividendsInputs[3];

test.describe('Dividends', () => {
    test(`${input.test} @dividends @automation @negative`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Pick the company and forecast, then open the Financial Plan ──────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.forecast);

        // ── Open the Dividends chapter ───────────────────────────────────────
        await pomSelfHealing.homePage.openFinancialPlan();
        await pomSelfHealing.financialDashboard.openFinancialTables();
        await pomSelfHealing.financialDashboard.goToDividends();
        await pomSelfHealing.financialDashboard.dismissInstructionsModal();

        // ── Every invalid value is rejected ──────────────────────────────────
        await pomSelfHealing.dividendsPage.openWizardAndFillName(input.name);

        for (const invalidAmount of input.invalidAmounts) {
            await pomSelfHealing.dividendsPage.fillConstantAmount(invalidAmount);
            await pomSelfHealing.dividendsPage.assertAmountRejected(input.expectedError);
        }

        // ── Saving is refused ────────────────────────────────────────────────
        // Save & Exit is greyed with CSS only and stays clickable, so clicking it is what proves
        // the app refuses the value instead of only styling the button as unavailable.
        await pomSelfHealing.dividendsPage.clickSaveAndExit();
        await pomSelfHealing.dividendsPage.assertDividendNotCreated();
    });
});
