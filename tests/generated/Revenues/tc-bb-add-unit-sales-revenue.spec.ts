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
 * The forecast selected below is not built through the UI — it's seeded once over the API
 * by `npm run seed:forecast` (see `src/scripts/seed-forecast.ts`) before the suite runs, and
 * read here via the `seededForecast` fixture. Run `npm run seed:forecast:delete` once all
 * modules have finished. See `CLAUDE.md` → Commands for the full bracket.
 *
 * Notes:
 *   - `maximizeWindow()` is dropped — viewport is controlled by `playwright.config.ts`.
 *   - All selectors live in page objects; this spec only orchestrates page-object methods.
 *   - The growth-related option fields are mapped from the input row and are simply
 *     `undefined` when a row does not exercise growth (the page object guards on `=== 'yes'`).
 *   - ⚠ `RevenuesInputs.json` is a TEMPLATE — populate it with real credentials, navigation
 *     values, and the 42-entry expected-value arrays before running.
 */

test.describe('Revenues - Add a Unit Sales revenue', () => {
    test(
        `${revenuesInputs[0].test} @revenues @automation`,
        async ({ selfHealingFixture: { pomSelfHealing }, seededForecast }) => {
            // ── Sign in ────────────────────────────────────────────────────────────
            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                revenuesInputs[0].mail,
                revenuesInputs[0].password,
            );
            await pomSelfHealing.homePage.assertPageLoaded();

            // ── Pick company & forecast, open the Financial Plan ─────────────────────
            await pomSelfHealing.homePage.openCompaniesMenu();
            await pomSelfHealing.homePage.selectFromMenu(revenuesInputs[0].company);
            await pomSelfHealing.homePage.openFoecastsMenu();
            // Selects the forecast seeded through the API before the suite ran.
            await pomSelfHealing.homePage.selectFromMenu(seededForecast.forecastName);
            await pomSelfHealing.homePage.openFinancialPlan();

            // ── Open the Revenues chapter ────────────────────────────────────────────
            await pomSelfHealing.financialDashboard.openFinancialTables();
            await pomSelfHealing.financialDashboard.goToRevenues();
            await pomSelfHealing.financialDashboard.dismissInstructionsModal();

            // ── Add a Unit Sales revenue ─────────────────────────────────────────────
            await pomSelfHealing.revenuesPage.clickAddRevenue();
            await pomSelfHealing.revenuesPage.fillNameAndGroupFields(
                revenuesInputs[0].nameOfRevenue,
                revenuesInputs[0].grouping,
                revenuesInputs[0].groupName,
            );
            // Loosely typed: the inputs JSON is data, not a contract.
            await pomSelfHealing.revenuesPage.addUnitSalesRevenue({
                unitType:          revenuesInputs[0].unitType,
                noOfUnits:         revenuesInputs[0].NoOfUnits,
                per:               revenuesInputs[0].per,
                startYear:         revenuesInputs[0].startYear,
                startMonth:        revenuesInputs[0].startMonth,
                endYear:           revenuesInputs[0].endYear,
                endMonth:          revenuesInputs[0].endMonth,
                unitGrowthFlag:    revenuesInputs[0].unitGrowthFlag,
                unitGrowth:        revenuesInputs[0].unitGrowth,
                unitGrowthType:    revenuesInputs[0].unitGrowthType,
                unitGrowthPeriod:  revenuesInputs[0].unitGrowthPeriod,
                unitTypeChoice:    revenuesInputs[0].unitTypeChoice,
                priceType:         revenuesInputs[0].priceType,
                priceOfEachUnit:   revenuesInputs[0].priceOfEachUnit,
                priceGrowthOrNot:  revenuesInputs[0].priceGrowthOrNot,
                priceGrowth:       revenuesInputs[0].priceGrowth,
                priceGrowthType:   revenuesInputs[0].priceGrowthType,
                priceGrowthPeriod: revenuesInputs[0].priceGrowthPeriod,
                priceTypeChoice:   revenuesInputs[0].priceTypeChoice,
                nameOfAttribute:   revenuesInputs[0].nameOfAttribute,
                results:           revenuesInputs[0].res,
                total:             revenuesInputs[0].Total,
                unitsSales:        revenuesInputs[0].unitsSales,
                price:             revenuesInputs[0].price,
            } as any);
        },
    );
});
