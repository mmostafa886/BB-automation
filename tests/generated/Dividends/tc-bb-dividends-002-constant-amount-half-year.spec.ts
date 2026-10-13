import { test } from '../../fixtures/self-healing-fixture';
import { dividendsInputs } from '../../../test-data/dividends-inputs';

/**
 * @jira   BZNS-3754
 * @title  Automation-Forecast: Dividends - Constant Amount - Half year scenario
 */
const input = dividendsInputs[1];

test.describe('Dividends', () => {
    test(`${input.test} @dividends @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
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

        // ── Add the constant-amount dividend ─────────────────────────────────
        await pomSelfHealing.dividendsPage.addConstantAmountDividend({
            name:        input.name,
            currentType: input.currentType,
            entryType:   input.entryType,
            amount:      input.amount,
            period:      input.period,
        });

        // ── Verify ───────────────────────────────────────────────────────────
        await pomSelfHealing.dividendsPage.assertCreatedMsg();
        await pomSelfHealing.dividendsPage.assertYearlyRowValues(
            input.attributeName,
            input.years,
            input.expectedValue,
        );
    });
});
