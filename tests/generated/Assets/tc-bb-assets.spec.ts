import { test } from '../../fixtures/self-healing-fixture';
import assetsInputs from '../../../test-data/AssetsInputs.json';

/**
 * TC-BB-Assets — Assets add / edit / duplicate / delete, end-to-end.
 *
 * @module     Assets
 * @priority   P2
 * @tags       @assets @automation
 *
 * Migrated from the legacy TestCafe spec `BRD-111_AssetsTestCases.js` (plus
 * `AssetsPage.js` and `AssetsPopUp.js` selector classes). Data-driven over
 * `test-data/AssetsInputs.json` (one Playwright test per input row, mirroring
 * the legacy `data.forEach`). Each row drives:
 *
 *   login → pick company & forecast → open Financial Plan → Financial Tables →
 *   Assets chapter → add / edit / duplicate / delete an asset → assert rendered rows.
 *
 * The forecast selected is not built through the UI — it's seeded once over the API by
 * `npm run seed:forecast` before the suite runs, and read here via the `seededForecast`
 * fixture. Run `npm run seed:forecast:delete` once all modules have finished.
 *
 * The branch taken is selected by `input.howWillEnter`:
 *   - `"One-Time amount (EÂ£)"`         → one-time amount panel (long-term or current)
 *   - `"Constant amount (EÂ£)"`         → constant amount panel (long-term or current)
 *   - `"Varying amounts over time (EÂ£)"` → varying table panel (long-term or current)
 *   - `"edit"`                          → open existing asset settings and edit name
 *   - `"duplicate"`                     → duplicate an existing asset and rename
 *   - `"delete"`                        → delete an existing asset and verify removal
 *
 * @preconditions
 *   - Valid BznsBuilder staging account with at least one company and forecast.
 *   - `test-data/AssetsInputs.json` populated with real credentials, navigation values,
 *     branch literals (incl. `(EÂ£)` mojibake currency suffixes), and 42-entry
 *     expected-value arrays (`termRes`, `res`).
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page.
 *   2. Open the sign-in modal and submit credentials.
 *   3. Assert the home page loaded; pick company and forecast from their menus.
 *   4. Open the Financial Plan.
 *   5. Open Financial Tables and navigate to the Assets chapter.
 *   6. Run the scenario dispatch (modal dismiss if needed, add/edit/duplicate/delete
 *      the asset, fill in entry-type–specific fields, assert the rendered financial rows).
 *
 * Notes:
 *   - `maximizeWindow()` dropped — viewport is controlled by `playwright.config.ts`.
 *   - All selectors live in page objects; this spec only orchestrates page-object methods.
 *   - Original fixture `.page("https://stgapp.bznsbuilder.com/auth")` — base URL is in config.
 *   - ⚠ `AssetsInputs.json` is an empty TEMPLATE — populate it before running.
 *   - ⚠ Branch literals containing `"(EÂ£)"` (mojibake currency suffix) must match the
 *     live app exactly; verify against the running staging environment.
 *   - ⚠ Month/year attribute swap (`oneStartMonth`↔`oneStartYear`, etc.) is preserved
 *     verbatim from the legacy source — verify on the live app.
 */

// Loosely typed: the inputs JSON is data, not a contract.
const inputs = assetsInputs as any[];

for (const input of inputs) {
    test(`${input.test} @assets @automation`, async ({ selfHealingFixture: { pomSelfHealing }, seededForecast }) => {
        // ── Sign in ──────────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.assertPageLoaded();

        // ── Pick company & forecast, open Financial Plan ─────────────────────────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        // Selects the forecast seeded through the API before the suite ran.
        await pomSelfHealing.homePage.selectFromMenu(seededForecast.forecastName);
        await pomSelfHealing.homePage.openFinancialPlan();

        // ── Open the Assets chapter ──────────────────────────────────────────────
        await pomSelfHealing.financialDashboard.openFinancialTables();
        await pomSelfHealing.financialDashboard.goToAssets();

        // ── Run the assets scenario (modal check, add/edit/duplicate/delete, assert) ─
        await pomSelfHealing.assetsPage.runAssetsScenario(input);
    });
}
