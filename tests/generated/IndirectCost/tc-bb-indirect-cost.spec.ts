import { test } from '../../fixtures/self-healing-fixture';
import indirectCostInputs from '../../../test-data/IndirectCostInputs.json';

/**
 * TC-BB-Indirect-Cost — Indirect Cost (Expenses chapter) add / edit / duplicate / delete.
 *
 * Migrated from the legacy TestCafe spec `BRD-110_IndirectCostTestCases.js` (+ the
 * `IndirectCost.js` selector class; `IndirectCostPopUp.js` was empty).
 * Data-driven over `test-data/IndirectCostInputs.json` (one Playwright test per input row,
 * mirroring the legacy `data.forEach`). Each row drives:
 *   login → pick company & forecast → open Financial Plan → Financial Tables →
 *   Expenses chapter → add / edit / duplicate / delete an indirect cost → assert rendered rows.
 *
 * The forecast selected is not built through the UI — it's seeded once over the API by
 * `npm run seed:forecast` before the suite runs, and read here via the `seededForecast`
 * fixture. Run `npm run seed:forecast:delete` once all modules have finished.
 *
 * The branch taken is selected by `input.type`:
 *   - `GeneralCost`       → General Cost (constant amount or varying amounts over time)
 *   - `cost of revenues`  → Cost of Revenue (constant / varying, amount or %)
 *   - `cost of expenses`  → Cost of Expenses (constant / varying)
 *   - `edit` / `duplicate` / `delete` → row maintenance flows
 *
 * Notes:
 *   - `maximizeWindow()` is dropped — viewport is controlled by `playwright.config.ts`.
 *   - All selectors live in page objects; this spec only orchestrates page-object methods.
 *   - ⚠ `IndirectCostInputs.json` is a TEMPLATE — populate it with real credentials,
 *     navigation values, branch literals (incl. the `(EÂ£)` currency suffixes), and the
 *     42-entry expected-value arrays before running.
 *   - ⚠ `IndirectCostPopUp.js` was empty in the legacy source. The `popUp.closeBtn`
 *     reference in the legacy delete branch (a runtime error) has been migrated to
 *     `financial.clickClose()` inside `deleteExpense()`.
 */

// Loosely typed: the inputs JSON is data, not a contract.
const inputs = indirectCostInputs as any[];

for (const input of inputs) {
    test(`${input.test} @indirectcost @automation`, async ({ selfHealingFixture: { pomSelfHealing }, seededForecast }) => {
        const indirectCost = pomSelfHealing.indirectCostPage;

        // ── Sign in ────────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.assertPageLoaded();

        // ── Pick company & forecast, open the Financial Plan ──────────────────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        // Selects the forecast seeded through the API before the suite ran.
        await pomSelfHealing.homePage.selectFromMenu(seededForecast.forecastName);
        await pomSelfHealing.homePage.openFinancialPlan();

        // ── Open the Expenses (Indirect Costs) chapter ────────────────────────
        await pomSelfHealing.financialDashboard.openFinancialTables();
        await pomSelfHealing.financialDashboard.goToExpenses();

        // ── Open the add-expenses form ─────────────────────────────────────────
        await indirectCost.checkInstructionsModal(input.test);
        await indirectCost.openAddExpensesForm();
        
        // ── Fill name + group ──────────────────────────────────────────────────
        await indirectCost.fillNameAndGroupFields(input.name, input.grouping, input.newGroup, input.group);

        // ── Branch by cost type / maintenance action ───────────────────────────
        await indirectCost.runIndirectCostScenario(input);
    });
}
