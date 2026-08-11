import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { financialDashboardLocators } from '../locators/financial-dashboard-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * FinancialDashboardSelfHealing — Page Object for the BznsBuilder financial dashboard.
 *
 * Reached immediately after clicking "Forecast" in the side menu. Covers:
 *   - Navbar navigation between financial chapters (Revenue, Direct Costs, …) and
 *     report views (P&L, Cash Flow, Balance Sheet)
 *   - The shared add/edit financial-entry form (name, category, cost type, amount,
 *     period, growth, step navigation, save/close)
 *   - Per-row table actions keyed by entry name (settings, edit, duplicate, delete,
 *     subs toggler) and varying-table cell input
 *   - Value assertions against rendered financial rows
 *
 * Migrated 1:1 from the legacy TestCafe `Financial` page object. Row-action and
 * varying-table methods are parameterised by entry name / type / period, so their
 * selectors are built at runtime via `page.locator(...)` rather than from the static
 * locator repository. The shared, fixed elements are wired as self-healing locators.
 *
 * Three-phase self-healing applies to every repository-backed locator:
 *   Phase 1 → primary CSS/XPath selector
 *   Phase 2 → semantic Playwright strategies (role/label/text…)
 *   Phase 3 → AI healing via Playwright MCP (opt-in, requires aiProvider)
 */
export class FinancialDashboardSelfHealing extends SelfHealingPageBase {
    // ─── Navbar — chapter edit links ─────────────────────────────────────────
    readonly financialTables:  SelfHealingLocator;
    readonly editRevenues:     SelfHealingLocator;
    readonly editDirectCost:   SelfHealingLocator;
    readonly editPersonnel:    SelfHealingLocator;
    readonly editExpenses:     SelfHealingLocator;
    readonly editAssets:       SelfHealingLocator;
    readonly editTaxes:        SelfHealingLocator;
    readonly editDividends:    SelfHealingLocator;
    readonly editFinancing:    SelfHealingLocator;
    readonly cashAssumptions:  SelfHealingLocator;
    readonly initialBalances:  SelfHealingLocator;

    // ─── Navbar — report view links ──────────────────────────────────────────
    readonly viewProfitAndLoss: SelfHealingLocator;
    readonly viewCashFlow:      SelfHealingLocator;
    readonly viewBalanceSheet:  SelfHealingLocator;

    // ─── Chapter toolbar ─────────────────────────────────────────────────────
    readonly showMonthly: SelfHealingLocator;
    readonly export:      SelfHealingLocator;

    // ─── Shared add/edit entry form ──────────────────────────────────────────
    readonly name:         SelfHealingLocator;
    readonly groupField:   SelfHealingLocator;
    readonly genaralCost:  SelfHealingLocator;
    readonly ofRevenue:    SelfHealingLocator;
    readonly costOfExpenses: SelfHealingLocator;
    readonly costType:     SelfHealingLocator;
    readonly howMuchCost:  SelfHealingLocator;
    readonly per:          SelfHealingLocator;
    readonly startMonth:   SelfHealingLocator;
    readonly startYear:    SelfHealingLocator;
    readonly endMonth:     SelfHealingLocator;
    readonly endYear:      SelfHealingLocator;
    readonly growthSwitch: SelfHealingLocator;
    readonly growthAmount: SelfHealingLocator;
    readonly growthPeriod: SelfHealingLocator;
    readonly growthType:   SelfHealingLocator;
    readonly whichRevenue: SelfHealingLocator;
    readonly whichExpenses: SelfHealingLocator;
    readonly costOfExpensesRevenuesType: SelfHealingLocator;

    // ─── Form buttons ────────────────────────────────────────────────────────
    readonly nextBtn:         SelfHealingLocator;
    readonly backBtn:         SelfHealingLocator;
    readonly saveBtn:         SelfHealingLocator;
    readonly saveAndCloseBtn: SelfHealingLocator;
    readonly closeBtn:        SelfHealingLocator;
    readonly resetForm:       SelfHealingLocator;

    // ─── Modals / banners / generic dialog buttons ───────────────────────────
    readonly confirmBtn:            SelfHealingLocator;
    readonly cancelBtn:             SelfHealingLocator;
    readonly confirmClosingBtn:     SelfHealingLocator;
    readonly nameOfDuplicated:      SelfHealingLocator;
    readonly confirmDuplication:    SelfHealingLocator;
    readonly closeInstructionsModal: SelfHealingLocator;
    readonly closeFreeTrialModal:   SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`FinancialDashboardSelfHealing-${testName}`);
        const L      = financialDashboardLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        // Navbar — chapter edit links
        this.financialTables = make(L.financialTables);
        this.editRevenues    = make(L.editRevenues);
        this.editDirectCost  = make(L.editDirectCost);
        this.editPersonnel   = make(L.editPersonnel);
        this.editExpenses    = make(L.editExpenses);
        this.editAssets      = make(L.editAssets);
        this.editTaxes       = make(L.editTaxes);
        this.editDividends   = make(L.editDividends);
        this.editFinancing   = make(L.editFinancing);
        this.cashAssumptions = make(L.cashAssumptions);
        this.initialBalances = make(L.initialBalances);

        // Navbar — report view links
        this.viewProfitAndLoss = make(L.viewProfitAndLoss);
        this.viewCashFlow      = make(L.viewCashFlow);
        this.viewBalanceSheet  = make(L.viewBalanceSheet);

        // Chapter toolbar
        this.showMonthly = make(L.showMonthly);
        this.export      = make(L.export);

        // Shared add/edit entry form
        this.name           = make(L.name);
        this.groupField     = make(L.groupField);
        this.genaralCost    = make(L.genaralCost);
        this.ofRevenue      = make(L.ofRevenue);
        this.costOfExpenses = make(L.costOfExpenses);
        this.costType       = make(L.costType);
        this.howMuchCost    = make(L.howMuchCost);
        this.per            = make(L.per);
        this.startMonth     = make(L.startMonth);
        this.startYear      = make(L.startYear);
        this.endMonth       = make(L.endMonth);
        this.endYear        = make(L.endYear);
        this.growthSwitch   = make(L.growthSwitch);
        this.growthAmount   = make(L.growthAmount);
        this.growthPeriod   = make(L.growthPeriod);
        this.growthType     = make(L.growthType);
        this.whichRevenue   = make(L.whichRevenue);
        this.whichExpenses  = make(L.whichExpenses);
        this.costOfExpensesRevenuesType = make(L.costOfExpensesRevenuesType);

        // Form buttons
        this.nextBtn         = make(L.nextBtn);
        this.backBtn         = make(L.backBtn);
        this.saveBtn         = make(L.saveBtn);
        this.saveAndCloseBtn = make(L.saveAndCloseBtn);
        this.closeBtn        = make(L.closeBtn);
        this.resetForm       = make(L.resetForm);

        // Modals / banners / generic dialog buttons
        this.confirmBtn             = make(L.confirmBtn);
        this.cancelBtn              = make(L.cancelBtn);
        this.confirmClosingBtn      = make(L.confirmClosingBtn);
        this.nameOfDuplicated       = make(L.nameOfDuplicated);
        this.confirmDuplication     = make(L.confirmDuplication);
        this.closeInstructionsModal = make(L.closeInstructionsModal);
        this.closeFreeTrialModal    = make(L.closeFreeTrialModal);
    }

    // ── Navbar navigation ─────────────────────────────────────────────────────

    /** Open the "Financial Tables" navbar tab that reveals the chapter sub-links */
    async openFinancialTables(): Promise<void> {
        await test.step('Open Financial Tables navbar tab', async () => {
            await this.actions.click(await this.financialTables.get(), 'Click Financial Tables navbar tab');
        });
    }

    /** Navigate to the Revenue chapter */
    async goToRevenues(): Promise<void> {
        await test.step('Go to Revenues chapter', async () => {
            await this.actions.click(await this.editRevenues.get(), 'Click Revenue sub-link');
        });
    }

    /** Navigate to the Direct Costs chapter */
    async goToDirectCosts(): Promise<void> {
        await test.step('Go to Direct Costs chapter', async () => {
            await this.actions.click(await this.editDirectCost.get(), 'Click Direct Costs sub-link');
        });
    }

    /** Navigate to the Personnel chapter */
    async goToPersonnel(): Promise<void> {
        await test.step('Go to Personnel chapter', async () => {
            await this.actions.click(await this.editPersonnel.get(), 'Click Personnel sub-link');
        });
    }

    /** Navigate to the Expenses chapter */
    async goToExpenses(): Promise<void> {
        await test.step('Go to Expenses chapter', async () => {
            await this.actions.click(await this.editExpenses.get(), 'Click Expenses sub-link');
        });
    }

    /** Navigate to the Assets chapter */
    async goToAssets(): Promise<void> {
        await test.step('Go to Assets chapter', async () => {
            await this.actions.click(await this.editAssets.get(), 'Click Assets sub-link');
        });
    }

    /** Navigate to the Taxes chapter */
    async goToTaxes(): Promise<void> {
        await test.step('Go to Taxes chapter', async () => {
            await this.actions.click(await this.editTaxes.get(), 'Click Taxes sub-link');
        });
    }

    /** Navigate to the Dividends chapter */
    async goToDividends(): Promise<void> {
        await test.step('Go to Dividends chapter', async () => {
            await this.actions.click(await this.editDividends.get(), 'Click Dividends sub-link');
        });
    }

    /** Navigate to the Financing chapter */
    async goToFinancing(): Promise<void> {
        await test.step('Go to Financing chapter', async () => {
            await this.actions.click(await this.editFinancing.get(), 'Click Financing sub-link');
        });
    }

    /** Navigate to the Cash Assumptions sub-page */
    async goToCashAssumptions(): Promise<void> {
        await test.step('Go to Cash Assumptions', async () => {
            await this.actions.click(await this.cashAssumptions.get(), 'Click Cash Assumptions sub-link');
        });
    }

    /** Navigate to the Initial Balances sub-page */
    async goToInitialBalances(): Promise<void> {
        await test.step('Go to Initial Balances', async () => {
            await this.actions.click(await this.initialBalances.get(), 'Click Initial Balances sub-link');
        });
    }

    /** Open the Profit & Loss report view */
    async goToProfitAndLoss(): Promise<void> {
        await test.step('Go to Profit & Loss report', async () => {
            await this.actions.click(await this.viewProfitAndLoss.get(), 'Click Profit & Loss report link');
        });
    }

    /** Open the Cash Flow report view */
    async goToCashFlow(): Promise<void> {
        await test.step('Go to Cash Flow report', async () => {
            await this.actions.click(await this.viewCashFlow.get(), 'Click Cash Flow report link');
        });
    }

    /** Open the Balance Sheet report view */
    async goToBalanceSheet(): Promise<void> {
        await test.step('Go to Balance Sheet report', async () => {
            await this.actions.click(await this.viewBalanceSheet.get(), 'Click Balance Sheet report link');
        });
    }

    // ── Chapter toolbar ───────────────────────────────────────────────────────

    /** Click "Show Monthly" to reveal per-month columns in the current chapter */
    async clickShowMonthly(): Promise<void> {
        await test.step('Click Show Monthly', async () => {
            await this.actions.click((await this.showMonthly.get()).filter({visible:true}), 'Click Show Monthly button');
        });
    }

    /** Click "Export chapter to CSV" */
    async exportChapterCsv(): Promise<void> {
        await test.step('Export chapter to CSV', async () => {
            await this.actions.click(await this.export.get(), 'Click Export chapter to CSV button');
        });
    }

    /** Close the instructions modal shown when opening an empty chapter */
    async dismissInstructionsModal(): Promise<void> {
        await test.step('Close instructions modal', async () => {
            // The modal only renders for a chapter with no entries yet (e.g. re-running
            // this test against a shared environment that already has data from a prior
            // run) — skip the click instead of waiting out the full locator timeout.
            // The app can leave a stale prior modal instance in the DOM alongside the
            // current one (confirmed live: closeModal resolved to 2 stacked dialogs).
            // Scope to the last visible instance — the one actually on top.
            const closeButton = (await this.closeInstructionsModal.get()).filter({ visible: true }).last();
            if (!(await closeButton.isVisible({ timeout: 3000 }).catch(() => false))) {
                return;
            }
            // Close button detaches on click — skip the post-click Radix guards
            // (otherwise the helper reads data-state off the removed node and hangs).
            await this.actions.click(closeButton, 'Close instructions modal', true);
        });
    }

    /** Close the free-trial banner */
    async dismissFreeTrialBanner(): Promise<void> {
        await test.step('Close free-trial banner', async () => {
            // Close button detaches on click — skip the post-click Radix guards.
            await this.actions.click(await this.closeFreeTrialModal.get(), 'Close free-trial banner', true);
        });
    }

    // ── Add / edit entry form ───────────────────────────────────────────────

    /** Fill the entry name field */
    async fillName(value: string): Promise<void> {
        await test.step(`Fill entry name: ${value}`, async () => {
            await this.actions.fill((await this.name.get()).filter({ visible: true}), value, 'Fill entry name field');
        });
    }

    /** Open the category/group dropdown */
    async openGroupField(): Promise<void> {
        await test.step('Open category dropdown', async () => {
            await this.actions.click(await this.groupField.get(), 'Open category/group dropdown');
        });
    }

    /** Select the "General Cost" entry-type panel */
    async chooseGeneralCost(): Promise<void> {
        await test.step('Choose General Cost type', async () => {
            await this.actions.click(await this.genaralCost.get(), 'Click General Cost type panel');
        });
    }

    /** Select the "Cost of Revenue" entry-type panel */
    async chooseCostOfRevenue(): Promise<void> {
        await test.step('Choose Cost of Revenue type', async () => {
            await this.actions.click(await this.ofRevenue.get(), 'Click Cost of Revenue type panel');
        });
    }

    /** Select the "Cost of Expenses" entry-type panel */
    async chooseCostOfExpenses(): Promise<void> {
        await test.step('Choose Cost of Expenses type', async () => {
            await this.actions.click(await this.costOfExpenses.get(), 'Click Cost of Expenses type panel');
        });
    }

    /** Open the cost-type dropdown */
    async openCostType(): Promise<void> {
        await test.step('Open cost-type dropdown', async () => {
            await this.actions.click(await this.costType.get(), 'Open cost-type dropdown');
        });
    }

    /** Fill the constant cost amount */
    async fillHowMuchCost(amount: string): Promise<void> {
        await test.step(`Fill cost amount: ${amount}`, async () => {
            await this.actions.fill(await this.howMuchCost.get(), amount, 'Fill constant cost amount');
        });
    }

    /** Open the cost period (per month/year) dropdown */
    async openPer(): Promise<void> {
        await test.step('Open cost-period dropdown', async () => {
            await this.actions.click(await this.per.get(), 'Open cost period dropdown');
        });
    }

    /** Open the start-month dropdown */
    async openStartMonth(): Promise<void> {
        await test.step('Open start-month dropdown', async () => {
            await this.actions.click(await this.startMonth.get(), 'Open start-month dropdown');
        });
    }

    /** Open the start-year dropdown */
    async openStartYear(): Promise<void> {
        await test.step('Open start-year dropdown', async () => {
            await this.actions.click(await this.startYear.get(), 'Open start-year dropdown');
        });
    }

    /** Open the end-month dropdown */
    async openEndMonth(): Promise<void> {
        await test.step('Open end-month dropdown', async () => {
            await this.actions.click(await this.endMonth.get(), 'Open end-month dropdown');
        });
    }

    /** Open the end-year dropdown */
    async openEndYear(): Promise<void> {
        await test.step('Open end-year dropdown', async () => {
            await this.actions.click(await this.endYear.get(), 'Open end-year dropdown');
        });
    }

    /** Toggle the growth switch on a constant cost */
    async toggleGrowth(): Promise<void> {
        await test.step('Toggle growth switch', async () => {
            await this.actions.click(await this.growthSwitch.get(), 'Toggle growth switch');
        });
    }

    /** Fill the growth amount */
    async fillGrowthAmount(amount: string): Promise<void> {
        await test.step(`Fill growth amount: ${amount}`, async () => {
            await this.actions.fill(await this.growthAmount.get(), amount, 'Fill growth amount');
        });
    }

    /** Open the growth-period dropdown */
    async openGrowthPeriod(): Promise<void> {
        await test.step('Open growth-period dropdown', async () => {
            await this.actions.click(await this.growthPeriod.get(), 'Open growth period dropdown');
        });
    }

    /** Open the growth-type dropdown */
    async openGrowthType(): Promise<void> {
        await test.step('Open growth-type dropdown', async () => {
            await this.actions.click(await this.growthType.get(), 'Open growth type dropdown');
        });
    }

    /** Open the which-revenue selector (cost of revenue entries) */
    async openWhichRevenue(): Promise<void> {
        await test.step('Open which-revenue selector', async () => {
            await this.actions.click(await this.whichRevenue.get(), 'Open which-revenue selector');
        });
    }

    /** Open the which-expenses selector (cost of expenses entries) */
    async openWhichExpenses(): Promise<void> {
        await test.step('Open which-expenses selector', async () => {
            await this.actions.click(await this.whichExpenses.get(), 'Open which-expenses selector');
        });
    }

    /** Open the over-revenue method dropdown (cost of expenses entries) */
    async openCostOfExpensesRevenuesType(): Promise<void> {
        await test.step('Open over-revenue method dropdown', async () => {
            await this.actions.click(await this.costOfExpensesRevenuesType.get(), 'Open over-revenue method dropdown');
        });
    }

    /** Advance to the next step of the entry form */
    async clickNext(): Promise<void> {
        await test.step('Click Next', async () => {
            await this.actions.click((await this.nextBtn.get()).filter({ visible: true}), 'Click Next button');
        });
    }

    /** Return to the previous step of the entry form */
    async clickBack(): Promise<void> {
        await test.step('Click Back', async () => {
            await this.actions.click(await this.backBtn.get(), 'Click Back button');
        });
    }

    /** Click the save-only button */
    async clickSave(): Promise<void> {
        await test.step('Click Save', async () => {
            await this.actions.click((await this.saveBtn.get()).filter({visible:true}), 'Click Save button');
        });
    }

    /** Click the save-and-close button */
    async clickSaveAndClose(): Promise<void> {
        await test.step('Click Save & Close', async () => {
            await this.actions.click(await this.saveAndCloseBtn.get(), 'Click Save & Close button');
        });
    }

    /** Discard/close the entry form */
    async clickClose(): Promise<void> {
        await test.step('Click Close/Discard', async () => {
            await this.actions.click(await this.closeBtn.get(), 'Click Discard/Close button');
        });
    }

    /** Confirm closing the form when prompted about unsaved changes */
    async confirmClosing(): Promise<void> {
        await test.step('Confirm closing without saving', async () => {
            await this.actions.click(await this.confirmClosingBtn.get(), 'Click Confirm in close-without-saving dialog');
        });
    }

    // ── Duplication modal ─────────────────────────────────────────────────────

    /** Fill the name of the duplicated entry */
    async fillDuplicatedName(value: string): Promise<void> {
        await test.step(`Fill duplicated entry name: ${value}`, async () => {
            await this.actions.fill(await this.nameOfDuplicated.get(), value, 'Fill duplicated entry name');
        });
    }

    /** Confirm the duplication in its modal */
    async confirmDuplicate(): Promise<void> {
        await test.step('Confirm duplication', async () => {
            await this.actions.click(await this.confirmDuplication.get(), 'Click Confirm in duplication modal');
        });
    }

    // ── Open-menu selection ───────────────────────────────────────────────────

    /**
     * Click an option (by exact, trimmed text) inside an already-open dropdown menu.
     * Legacy: `Selector('div').withExactText(value).filterVisible()`.
     */
    /*async selectFromMenu(value: string): Promise<void> {
        await test.step(`Select "${value}" from open menu`, async () => {
            const option = this.page
                .locator('div:visible')
                .filter({ hasText: this.exactText(value) })
                .first();
            await this.actions.clickOption(option, `Select "${value}" from menu`);
        });
    }*/

    // ── Per-row table actions (keyed by entry name) ───────────────────────────

    /** Add a new category/group from the open category dropdown */
    async newGroup(): Promise<void> {
        await test.step('Add new category/group', async () => {
            const addNew = this.page.locator('div[data-automation-test="auto-select-category-addNewOption"]');
            await this.actions.clickOption(addNew, 'Click "add new" category option');
        });
    }

    /** Expand/collapse the sub-rows toggler for a row */
    async openAndCloseToggler(name: string): Promise<void> {
        await test.step(`Toggle sub-rows for "${name}"`, async () => {
            const toggler = this.page.locator(`div[data-automation-test="auto-financial-row-${name}-subsToggler"]`);
            await this.actions.click(toggler, `Toggle sub-rows for "${name}"`);
        });
    }

    /** Open the row-actions menu (the ⋯ / gear icon) for a row */
    async openSetting(name: string): Promise<void> {
        await test.step(`Open row actions for "${name}"`, async () => {
            const icon = this.page.locator(`fa-icon[data-automation-test="auto-button-row-actions-${name}"]`);
            await this.actions.click(icon, `Open row-actions menu for "${name}"`);
        });
    }

    /** Click "Edit" in the open row-actions menu for a row */
    async edit(name: string): Promise<void> {
        await test.step(`Edit row "${name}"`, async () => {
            const editBtn = this.page.locator(`div[data-automation-test="auto-button-row-edit-${name}"]`);
            await this.actions.click(editBtn, `Click Edit for "${name}"`);
        });
    }

    /** Click "Duplicate" in the open row-actions menu for a row */
    async duplicate(name: string): Promise<void> {
        await test.step(`Duplicate row "${name}"`, async () => {
            const dupBtn = this.page.locator(`div[data-automation-test="auto-button-row-duplicate-${name}"]`);
            await this.actions.click(dupBtn, `Click Duplicate for "${name}"`);
        });
    }

    /**
     * Click "Delete" for a row, then confirm or cancel the deletion.
     * @param name - row entry name
     * @param flag - "yes" confirms the deletion; anything else cancels it
     */
    async deleteEntry(name: string, flag: string): Promise<void> {
        await test.step(`Delete row "${name}" (${flag === 'yes' ? 'confirm' : 'cancel'})`, async () => {
            const deleteBtn = this.page.locator(`div[data-automation-test="auto-button-row-delete-${name}"]`);
            await this.actions.click(deleteBtn, `Click Delete for "${name}"`);

            if (flag === 'yes') {
                await this.actions.click(await this.confirmBtn.get(), 'Confirm deletion');
            } else {
                await this.actions.click(await this.cancelBtn.get(), 'Cancel deletion');
            }
        });
    }

    // ── Varying-table cell input ──────────────────────────────────────────────

    /**
     * Fill a single varying-table cell for the given chapter type / year / month.
     * Legacy: `auto-{type}-varying-table-{year}-{month}` (visible instance only).
     */
    async fillVaryingfield(type: string, year: string | number, month: string | number, data: string): Promise<void> {
        await test.step(`Fill ${type} varying cell ${year}-${month}: ${data}`, async () => {
            const attr  = `auto-${type}-varying-table-${year}-${month}`;
            const input = this.page.locator(`input[data-automation-test="${attr}"]`).filter({visible:true});
            await this.actions.fill(input, data, `Fill varying cell ${attr}`);
        });
    }

    /**
     * Fill the yearly varying-table cells for 2026 and 2027 for a chapter.
     * Legacy: `auto-{name}-varying-table-2026` / `-2027`.
     */
    async fillingLast2Years(name: string, value1: string, value2: string): Promise<void> {
        await test.step(`Fill ${name} 2026/2027 varying cells`, async () => {
            const cell2026 = this.page.locator(`input[data-automation-test="auto-${name}-varying-table-2026"]`).first();
            const cell2027 = this.page.locator(`input[data-automation-test="auto-${name}-varying-table-2027"]`).first();
            await this.actions.fill(cell2026, value1, `Fill ${name} 2026 varying cell`);
            await this.actions.fill(cell2027, value2, `Fill ${name} 2027 varying cell`);
        });
    }

    // ── Assertions ─────────────────────────────────────────────────────────────

    /**
     * Assert that a rendered financial-row cell contains the expected text.
     * Legacy `newChek`: span `auto-financial-row-{name}-{attr}` (visible) contains `expected`.
     *
     * @param name     - row entry name
     * @param atrr     - column attribute key (e.g. a period or total column)
     * @param expected - substring expected in the cell's text
     */
    async newChek(name: string, atrr: string, expected: string): Promise<void> {
        await test.step(`Assert row "${name}" cell "${atrr}" contains "${expected}"`, async () => {
            const value = `auto-financial-row-${name}-${atrr}`;
            const cell  = this.page.locator(`span[data-automation-test="${value}"]`).filter({visible:true});
            await this.assert.toContainText(cell, expected, `Row "${name}" cell "${atrr}" contains "${expected}"`);
        });
    }

    // ── Private helpers ─────────────────────────────────────────────────────────

    /** Builds a whitespace-tolerant exact-match RegExp for `withExactText`-style matching. */
    private exactText(value: string): RegExp {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^\\s*${escaped}\\s*$`);
    }
}
