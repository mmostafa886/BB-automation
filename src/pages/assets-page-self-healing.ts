import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { FinancialDashboardSelfHealing } from './financial-dashboard-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { assetsLocators } from '../locators/assets-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * AssetsPageSelfHealing — Page Object for the BznsBuilder "Assets" page and Add/Edit Asset pop-up.
 *
 * Derived from `AssetsPage.js` (main page selectors: addAssetsBtn, toast messages) and
 * `AssetsPopUp.js` (all pop-up fields: entry-type selector, One-Time / Constant / Varying
 * panels, Long Term / Current classification, and optional Resell configuration).
 * The direct spec logic from `BRD-111_AssetsTestCases.js` has been distilled into 11
 * purpose-named methods here so the spec body remains a thin dispatcher.
 *
 * ## Delegation (mirrors DirectCostPageSelfHealing / RevenuesPageSelfHealing)
 * All shared form chrome — name field, Next / Save / Discard buttons, the close-confirm
 * dialog, row-settings / edit / duplicate / delete, sub-row togglers, varying-table cell
 * filling, rendered-row value assertions, and show-monthly — already live on
 * {@link FinancialDashboardSelfHealing} and target the same DOM elements. Menu-option
 * selection lives on {@link HomePageSelfHealing#selectFromMenu}. This class composes both
 * (`this.financial`, `this.home`) and delegates rather than re-wiring duplicates.
 *
 * ## Faithful-behaviour notes
 *   - `oneStartMonth` / `oneStartYear` attribute names are swapped in the legacy source
 *     (`dateYear` ↔ `dateMonth`). Preserved verbatim — verify on the live app.
 *   - Same swap applies to `constantStartMonth` / `constantStartYear` and
 *     `resellStartMonth` / `resellStartYear`.
 *   - `Resell` is PascalCase (capital R) in the legacy source; kept as-is.
 *   - Currency-suffixed branch literals (e.g. `"… (EÂ£)"`) are preserved verbatim so they
 *     match the `AssetsInputs.json` test data. ⚠ Verify the exact strings against the live app.
 */
export class AssetsPageSelfHealing extends SelfHealingPageBase {
    // ─── Assets page — toolbar & toast messages ───────────────────────────────
    readonly addAssetsBtn: SelfHealingLocator;
    readonly addMsg:       SelfHealingLocator;
    readonly editMsg:      SelfHealingLocator;
    readonly deleteMsg:    SelfHealingLocator;

    // ─── Pop-up — asset entry-type selector ──────────────────────────────────
    readonly assetType: SelfHealingLocator;

    // ─── Pop-up — One-Time amount panel ──────────────────────────────────────
    readonly amountOfOneTime: SelfHealingLocator;
    readonly oneStartMonth:   SelfHealingLocator;
    readonly oneStartYear:    SelfHealingLocator;

    // ─── Pop-up — Constant amount panel ──────────────────────────────────────
    readonly constantValue:      SelfHealingLocator;
    readonly period:             SelfHealingLocator;
    readonly constantStartMonth: SelfHealingLocator;
    readonly constantStartYear:  SelfHealingLocator;

    // ─── Pop-up — Asset classification (Long Term / Current) ─────────────────
    readonly longTerm:       SelfHealingLocator;
    readonly usefulLife:     SelfHealingLocator;
    readonly customUsefulLife: SelfHealingLocator;
    readonly current:        SelfHealingLocator;
    readonly currentHowLong: SelfHealingLocator;

    // ─── Pop-up — Resell configuration ────────────────────────────────────────
    readonly Resell:          SelfHealingLocator;
    readonly resellValue:     SelfHealingLocator;
    readonly resellStartMonth: SelfHealingLocator;
    readonly resellStartYear:  SelfHealingLocator;

    /** Composed shared page objects — provide form chrome, row actions and menu selection. */
    private readonly financial: FinancialDashboardSelfHealing;
    private readonly home:      HomePageSelfHealing;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    /**
     * The 42 rendered period-column keys, in order, used to assert each financial row
     * (mirrors `Financial.titles` from the legacy source and the shared array in
     * `RevenuesPageSelfHealing` / `DirectCostPageSelfHealing`).
     */
    private readonly periodTitles = [
        'title',
        '2023-01-01', '2023-02-01', '2023-03-01', '2023-04-01', '2023-05-01', '2023-06-01',
        '2023-07-01', '2023-08-01', '2023-09-01', '2023-10-01', '2023-11-01', '2023-12-01', '2023',
        '2024-01-01', '2024-02-01', '2024-03-01', '2024-04-01', '2024-05-01', '2024-06-01',
        '2024-07-01', '2024-08-01', '2024-09-01', '2024-10-01', '2024-11-01', '2024-12-01', '2024',
        '2025-01-01', '2025-02-01', '2025-03-01', '2025-04-01', '2025-05-01', '2025-06-01',
        '2025-07-01', '2025-08-01', '2025-09-01', '2025-10-01', '2025-11-01', '2025-12-01', '2025',
        '2026', '2027',
    ];

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page      = page;
        this.actions   = new AdvancedActionsHelper(page, testName);
        this.assert    = new AdvancedAssertionsHelper(page, testName);
        this.financial = new FinancialDashboardSelfHealing(page, testName, aiProvider);
        this.home      = new HomePageSelfHealing(page, testName, aiProvider);

        const logger = Logger.getLogger(`AssetsPageSelfHealing-${testName}`);
        const L      = assetsLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        // Assets page — toolbar & toast messages
        this.addAssetsBtn = make(L.addAssetsBtn);
        this.addMsg       = make(L.addMsg);
        this.editMsg      = make(L.editMsg);
        this.deleteMsg    = make(L.deleteMsg);

        // Pop-up — asset entry-type selector
        this.assetType = make(L.assetType);

        // Pop-up — One-Time amount panel
        this.amountOfOneTime = make(L.amountOfOneTime);
        this.oneStartMonth   = make(L.oneStartMonth);
        this.oneStartYear    = make(L.oneStartYear);

        // Pop-up — Constant amount panel
        this.constantValue      = make(L.constantValue);
        this.period             = make(L.period);
        this.constantStartMonth = make(L.constantStartMonth);
        this.constantStartYear  = make(L.constantStartYear);

        // Pop-up — Asset classification (Long Term / Current)
        this.longTerm        = make(L.longTerm);
        this.usefulLife      = make(L.usefulLife);
        this.customUsefulLife = make(L.customUsefulLife);
        this.current         = make(L.current);
        this.currentHowLong  = make(L.currentHowLong);

        // Pop-up — Resell configuration
        this.Resell           = make(L.Resell);
        this.resellValue      = make(L.resellValue);
        this.resellStartMonth = make(L.resellStartMonth);
        this.resellStartYear  = make(L.resellStartYear);
    }

    // ── Add Assets button ───────────────────────────────────────────────────────

    /**
     * Wait for the add-assets button to be visible, then click it to open the add-asset form.
     * Legacy: `t.expect(page.addAssetsBtn.visible).ok({timeout:6000}).click(page.addAssetsBtn)`.
     */
    async clickAddAssetsBtn(): Promise<void> {
        await test.step('Wait for Add Asset button and click to open form', async () => {
            await this.actions.waitForVisible(await this.addAssetsBtn.get(), 'Wait for Add Asset button', 6000);
            await this.actions.click(await this.addAssetsBtn.get(), 'Click Add Asset button');
        });
    }

    // ── One-Time amount panel ───────────────────────────────────────────────────

    /**
     * Fill the One-Time amount panel: enter the amount value then pick the start year and
     * start month from the respective dropdowns.
     *
     * ⚠ NOTE: `oneStartYear` uses attribute `auto-oneTime-when-dateMonth-selectHead` and
     * `oneStartMonth` uses `auto-oneTime-when-dateYear-selectHead` — swapped in the legacy
     * source. Preserved verbatim. Verify on the live app.
     *
     * Legacy:
     *   `t.typeText(popUp.amountOfOneTime, input.howMuch)`
     *   `.click(popUp.oneStartYear)` → `financial.selectFromMenu(input.startYear)`
     *   `.click(popUp.oneStartMonth)` → `financial.selectFromMenu(input.startMonth)`
     */
    async fillOneTimeAmountPanel(howMuch: string, startYear: string, startMonth: string): Promise<void> {
        await test.step(`Fill One-Time amount panel: ${howMuch}, year ${startYear}, month ${startMonth}`, async () => {
            await this.actions.fill(await this.amountOfOneTime.get(), howMuch, 'Fill one-time amount value');
            await this.actions.click(await this.oneStartYear.get(), 'Open one-time start year dropdown');
            await this.home.selectFromMenu(startYear);
            await this.actions.click(await this.oneStartMonth.get(), 'Open one-time start month dropdown');
            await this.home.selectFromMenu(startMonth);
        });
    }

    // ── Constant amount panel ───────────────────────────────────────────────────

    /**
     * Switch the asset-type dropdown to "Constant amount (EÂ£)" then fill the constant
     * amount panel: enter the cost, pick the period, and set the start year and start month.
     *
     * ⚠ NOTE: branch literal `"Constant amount (EÂ£)"` preserved verbatim — mojibake
     * currency suffix. Verify against `AssetsInputs.json` / the live app.
     *
     * ⚠ NOTE: `constantStartYear` uses attribute `auto-constant-start-dateMonth-selectHead`
     * and `constantStartMonth` uses `auto-constant-start-dateYear-selectHead` — swapped in
     * the legacy source. Preserved verbatim.
     *
     * Legacy:
     *   `.click(popUp.assetType)` → `financial.selectFromMenu('Constant amount (EÂ£)')`
     *   `.typeText(popUp.constantValue, input.cost)`
     *   `.click(popUp.period)` → `financial.selectFromMenu(input.per)`
     *   `.click(popUp.constantStartYear)` → `financial.selectFromMenu(input.startYear)`
     *   `.click(popUp.constantStartMonth)` → `financial.selectFromMenu(input.startMonth)`
     */
    async selectConstantAmountPanel(cost: string, per: string, startYear: string, startMonth: string): Promise<void> {
        await test.step(`Select Constant amount panel: ${cost}/${per}, year ${startYear}, month ${startMonth}`, async () => {
            await this.actions.click(await this.assetType.get(), 'Open asset entry-type dropdown');
            // ⚠ Branch literal preserved verbatim from legacy source. Verify against test data.
            await this.home.selectFromMenu('Constant amount (EÂ£)');
            await this.actions.fill(await this.constantValue.get(), cost, 'Fill constant amount value');
            await this.actions.click(await this.period.get(), 'Open period dropdown');
            await this.home.selectFromMenu(per);
            await this.actions.click(await this.constantStartYear.get(), 'Open constant start year dropdown');
            await this.home.selectFromMenu(startYear);
            await this.actions.click(await this.constantStartMonth.get(), 'Open constant start month dropdown');
            await this.home.selectFromMenu(startMonth);
        });
    }

    // ── Varying amounts panel ───────────────────────────────────────────────────

    /**
     * Switch the asset-type dropdown to "Varying amounts over time (EÂ£)".
     * The loop that fills each year/month cell is performed by the dispatch method
     * (`runAssetsScenario`) using `this.financial.fillVaryingfield` and
     * `this.financial.fillingLast2Years`.
     *
     * ⚠ Branch literal `"Varying amounts over time (EÂ£)"` preserved verbatim — mojibake
     * currency suffix. Verify against `AssetsInputs.json` / the live app.
     *
     * Legacy: `.click(popUp.assetType)` → `financial.selectFromMenu('Varying amounts over time (EÂ£)')`
     */
    async selectVaryingAmountsPanel(): Promise<void> {
        await test.step('Select Varying amounts over time panel', async () => {
            await this.actions.click(await this.assetType.get(), 'Open asset entry-type dropdown');
            // ⚠ Branch literal preserved verbatim from legacy source. Verify against test data.
            await this.home.selectFromMenu('Varying amounts over time (EÂ£)');
        });
    }

    // ── Asset classification ────────────────────────────────────────────────────

    /**
     * Select the "Long Term" asset classification, pick the useful life from its dropdown,
     * and optionally enter a custom useful-life value (2–50) when the selected option is
     * "Custom (2-50)".
     *
     * Legacy:
     *   `.click(popUp.longTerm)`
     *   `.click(popUp.usefulLife)` → `financial.selectFromMenu(input.usefulLife)`
     *   (if Custom) `.typeText(popUp.customUsefulLife, input.customUsefulLife)`
     */
    async selectLongTermClassification(usefulLifeOption: string, customUsefulLifeValue?: string): Promise<void> {
        await test.step(`Select Long Term classification, useful life: ${usefulLifeOption}`, async () => {
            await this.actions.click(await this.longTerm.get(), 'Select Long Term asset classification');
            await this.actions.click(await this.usefulLife.get(), 'Open useful-life dropdown');
            await this.home.selectFromMenu(usefulLifeOption);
            if (customUsefulLifeValue !== undefined) {
                await this.actions.fill(await this.customUsefulLife.get(), customUsefulLifeValue, 'Fill custom useful-life value');
            }
        });
    }

    /**
     * Select the "Current" asset classification and pick how long the asset will be held.
     *
     * Legacy:
     *   `.click(popUp.current)`
     *   `.click(popUp.currentHowLong)` → `financial.selectFromMenu(input.howLong)`
     */
    async selectCurrentClassification(howLong: string): Promise<void> {
        await test.step(`Select Current classification, how long: ${howLong}`, async () => {
            await this.actions.click(await this.current.get(), 'Select Current asset classification');
            await this.actions.click(await this.currentHowLong.get(), 'Open how-long dropdown');
            await this.home.selectFromMenu(howLong);
        });
    }

    // ── Resell configuration ────────────────────────────────────────────────────

    /**
     * Fill the optional resell details for a long-term One-Time asset: plan-to-resell
     * dropdown, resell value, resell start year, and resell start month.
     *
     * ⚠ NOTE: `resellStartYear` uses attribute `auto-resell-when-dateMonth-selectHead` and
     * `resellStartMonth` uses `auto-resell-when-dateYear-selectHead` — swapped in the legacy
     * source. Preserved verbatim. Verify on the live app.
     *
     * Legacy:
     *   `.click(popUp.Resell)` → `financial.selectFromMenu(input.planToResell)`
     *   `.typeText(popUp.resellValue, input.howMuchSellFor)`
     *   `.click(popUp.resellStartYear)` → `financial.selectFromMenu(input.resellStartYear)`
     *   `.click(popUp.resellStartMonth)` → `financial.selectFromMenu(input.resellStartMonth)`
     */
    async fillResellDetails(
        planToResell: string,
        howMuchSellFor: string,
        resellStartYear: string,
        resellStartMonth: string,
    ): Promise<void> {
        await test.step(`Fill resell details: plan=${planToResell}, value=${howMuchSellFor}`, async () => {
            await this.actions.click(await this.Resell.get(), 'Open plan-to-resell dropdown');
            await this.home.selectFromMenu(planToResell);
            await this.actions.fill(await this.resellValue.get(), howMuchSellFor, 'Fill resell value');
            await this.actions.click(await this.resellStartYear.get(), 'Open resell start year dropdown');
            await this.home.selectFromMenu(resellStartYear);
            await this.actions.click(await this.resellStartMonth.get(), 'Open resell start month dropdown');
            await this.home.selectFromMenu(resellStartMonth);
        });
    }

    // ── Toast message assertions ────────────────────────────────────────────────

    /**
     * Assert the "Asset Added Successfully" toast is visible.
     * Legacy: `t.expect(page.addMsg.visible).ok({timeout:6000}).expect(page.addMsg.exists).ok()`
     */
    async assertAddMsg(): Promise<void> {
        await test.step('Assert "Asset Added Successfully" toast is visible', async () => {
            await this.assert.toBeVisible(await this.addMsg.get(), '"Asset Added Successfully" toast is visible');
        });
    }

    /**
     * Assert the "Asset Modified Successfully" toast is present.
     * Legacy: `t.expect(page.editMsg.exists).ok()`
     */
    async assertEditMsg(): Promise<void> {
        await test.step('Assert "Asset Modified Successfully" toast is present', async () => {
            await this.assert.toBeVisible(await this.editMsg.get(), '"Asset Modified Successfully" toast is present');
        });
    }

    /**
     * Assert the "Asset deleted successfully!" toast is present.
     * Legacy: `t.expect(page.deleteMsg.exists).ok()`
     */
    async assertDeleteMsg(): Promise<void> {
        await test.step('Assert "Asset deleted successfully!" toast is present', async () => {
            await this.assert.toBeVisible(await this.deleteMsg.get(), '"Asset deleted successfully!" toast is present');
        });
    }

    /**
     * Assert the "Add Asset" button is visible (post-save / post-delete readiness check).
     * Legacy: `t.expect(page.addAssetsBtn.visible).ok({timeout:60000})`
     */
    async assertAddAssetsButtonVisible(): Promise<void> {
        await test.step('Assert Add Asset button is visible', async () => {
            await this.actions.waitForVisible(await this.addAssetsBtn.get(), 'Wait for Add Asset button (post-action)', 60000);
        });
    }

    // ── Full scenario dispatch (Step 4b — moved from spec) ─────────────────────

    /**
     * Full assets scenario dispatch — contains ALL branching logic from the legacy
     * `BRD-111_AssetsTestCases.js` spec body so the spec stays thin.
     *
     * Flow (mirrors the legacy spec exactly, branch-for-branch):
     *   1. Dismiss the instructions modal when shown for the first-time long-term asset test.
     *   2. Open the add-asset form and fill the entry name.
     *   3. Switch on `input.howWillEnter` (6 cases):
     *      - One-Time / Constant / Varying → fill the corresponding panel
     *      - edit / duplicate / delete → close the form and perform the row action
     *   4. For add rows (not edit/duplicate/delete): click Next, then set the asset
     *      classification (Long Term or Current) and optionally fill Resell details.
     *   5. Post-action assertions keyed by `howWillEnter`:
     *      - edit / duplicate → show monthly, assert termRes + res rows
     *      - delete → assert delete toast, assert row gone, show monthly, assert termRes rows
     *      - add → save & close, assert add toast, show monthly, assert termRes + res rows
     *
     * ⚠ Branch literals (e.g. `"One-Time amount (EÂ£)"`) preserved verbatim — mojibake
     * currency suffix must match the live app and `AssetsInputs.json` exactly.
     */
    async runAssetsScenario(input: AssetsScenarioInput): Promise<void> {
        await test.step(`Run assets scenario: ${input.howWillEnter ?? 'add'} (${input.type ?? 'unknown type'})`, async () => {

            // ── 1. Optional instructions modal (first-time long-term asset) ────────
            if (input.test === 'user could add a one Time Long term Asset (no)') {
                await this.financial.dismissInstructionsModal();
            }

            // ── 2. Open form + fill entry name ─────────────────────────────────────
            await this.clickAddAssetsBtn();
            await this.financial.fillName(input.name);

            // ── 3. Switch on howWillEnter ───────────────────────────────────────────
            const how = input.howWillEnter;

            // ⚠ Branch literals preserved verbatim from legacy source. Verify against test data.
            if (how === 'One-Time amount (E£)') {
                await this.fillOneTimeAmountPanel(input.howMuch, input.startYear, input.startMonth);

            } else if (how === 'Constant amount (E£)') {
                await this.selectConstantAmountPanel(input.cost, input.per, input.startYear, input.startMonth);

            } else if (how === 'Varying amounts over time (E£)') {
                await this.selectVaryingAmountsPanel();
                // Loop mirrors legacy: 3 full years (12 months each) + last 2 years via helper.
                let k2 = 0;
                for (let i = 0; i < 4; i++) {
                    if (i < 3) {
                        for (let j = 0; j < 12; j++) {
                            await this.financial.fillVaryingfield('assets', input.years![i], input.months![j], input.Values![k2]);
                            k2++;
                        }
                    } else {
                        await this.financial.fillingLast2Years('assets', input.Values![k2], input.Values![k2 + 1]);
                    }
                }

            } else if (how === 'edit') {
                await this.financial.clickClose();
                await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard (edit flow)');
                const toggler = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.financial.openAndCloseToggler(toggler);
                await this.financial.openSetting(input.oldName!);
                await this.financial.edit(input.oldName!);
                await this.actions.fill(
                    (await this.financial.name.get()).filter({ visible: true }),
                    input.name,
                    'Rename asset',
                );

            } else if (how === 'duplicate') {
                await this.financial.clickClose();
                await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard (duplicate flow)');
                const toggler = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.financial.openAndCloseToggler(toggler);
                await this.financial.openSetting(input.oldName!);
                await this.financial.duplicate(input.oldName!);
                await this.financial.fillDuplicatedName(input.name);
                await this.financial.confirmDuplicate();

            } else if (how === 'delete') {
                await this.financial.clickClose();
                await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard (delete flow)');
                const toggler = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.financial.openAndCloseToggler(toggler);
                await this.financial.openSetting(input.name);
                await this.financial.deleteEntry(input.name, 'yes');
            }

            // ── 4. Classification step (add flows only) ────────────────────────────
            const isMaintenanceFlow = how === 'edit' || how === 'duplicate' || how === 'delete';
            if (!isMaintenanceFlow) {
                await this.financial.clickNext();
                if (input.type === 'LongTerm') {
                    const customValue = input.usefulLife === 'Custom (2-50)' ? input.customUsefulLife : undefined;
                    await this.selectLongTermClassification(input.usefulLife!, customValue);
                    // ⚠ Branch literal preserved verbatim from legacy source.
                    if (how === 'One-Time amount (EÂ£)' && input.planToResell === 'Yes') {
                        await this.fillResellDetails(
                            input.planToResell!,
                            input.howMuchSellFor!,
                            input.resellStartYear!,
                            input.resellStartMonth!,
                        );
                    }
                } else if (input.type === 'current') {
                    await this.selectCurrentClassification(input.howLong!);
                }
            }

            // ── 5. Post-action assertions ───────────────────────────────────────────
            if (how === 'edit') {
                await this.financial.clickSaveAndClose();
                await this.assertEditMsg();
                await this.actions.waitForVisible(
                    (await this.financial.showMonthly.get()).filter({ visible: true }),
                    'Wait for show-monthly toolbar',
                    60000,
                );
                await this.financial.clickShowMonthly();
                const termRowName = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.assertRowAcrossPeriods(termRowName, input.termRes!);
                await this.assertRowAcrossPeriods(input.attributeName!, input.res!);

            } else if (how === 'duplicate') {
                await this.page.waitForTimeout(1000);
                await this.financial.clickShowMonthly();
                const termRowName = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.assertRowAcrossPeriods(termRowName, input.termRes!);
                await this.assertRowAcrossPeriods(input.attributeName!, input.res!);

            } else if (how === 'delete') {
                await this.assertDeleteMsg();
                await this.assertAddAssetsButtonVisible();
                await this.financial.clickShowMonthly();
                const termRowName = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.assertRowAcrossPeriods(termRowName, input.termRes!);
                // Assert the deleted row no longer exists in the DOM.
                const titleAttr = `auto-financial-row-${input.name}-title`;
                await this.assert.toBeHidden(
                    this.page.locator(`span[data-automation-test="${titleAttr}"]`),
                    `Deleted asset "${input.name}" no longer exists in the table`,
                );

            } else {
                // Add flow (One-Time / Constant / Varying)
                await this.financial.clickSaveAndClose();
                await this.assertAddMsg();
                await this.assertAddAssetsButtonVisible();
                await this.page.waitForTimeout(1000);
                await this.financial.clickShowMonthly();
                const termRowName = input.type === 'LongTerm' ? 'long_term_assets' : 'current_assets';
                await this.assertRowAcrossPeriods(termRowName, input.termRes!);
                await this.financial.openAndCloseToggler(termRowName);
                await this.assertRowAcrossPeriods(input.attributeName!, input.res!);
            }
        });
    }

    // ── Private helpers ───────────────────────────────────────────────────────────

    /** Assert a rendered financial row's value across all 42 period columns. */
    private async assertRowAcrossPeriods(attr: string, values: string[]): Promise<void> {
        for (let i = 0; i < 42; i++) {
            await this.financial.newChek(attr, this.periodTitles[i], values[i]);
        }
    }
}

/**
 * Input shape for {@link AssetsPageSelfHealing.runAssetsScenario}.
 * Loosely typed — the JSON is data, not a contract; `howWillEnter` selects the branch.
 *
 * ⚠ Branch literals in `howWillEnter` (e.g. `"One-Time amount (EÂ£)"`) are preserved
 * verbatim from the legacy source. Verify them against `AssetsInputs.json` / the live app.
 */
export interface AssetsScenarioInput {
    /** Raw test title — used to detect the first-time instructions-modal test case. */
    test: string;
    /** Login credentials */
    mail: string;
    password: string;
    /** Company and forecast navigation */
    company: string;
    forecast: string;
    /** Entry name to create / rename */
    name: string;
    /**
     * Selects the branch:
     *   `"One-Time amount (EÂ£)"` | `"Constant amount (EÂ£)"` |
     *   `"Varying amounts over time (EÂ£)"` | `"edit"` | `"duplicate"` | `"delete"`
     */
    howWillEnter: string;
    /** `"LongTerm"` | `"current"` — asset classification */
    type: string;
    // ── One-Time amount ──────────────────────────────────────────────────────────
    howMuch: string;
    startYear: string;
    startMonth: string;
    // ── Constant amount ──────────────────────────────────────────────────────────
    cost: string;
    per: string;
    // ── Varying amounts ──────────────────────────────────────────────────────────
    years: string[];
    months: string[];
    Values: string[];
    // ── Edit / Duplicate ─────────────────────────────────────────────────────────
    oldName: string;
    // ── Long Term classification ─────────────────────────────────────────────────
    usefulLife: string;
    customUsefulLife: string;
    planToResell: string;
    howMuchSellFor: string;
    resellStartYear: string;
    resellStartMonth: string;
    // ── Current classification ───────────────────────────────────────────────────
    howLong?: string;
    // ── Post-action assertion data ───────────────────────────────────────────────
    attributeName: string;
    /** 42-entry expected values for the long_term_assets / current_assets row */
    termRes: string[];
    /** 42-entry expected values for the specific asset row */
    res?: string[];
}
