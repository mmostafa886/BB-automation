/**
 * @testcase  TC-BB-Direct-Cost
 * @title     Direct Cost add / edit / duplicate / delete, end-to-end
 * @module    DirectCost
 * @area      Financial Plan / Financial Tables
 * @priority  1
 * @tags      @directcost @automation
 *
 * @preconditions
 *   - The user has a registered BznsBuilder account with access to the target company/forecast
 *   - Input values are sourced from test-data/DirectCostInputs.json (never hardcoded)
 *
 * @steps
 *   1. Navigate to the BznsBuilder app and sign in with credentials from test data
 *   2. Assert the home dashboard is loaded
 *   3. Pick the company and forecast from test data, open the Financial Plan
 *   4. Open Financial Tables → Direct Costs chapter
 *   5. Open the add-direct-cost form and fill name + group fields from test data
 *   6. Branch by cost type / maintenance action (input.type) and run the scenario
 *   7. Assert the rendered rows match the expected values from test data
 *
 * @notes
 *   - Migrated from the legacy TestCafe spec `BRD-108_DirectCostTestCases.js` (+ the
 *     `DirectCostPopUp.js` selector class).
 *   - The forecast selected is not built through the UI — it's seeded once over the API by
 *     `npm run seed:forecast` before the suite runs, and read here via the `seededForecast`
 *     fixture. Run `npm run seed:forecast:delete` once all modules have finished.
 *   - `test-data/DirectCostInputs.json` is a TEMPLATE — populate it with real credentials,
 *     navigation values, branch literals (incl. the `(E£)` currency suffixes), and the
 *     42-entry expected-value arrays before running.
 *   - `addNew` / `addDirectCostBtn` and the add/edit/delete toasts are RECONSTRUCTED
 *     locators — verify them against the live app.
 */

import { test } from '../../fixtures/self-healing-fixture';
import directCostInputs from '../../../test-data/DirectCostInputs.json';

test.describe('DirectCost - Add / edit / duplicate / delete a direct cost', () => {

    test(
        `TC-BB-Direct-Cost: ${directCostInputs[0].test} @directcost @automation`,
        async ({ selfHealingFixture: { pomSelfHealing }, seededForecast }) => {
            const directCost = pomSelfHealing.directCostPage;

            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                directCostInputs[0].mail,
                directCostInputs[0].password,
            );
            await pomSelfHealing.homePage.assertPageLoaded();

            await pomSelfHealing.homePage.openCompaniesMenu();
            await pomSelfHealing.homePage.selectFromMenu(directCostInputs[0].company);
            await pomSelfHealing.homePage.openFoecastsMenu();
            // Selects the forecast seeded through the API before the suite ran.
            await pomSelfHealing.homePage.selectFromMenu(seededForecast.forecastName);
            await pomSelfHealing.homePage.openFinancialPlan();

            await pomSelfHealing.financialDashboard.openFinancialTables();
            await pomSelfHealing.financialDashboard.goToDirectCosts();
            await pomSelfHealing.directCostPage.checkTheInstructionsModal(directCostInputs[0].test);

            await directCost.openAddDirectCostForm();
            await directCost.fillNameAndGroupFields(
                directCostInputs[0].nameOfDirectCost,
                directCostInputs[0].grouping,
                directCostInputs[0].newGroup,
                directCostInputs[0].group,
            );

            // Loosely typed: the inputs JSON is data, not a contract.
            await directCost.runDirectCostScenario(directCostInputs[0] as any);
        },
    );

});
