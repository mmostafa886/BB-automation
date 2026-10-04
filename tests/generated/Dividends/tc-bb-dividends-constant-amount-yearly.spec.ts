import { test } from '../../fixtures/self-healing-fixture';
import { dividendsInputs } from '../../../test-data/dividends-inputs';

/**
 * @testcase     TC-BB-Dividends-Constant-Amount-Yearly
 * @title        Add a constant-amount dividend charged per year and verify the rendered yearly values
 * @module       Dividends
 * @priority     P2
 * @tags         @dividends @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/DividendsInputs.json` has a company and a forecast already
 *     selected — this flow goes straight to the Forecast link and uses whatever forecast the
 *     account last had open. It does NOT pick a company/forecast from the side menu.
 *   - No API-seeded forecast is needed, so this module does NOT use the `seededForecast`
 *     fixture and needs no `npm run seed:forecast` bracket.
 *   - The dividend name in the test data must not already exist in that forecast, otherwise the
 *     row attribute asserted at the end matches two rows.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page.
 *   2. Open the sign-in modal and submit the credentials.
 *   3. Wait for the dashboard to load after login.
 *   4. Open the Forecast / Financial Plan.
 *   5. Open Financial Tables and go to the Dividends chapter.
 *   6. Dismiss the chapter instructions modal if it is shown.
 *   7. Add a constant-amount dividend: name it, switch the entry type from "One time amount"
 *      to "Constant amount", enter 1000, set the period to Year, then Save & Exit.
 *   8. Assert the success toast.
 *   9. Assert the dividend row shows E£ 1,000 for 2026 through 2030.
 *
 * Converted from a hand-recorded Playwright spec ("Dividends- Constant Amount - Yearly").
 *
 * Notes:
 *   - `validLogin(page)` from the recording is expressed as the three login page-object calls
 *     plus `waitForDashboardLoaded()`, which allows 60 s — sign-in on staging regularly takes
 *     longer than the 5 s default `expect` timeout.
 *   - The recording clicked the success toast to prove it existed; that is a real assertion here.
 *   - The `getByRole('button', { name: '×' })` click is `dismissInstructionsModal()`, which is
 *     already guarded: the modal only renders for a chapter with no entries, so the call is a
 *     no-op on a re-run against a forecast that already has dividends.
 *   - These tests share one forecast, so the describe below runs in serial mode — see the comment
 *     there. Keep any new Dividends test in this file (or serial too) rather than letting it run
 *     alongside these against the same chapter.
 */
test.describe('Dividends', () => {
    // Run these one at a time. Every test here signs in as the same account and edits the SAME
    // Dividends chapter of the same company and forecast, so with `fullyParallel: true` two of them
    // open that chapter at once and the app stops responding: the "Dividends" sub-link click hangs
    // until the test times out. Measured on UAT: 2 workers gave 1 failure + 1 flaky out of 4, while
    // the same four pass every time on a single worker.
    test.describe.configure({ mode: 'serial' });

    // ---- Dividends - Constant Amount - Quarter Year ------------------------
    test(
        `${dividendsInputs[0].test} @dividends @automation`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            // ── Sign in ──────────────────────────────────────────────────────
            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                dividendsInputs[0].mail,
                dividendsInputs[0].password,
            );
            await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Pick company & forecast, open the Financial Plan ──────────────────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[0].company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        // Selects the forecast seeded through the API before the suite ran.
        await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[0].forecast);

            // ── Open the Dividends chapter ───────────────────────────────────
            await pomSelfHealing.homePage.openFinancialPlan();
            await pomSelfHealing.financialDashboard.openFinancialTables();
            // Financial Tables opens the Revenue chapter first. When that chapter has no entries the
            // app can open its add-entry side panel by itself, and the panel blocks the Dividends
            // sub-link until it is cancelled. Optional step: a no-op when no panel is shown.
            await pomSelfHealing.financialDashboard.cancelOpenEntryPanel();
            await pomSelfHealing.financialDashboard.goToDividends();
            await pomSelfHealing.financialDashboard.dismissInstructionsModal();

            // ── Add the constant-amount dividend ─────────────────────────────
            await pomSelfHealing.dividendsPage.addConstantAmountDividend({
                name:        dividendsInputs[0].name,
                currentType: dividendsInputs[0].currentType,
                entryType:   dividendsInputs[0].entryType,
                amount:      dividendsInputs[0].amount,
                period:      dividendsInputs[0].period,
            });

            // ── Verify ───────────────────────────────────────────────────────
            await pomSelfHealing.dividendsPage.assertCreatedMsg();
            await pomSelfHealing.dividendsPage.assertYearlyRowValues(
                dividendsInputs[0].attributeName,
                dividendsInputs[0].years,
                dividendsInputs[0].expectedValue,
            );
        },
    );

    // ---- Dividends - Constant Amount - Half Year ---------------------------
    test(
        `${dividendsInputs[1].test} @dividends @automation`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            // ── Sign in ──────────────────────────────────────────────────────
            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                dividendsInputs[1].mail,
                dividendsInputs[1].password,
            );
            await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Pick company & forecast, open the Financial Plan ──────────────────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[1].company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        // Selects the forecast seeded through the API before the suite ran.
        await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[1].forecast);

            // ── Open the Dividends chapter ───────────────────────────────────
            await pomSelfHealing.homePage.openFinancialPlan();
            await pomSelfHealing.financialDashboard.openFinancialTables();
            // Optional: Financial Tables opens the Revenue chapter first, and an empty chapter can open
            // its add-entry side panel by itself, which blocks the Dividends sub-link until cancelled.
            await pomSelfHealing.financialDashboard.cancelOpenEntryPanel();
            await pomSelfHealing.financialDashboard.goToDividends();
            await pomSelfHealing.financialDashboard.dismissInstructionsModal();

            // ── Add the constant-amount dividend ─────────────────────────────
            await pomSelfHealing.dividendsPage.addConstantAmountDividend({
                name:        dividendsInputs[1].name,
                currentType: dividendsInputs[1].currentType,
                entryType:   dividendsInputs[1].entryType,
                amount:      dividendsInputs[1].amount,
                period:      dividendsInputs[1].period,
            });

            // ── Verify ───────────────────────────────────────────────────────
            await pomSelfHealing.dividendsPage.assertCreatedMsg();
            await pomSelfHealing.dividendsPage.assertYearlyRowValues(
                dividendsInputs[1].attributeName,
                dividendsInputs[1].years,
                dividendsInputs[1].expectedValue,
            );
        },
    );

    // ---- Dividends - Constant Amount - Yearly ------------------------------
    test(
        `${dividendsInputs[2].test} @dividends @automation`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            // ── Sign in ──────────────────────────────────────────────────────
            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                dividendsInputs[2].mail,
                dividendsInputs[2].password,
            );
            await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Pick company & forecast, open the Financial Plan ──────────────────
        await pomSelfHealing.homePage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[2].company);
        await pomSelfHealing.homePage.openFoecastsMenu();
        // Selects the forecast seeded through the API before the suite ran.
        await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[2].forecast);

            // ── Open the Dividends chapter ───────────────────────────────────
            await pomSelfHealing.homePage.openFinancialPlan();
            await pomSelfHealing.financialDashboard.openFinancialTables();
            // Optional: Financial Tables opens the Revenue chapter first, and an empty chapter can open
            // its add-entry side panel by itself, which blocks the Dividends sub-link until cancelled.
            await pomSelfHealing.financialDashboard.cancelOpenEntryPanel();
            await pomSelfHealing.financialDashboard.goToDividends();
            await pomSelfHealing.financialDashboard.dismissInstructionsModal();

            // ── Add the constant-amount dividend ─────────────────────────────
            await pomSelfHealing.dividendsPage.addConstantAmountDividend({
                name:        dividendsInputs[2].name,
                currentType: dividendsInputs[2].currentType,
                entryType:   dividendsInputs[2].entryType,
                amount:      dividendsInputs[2].amount,
                period:      dividendsInputs[2].period,
            });

            // ── Verify ───────────────────────────────────────────────────────
            await pomSelfHealing.dividendsPage.assertCreatedMsg();
            await pomSelfHealing.dividendsPage.assertYearlyRowValues(
                dividendsInputs[2].attributeName,
                dividendsInputs[2].years,
                dividendsInputs[2].expectedValue,
            );
        },
    );

    // ---- Dividends - Invalid Amount Rejected -------------------------------
    /**
     * @testcase     TC3-BB-Dividends-Input-Field-Rejects-Invalid-Format
     * @title        The dividend amount field refuses every invalid value and blocks the save
     * @module       Dividends
     * @priority     P2
     * @tags         @dividends @automation @negative
     *
     * Negative counterpart to the three constant-amount tests above. It walks a list of bad
     * values through the one open wizard and, for each one, checks the three signals the app
     * raises together: the inline "Invalid format" message, the ng-invalid state on the input,
     * and the greyed-out Save & Exit button.
     *
     * It then clicks Save & Exit anyway. That click is the real point of the test: the button
     * is greyed with CSS only and stays clickable, so only clicking it proves the app refuses
     * the value rather than merely styling the button as unavailable. Verified live on
     * stgapp - the click is ignored, no toast appears and no row is added.
     *
     * Nothing is ever saved, so unlike the three tests above this one leaves no data behind and
     * can be re-run against the same forecast indefinitely.
     */
    test(
        `${dividendsInputs[3].test} @dividends @automation @negative`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            // -- Sign in ------------------------------------------------------
            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
                dividendsInputs[3].mail,
                dividendsInputs[3].password,
            );
            await pomSelfHealing.homePage.waitForDashboardLoaded();

            // -- Pick company & forecast --------------------------------------
            await pomSelfHealing.homePage.openCompaniesMenu();
            await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[3].company);
            await pomSelfHealing.homePage.openFoecastsMenu();
            await pomSelfHealing.homePage.selectFromMenu(dividendsInputs[3].forecast);

            // -- Open the Dividends chapter -----------------------------------
            await pomSelfHealing.homePage.openFinancialPlan();
            await pomSelfHealing.financialDashboard.openFinancialTables();
            // Optional: Financial Tables opens the Revenue chapter first, and an empty chapter can open
            // its add-entry side panel by itself, which blocks the Dividends sub-link until cancelled.
            await pomSelfHealing.financialDashboard.cancelOpenEntryPanel();
            await pomSelfHealing.financialDashboard.goToDividends();
            await pomSelfHealing.financialDashboard.dismissInstructionsModal();

            // -- Every invalid value is rejected ------------------------------
            await pomSelfHealing.dividendsPage.openWizardAndFillName(dividendsInputs[3].name);

            for (const invalidAmount of dividendsInputs[3].invalidAmounts) {
                await pomSelfHealing.dividendsPage.fillConstantAmount(invalidAmount);
                await pomSelfHealing.dividendsPage.assertAmountRejected(dividendsInputs[3].expectedError);
            }

            // -- Saving is refused --------------------------------------------
            await pomSelfHealing.dividendsPage.clickSaveAndExit();
            await pomSelfHealing.dividendsPage.assertDividendNotCreated();
        },
    );
});
