/**
 * @testcase  TC-BB-Personnel
 * @title     Personnel add / edit / duplicate / delete, end-to-end
 * @module    Personnel
 * @area      Financial Plan / Financial Tables
 * @priority  1
 * @tags      @personnel @automation
 *
 * @preconditions
 *   - The user has a registered BznsBuilder account with access to the target company/forecast
 *   - Input values are sourced from test-data/PersonnelInputs.json (never hardcoded)
 *
 * @steps
 *   1. Navigate to the BznsBuilder app and sign in with credentials from test data
 *   2. Assert the home dashboard is loaded
 *   3. Pick the company and forecast from test data, open the Financial Plan
 *   4. Open Financial Tables → Personnel chapter
 *   5. Dismiss the instructions modal (only for the individual/regular/% of revenue scenario)
 *   6. Wait for the Personnel list to load
 *   7. Branch by scenario type / maintenance action (input.type) and run the scenario
 *   8. Assert the rendered rows match the expected values from test data
 *
 * @notes
 *   - Migrated from the legacy TestCafe spec `BRD-109_PersonnelTestCases.js` (+ the
 *     `PersonnelPage.js` selector class).
 *   - The forecast selected is not built through the UI — this spec seeds its own isolated
 *     forecast plus a `Sales` revenue stream directly over the API in `test.beforeAll`, and
 *     tears both down in `test.afterAll`. It never touches `.seed/run-context.json` (that file
 *     is reserved for the shared forecast used by SignUp/Revenues/DirectCost/IndirectCost/
 *     Assets). `npm run test:module MODULE=Personnel` is sufficient on its own — no external
 *     seed step needed.
 *   - `test-data/PersonnelInputs.json` is a TEMPLATE — populate it with real credentials,
 *     navigation values, and the 42-entry expected-value arrays before running.
 *   - `startyear`/`startMonth`/`endyear`/`endMonth` and `whichRevenue`/`RevenuePercntage`
 *     carry quirks preserved verbatim from the legacy selector file — see
 *     `src/locators/personnel-page-locators.ts` and `src/pages/personnel-page-self-healing.ts`
 *     for details.
 */

import { test } from '../../fixtures/self-healing-fixture';
import personnelInputs from '../../../test-data/PersonnelInputs.json';
import { ForecastApiClient, type CreatedForecast } from '../../../src/utils/forecast-api-client';

const PERSONNEL_FORECAST_NAME = 'test';
const PERSONNEL_REVENUE_NAME = 'Sales';
const PERSONNEL_REVENUE_AMOUNT = '1000';

let apiClient: ForecastApiClient;
let seededForecast: CreatedForecast;
let createdByThisSpec: boolean;

test.describe('Personnel - Add / edit / duplicate / delete a personnel entry', () => {

    test.beforeAll(async () => {
        apiClient = new ForecastApiClient();
        await apiClient.login(personnelInputs[0].mail, personnelInputs[0].password);
        const companyId = await apiClient.resolveCompanyId(personnelInputs[0].company);

        // Reuse the shared forecast if one already exists (e.g. created by the MODULES-loop's
        // own "Seed forecast" step before this module's turn in scheduled-execution.yml) — only
        // create/own a new one when running standalone. Either way, add the Sales revenue
        // stream this scenario needs.
        const existing = await apiClient.listForecasts(companyId);
        const found = existing.find(f => f.name === PERSONNEL_FORECAST_NAME);

        if (found) {
            seededForecast = { id: found.id, name: found.name, companyId };
            createdByThisSpec = false;
        } else {
            seededForecast = await apiClient.createForecast(PERSONNEL_FORECAST_NAME, companyId);
            createdByThisSpec = true;
        }

        await apiClient.createRevenueStream(PERSONNEL_REVENUE_NAME, seededForecast.id, PERSONNEL_REVENUE_AMOUNT);
    });

    test.afterAll(async () => {
        // Only delete what this spec itself created — a reused shared forecast is cleaned up
        // by whatever created it (the outer "Delete seeded forecast" workflow step).
        if (createdByThisSpec && seededForecast) {
            await apiClient.deleteForecast(seededForecast.id);
        }
        await apiClient.dispose();
    });

    // This scenario's "% of revenue" salary method requires a revenue stream named exactly
    // "Sales" — created automatically in beforeAll above. See docs/personnel-revenue-seeding.md
    // for why.
    test(
        `TC-BB-Personnel: ${personnelInputs[0].test} @personnel @automation`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            const personnel = pomSelfHealing.personnelPage;

            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                personnelInputs[0].mail,
                personnelInputs[0].password,
            );
            await pomSelfHealing.homePage.assertPageLoaded();

            await pomSelfHealing.homePage.openCompaniesMenu();
            await pomSelfHealing.homePage.selectFromMenu(personnelInputs[0].company);
            await pomSelfHealing.homePage.openFoecastsMenu();
            // Selects the forecast seeded in beforeAll above.
            await pomSelfHealing.homePage.selectFromMenu(seededForecast.name);
            await pomSelfHealing.homePage.openFinancialPlan();

            await pomSelfHealing.financialDashboard.openFinancialTables();
            await pomSelfHealing.financialDashboard.goToPersonnel();
            await personnel.checkTheInstructionsModal(personnelInputs[0].test);
            await personnel.waitForPersonnelListLoaded();

            // Loosely typed: the inputs JSON is data, not a contract.
            await personnel.runPersonnelScenario(personnelInputs[0] as any);
        },
    );

});
