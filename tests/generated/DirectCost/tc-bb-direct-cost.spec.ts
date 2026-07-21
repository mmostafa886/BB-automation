import { test } from '../../fixtures/self-healing-fixture';
import directCostInputs from '../../../test-data/DirectCostInputs.json';

/**
 * TC-BB-Direct-Cost — Direct Cost add / edit / duplicate / delete, end-to-end.
 *
 * Migrated from the legacy TestCafe spec `BRD-108_DirectCostTestCases.js` (+ the
 * `DirectCostPopUp.js` selector class). Data-driven over `test-data/DirectCostInputs.json`
 * (one Playwright test per input row, mirroring the legacy `data.forEach`). Each row drives:
 *   login → pick company & forecast → open Financial Plan → Financial Tables →
 *   Direct Costs chapter → add / edit / duplicate / delete a direct cost → assert rendered rows.
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
 *   - ⚠ `DirectCostInputs.json` is a TEMPLATE — populate it with real credentials, navigation
 *     values, branch literals (incl. the `(EÂ£)` currency suffixes), and the 42-entry
 *     expected-value arrays before running.
 *   - ⚠ `addNew` / `addDirectCostBtn` and the add/edit/delete toasts are RECONSTRUCTED
 *     locators — verify them against the live app (the legacy `DirectCost` page file was
 *     not provided).
 */

// Loosely typed: the inputs JSON is data, not a contract.
const inputs = directCostInputs as any[];

for (const input of inputs) {
    test(`${input.test} @directcost @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const directCost = pomSelfHealing.directCostPage;

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

        // ── Open the Direct Costs chapter ────────────────────────────────────────
        await pomSelfHealing.financialDashboard.openFinancialTables();
        await pomSelfHealing.financialDashboard.goToDirectCosts();
        await pomSelfHealing.directCostPage.checkTheInstructionsModal(input.test)

        // ── Open the add-direct-cost form and fill name + group ──────────────────
        await directCost.openAddDirectCostForm();
        await directCost.fillNameAndGroupFields(input.nameOfDirectCost,input.grouping,input.newGroup,input.group,);

        // ── Branch by cost type / maintenance action ─────────────────────────────
        await directCost.runDirectCostScenario(input);
    });
}
