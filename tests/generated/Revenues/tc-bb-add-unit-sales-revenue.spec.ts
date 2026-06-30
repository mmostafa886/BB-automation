import { test } from '../../fixtures/self-healing-fixture';
import revenuesInputs from '../../../test-data/RevenuesInputs.json';

/**
 * TC-BB-Add-Unit-Sales-Revenue — Add a Unit Sales revenue end-to-end.
 *
 * Migrated from the legacy TestCafe spec `unitSalesRevenueTestCase.js`.
 * Data-driven over `test-data/RevenuesInputs.json` (one Playwright test per input row,
 * mirroring the legacy `data.forEach`). Each row drives:
 *   login → pick company & forecast → open Financial Plan → Financial Tables →
 *   Revenues chapter → add a Unit Sales revenue → assert the rendered rows.
 *
 * Notes:
 *   - `maximizeWindow()` is dropped — viewport is controlled by `playwright.config.ts`.
 *   - All selectors live in page objects; this spec only orchestrates page-object methods.
 *   - The growth-related option fields are mapped from the input row and are simply
 *     `undefined` when a row does not exercise growth (the page object guards on `=== 'yes'`).
 *   - ⚠ `RevenuesInputs.json` is a TEMPLATE — populate it with real credentials, navigation
 *     values, and the 42-entry expected-value arrays before running.
 */

// Loosely typed: the inputs JSON is data, not a contract.
const inputs = revenuesInputs as any[];

for (const input of inputs) {
    test(`${input.test} @revenues @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ────────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.assertPageLoaded();

        // ── Pick company & forecast, open the Financial Plan ─────────────────────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.forecast);
        await pomSelfHealing.homePage.openFinancialPlan();

        // ── Open the Revenues chapter ────────────────────────────────────────────
        await pomSelfHealing.financialDashboard.openFinancialTables();
        await pomSelfHealing.financialDashboard.goToRevenues();
        await pomSelfHealing.financialDashboard.dismissInstructionsModal();

        // ── Add a Unit Sales revenue ─────────────────────────────────────────────
        await pomSelfHealing.revenuesPage.clickAddRevenue();
        await pomSelfHealing.revenuesPage.fillNameAndGroupFields(
            input.nameOfRevenue,
            input.grouping,
            input.groupName,
        );
        await pomSelfHealing.revenuesPage.addUnitSalesRevenue({
            unitType:          input.unitType,
            noOfUnits:         input.NoOfUnits,
            per:               input.per,
            startYear:         input.startYear,
            startMonth:        input.startMonth,
            endYear:           input.endYear,
            endMonth:          input.endMonth,
            unitGrowthFlag:    input.unitGrowthFlag,
            unitGrowth:        input.unitGrowth,
            unitGrowthType:    input.unitGrowthType,
            unitGrowthPeriod:  input.unitGrowthPeriod,
            unitTypeChoice:    input.unitTypeChoice,
            priceType:         input.priceType,
            priceOfEachUnit:   input.priceOfEachUnit,
            priceGrowthOrNot:  input.priceGrowthOrNot,
            priceGrowth:       input.priceGrowth,
            priceGrowthType:   input.priceGrowthType,
            priceGrowthPeriod: input.priceGrowthPeriod,
            priceTypeChoice:   input.priceTypeChoice,
            nameOfAttribute:   input.nameOfAttribute,
            results:           input.res,
            total:             input.Total,
            unitsSales:        input.unitsSales,
            price:             input.price,
        });
    });
}
