import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { FinancialDashboardSelfHealing } from './financial-dashboard-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { directCostLocators } from '../locators/direct-cost-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * DirectCostPageSelfHealing — Page Object for the BznsBuilder "Add / Edit Direct Cost" flow.
 *
 * Migrated from the legacy TestCafe `DirectCostPopUp` selector class (`DirectCostPopUp.js`)
 * plus the `BRD-108_DirectCostTestCases.js` spec, whose per-type logic lived in the test
 * body. Covers all three cost types exercised by the legacy suite — General Cost, Cost of
 * Revenue, and Cost of Expenses — plus the edit, duplicate, and delete flows and the
 * post-save value assertions across the 42 rendered period columns.
 *
 * ## Delegation (mirrors RevenuesPageSelfHealing)
 * The legacy spec delegated heavily to a shared `Financial` page object for generic helpers
 * (Next/Save/Discard buttons, the close-confirm dialog, new group, row settings/edit/
 * duplicate/delete, sub-row togglers, varying-table cells, rendered-row assertions, show
 * monthly) and to the home dashboard for picking an option from an open menu. Those all
 * already exist on {@link FinancialDashboardSelfHealing} / {@link HomePageSelfHealing} and
 * target the very same DOM, so this page object composes them (`this.financial`, `this.home`)
 * and delegates rather than re-wiring duplicates. The direct-cost pop-up's own fields are
 * wired here from {@link directCostLocators}.
 *
 * ## Faithful-behaviour notes (quirks preserved verbatim)
 *   - Property name `genaralCost` is misspelled in the legacy source — preserved 1:1.
 *   - The constant start/end month dropdowns carry `…dateYear…` and the year dropdowns carry
 *     `…dateMonth…` in their data-automation-test (a swap in the source) — preserved verbatim.
 *   - The legacy "cost of expenses / constant amount" branch filled `popUp.howMuchCostRevenues`,
 *     a property that does NOT exist on `DirectCostPopUp` (undefined at runtime → a no-op /
 *     TestCafe error). It is migrated to the real visible amount input (`howMuchCost`). ⚠ Verify.
 *   - Rename used `pressKey('ctrl+a')` + `delete` + `typeText`; the actions helper's `fill()`
 *     already clears the field, so a single `fill()` is used.
 *   - Currency-suffixed branch literals (e.g. `"… (EÂ£)"`) are preserved verbatim so branching
 *     still matches the existing test-data JSON. ⚠ Verify the exact strings.
 *   - `addNew`, `addDirectCostBtn`, `addMsg`, `editMsg`, `deleteMsg` are RECONSTRUCTED locators
 *     (the legacy `DirectCost` page file was not provided) — verify on the live app.
 */
export class DirectCostPageSelfHealing extends SelfHealingPageBase {
    // ─── General / shared form ───────────────────────────────────────────────
    readonly groupField:      SelfHealingLocator;
    readonly addMsg:          SelfHealingLocator;
    readonly editMsg:         SelfHealingLocator;
    readonly deleteMsg:       SelfHealingLocator;
    readonly addNew:          SelfHealingLocator;
    readonly addDirectCostBtn: SelfHealingLocator;

    // ─── Cost-type panels ────────────────────────────────────────────────────
    readonly genaralCost:     SelfHealingLocator;
    readonly costOfExpenses:  SelfHealingLocator;
    readonly ofRevenue:       SelfHealingLocator;

    // ─── General Cost fields ─────────────────────────────────────────────────
    readonly costType:        SelfHealingLocator;
    readonly howMuchCost:     SelfHealingLocator;
    readonly per:             SelfHealingLocator;
    readonly startMonth:      SelfHealingLocator;
    readonly startYear:       SelfHealingLocator;
    readonly endMonth:        SelfHealingLocator;
    readonly endYear:         SelfHealingLocator;

    // ─── Growth (constant cost) ──────────────────────────────────────────────
    readonly growthSwitch:    SelfHealingLocator;
    readonly growthAmount:    SelfHealingLocator;
    readonly growthPeriod:    SelfHealingLocator;
    readonly growthType:      SelfHealingLocator;

    // ─── Cost of Expenses / Cost of Revenue ──────────────────────────────────
    readonly whichExpenses:               SelfHealingLocator;
    readonly costOfExpensesRevenuesType:  SelfHealingLocator;
    readonly whichRevenue:                SelfHealingLocator;

    /** Composed shared page objects — provide form chrome, row actions and menu selection. */
    private readonly financial: FinancialDashboardSelfHealing;
    private readonly home:      HomePageSelfHealing;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    /** Lower-case month names used to fill the 3-year varying tables. */
    private readonly months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
    ];
    /** Years covered by the varying tables. */
    private readonly years = ['2023', '2024', '2025'];

    /**
     * The 42 rendered period-column keys, in order, used to assert each financial row
     * (legacy `Financial.titles`, sliced to the 42 columns the loops iterate).
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

        const logger = Logger.getLogger(`DirectCostPageSelfHealing-${testName}`);
        const L      = directCostLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        // General / shared form
        this.groupField       = make(L.groupField);
        this.addMsg           = make(L.addMsg);
        this.editMsg          = make(L.editMsg);
        this.deleteMsg        = make(L.deleteMsg);
        this.addNew           = make(L.addNew);
        this.addDirectCostBtn = make(L.addDirectCostBtn);

        // Cost-type panels
        this.genaralCost    = make(L.genaralCost);
        this.costOfExpenses = make(L.costOfExpenses);
        this.ofRevenue      = make(L.ofRevenue);

        // General Cost fields
        this.costType   = make(L.costType);
        this.howMuchCost = make(L.howMuchCost);
        this.per        = make(L.per);
        this.startMonth = make(L.startMonth);
        this.startYear  = make(L.startYear);
        this.endMonth   = make(L.endMonth);
        this.endYear    = make(L.endYear);

        // Growth (constant cost)
        this.growthSwitch = make(L.growthSwitch);
        this.growthAmount = make(L.growthAmount);
        this.growthPeriod = make(L.growthPeriod);
        this.growthType   = make(L.growthType);

        // Cost of Expenses / Cost of Revenue
        this.whichExpenses              = make(L.whichExpenses);
        this.costOfExpensesRevenuesType = make(L.costOfExpensesRevenuesType);
        this.whichRevenue               = make(L.whichRevenue);
    }

    // ── Open the add-direct-cost form ───────────────────────────────────────────

    /**
     * Wait for the direct-costs chapter to load, then open the add-direct-cost form
     * (two-step add: the "Add" button reveals the "Direct Cost" option).
     * Legacy: wait `page.addNew` visible → click `page.addNew` → click `page.addDirectCostBtn`.
     */
    async openAddDirectCostForm(): Promise<void> {
        await test.step('Open add-direct-cost form', async () => {
            await this.actions.waitForVisible(await this.addNew.get(), 'Wait for Add button', 60000);
            // The Add button opens a menu/form — skip the post-click Radix guards.
            await this.actions.click((await this.addNew.get()).filter({ visible: true }), 'Click Add button', true);
            await this.actions.click(await this.addDirectCostBtn.get(), 'Click Add Direct Cost option');
        });
    }

    // ── Shared form helpers ─────────────────────────────────────────────────────

    /**
     * Fill the direct-cost name and, when `groupFlag === 'yes'`, set the category/group —
     * either creating a new one (`newGroupFlag === 'yes'`) or picking an existing one.
     * Legacy: type name → (optional) type new group + `newGroup()` OR open group + select.
     */
    async fillNameAndGroupFields(
        name: string,
        groupFlag: string,
        newGroupFlag: string,
        group: string,
    ): Promise<void> {
        await test.step(`Fill direct-cost name "${name}"${groupFlag === 'yes' ? ` and group "${group}"` : ''}`, async () => {
            await this.actions.fill((await this.financial.name.get()).filter({ visible: true }), name, 'Fill direct-cost name');
            //cannot see "add new: {group name}"  when run the code so ignoring the group cases now by adding "no" value to the grouping field in the inputs file
            if (groupFlag === 'yes') {
                if (newGroupFlag === 'yes') {
                    // Open the category select box by clicking its head container (verified live: a
                    // click on the head opens the ng-select and renders its options; options exist in
                    // the DOM only while open). Clicking the head — not the inner input — avoids a race
                    // where the freshly-focused input hasn't opened the panel yet.
                    const head = this.page
                        .locator('div[data-automation-test="auto-select-category-selectHead"]')
                        .filter({ visible: true });
                    await this.actions.click(head.first(), 'Open category dropdown');
                    // On a shared account the group may already exist (e.g. from a prior run); it then
                    // shows as a selectable option and the app offers NO "add new" option. Wait for the
                    // existing option and select it; only type + create when it is genuinely new.
                    const existing = this.page
                        .locator(`div[data-automation-test="auto-select-category-singleOption-${group}"]`);
                    let groupExists = false;
                    try {
                        await existing.first().waitFor({ state: 'visible', timeout: 8000 });
                        groupExists = true;
                    } catch {
                        groupExists = false;
                    }
                    if (groupExists) {
                        // clickOption waits for the open animation to settle + 15s visibility before clicking.
                        await this.actions.clickOption(existing.first(), `Select existing group "${group}"`);
                    } else {
                        await this.actions.fill((await this.groupField.get()).filter({visible:true}), group, 'Fill new group field');
                        await this.financial.newGroup();
                    }
                } else {
                    await this.actions.click((await this.groupField.get()).filter({visible:true}), 'Open group dropdown');
                    await this.home.selectFromMenu(group);
                }
            }
        });
    }

    /**
     * Fill a full 3-year (2023-2025) × 12-month varying table for a chapter type.
     * `values` is consumed left-to-right, 36 cells total.
     */
    async fillVaryingTable(type: string, values: string[]): Promise<void> {
        await test.step(`Fill ${type} varying table (3 years × 12 months)`, async () => {
            let k = 0;
            for (let i = 0; i < this.years.length; i++) {
                for (let j = 0; j < this.months.length; j++) {
                    await this.financial.fillVaryingfield(type, this.years[i], this.months[j], values[k]);
                    k++;
                }
            }
        });
    }

    // ── Scenario dispatch (branch by input.type) ───────────────────────────────

    /**
     * Dispatch a single data-driven direct-cost scenario by its `type`, mirroring the
     * legacy per-row branching that used to live in the spec body. Each add branch fills the
     * relevant form and then runs the shared post-save verification; the edit/duplicate/delete
     * branches run their own maintenance-and-verify flow.
     */
    async runDirectCostScenario(input: DirectCostScenarioInput): Promise<void> {
        if (input.type === 'GeneralCost') {
            await this.addGeneralCost({
                generalType:  input.generalType,
                cost:         input.cost,
                per:          input.per,
                startYear:    input.startYear,
                startMonth:   input.startMonth,
                endYear:      input.endYear,
                endMonth:     input.endMonth,
                growthOrNot:  input.growthOrNot,
                growth:       input.growth,
                growthPeriod: input.growthPeriod,
                values:       input.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        input.grouping,
                group:           input.group,
                groupRes:        input.groupRes,
                nameOfAttribute: input.attributeName,
                res:             input.res,
                directCosts:     input.directCosts,
                total:           input.Total,
            });
        } else if (input.type === 'cost of revenues') {
            await this.addCostOfRevenue({
                revenue:      input.revenue,
                revenueType:  input.revenueType,
                cost:         input.cost,
                startYear:    input.startYear,
                startMonth:   input.startMonth,
                endYear:      input.endYear,
                endMonth:     input.endMonth,
                growthOrNot:  input.growthOrNot,
                growth:       input.growth,
                growthPeriod: input.growthPeriod,
                values:       input.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        input.grouping,
                group:           input.group,
                groupRes:        input.groupRes,
                nameOfAttribute: input.attributeName,
                res:             input.res,
                directCosts:     input.directCosts,
                total:           input.Total,
            });
        } else if (input.type === 'cost of expenses') {
            await this.addCostOfExpenses({
                expense:      input.Expense,
                expenseType:  input.ExpenseType,
                cost:         input.cost,
                startYear:    input.startYear,
                startMonth:   input.startMonth,
                endYear:      input.endYear,
                endMonth:     input.endMonth,
                growthOrNot:  input.growthOrNot,
                growth:       input.growth,
                growthPeriod: input.growthPeriod,
                values:       input.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        input.grouping,
                group:           input.group,
                groupRes:        input.groupRes,
                nameOfAttribute: input.attributeName,
                res:             input.res,
                directCosts:     input.directCosts,
                total:           input.Total,
            });
        } else if (input.type === 'edit') {
            await this.editDirectCost({
                oldName:          input.oldName,
                nameOfDirectCost: input.nameOfDirectCost,
                group:            input.group,
                attributeName:    input.attributeName,
                res:              input.res,
                directCosts:      input.directCosts,
                total:            input.Total,
            });
        } else if (input.type === 'duplicate') {
            await this.duplicateDirectCost({
                oldName:          input.oldName,
                nameOfDirectCost: input.nameOfDirectCost,
                attributeName:    input.attributeName,
                res:              input.res,
            });
        } else if (input.type === 'delete') {
            await this.deleteDirectCost({
                nameOfDirectCost: input.nameOfDirectCost,
                flag:             input.flag,
                directCosts:      input.directCosts,
                total:            input.Total,
            });
        }
    }

    // ── Add cost flows (form fill only — call saveAndVerifyAdd afterwards) ───────

    /**
     * Fill the "General Cost" form for either a constant amount or varying amounts over time.
     * Legacy: click `genaralCost` → Next → switch on `generalType`.
     */
    async addGeneralCost(o: GeneralCostOptions): Promise<void> {
        await test.step('Fill General Cost', async () => {
            await this.actions.click(await this.genaralCost.get(), 'Choose General Cost type');
            await this.financial.clickNext();

            if (o.generalType === 'Constant amount (E£)') {
                // ⚠ NOTE: branch literal preserved verbatim from the legacy source (mojibake currency suffix). Verify against test data.
                await this.actions.fill((await this.howMuchCost.get()).filter({visible:true}), o.cost as string, 'Fill constant cost amount');
                await this.actions.click((await this.per.get()).filter({visible:true}), 'Open cost period');
                await this.home.selectFromMenu(o.per);
                await this.actions.click((await this.startYear.get()).filter({visible:true}), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click((await this.startMonth.get()).filter({visible:true}), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click((await this.endYear.get()).filter({visible:true}), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click((await this.endMonth.get()).filter({visible:true}), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.growthOrNot === 'yes') {
                    await this.actions.click(await this.growthSwitch.get(), 'Toggle growth');
                    await this.actions.fill(await this.growthAmount.get(), o.growth, 'Fill growth amount');
                    await this.actions.click(await this.growthPeriod.get(), 'Open growth period');
                    await this.home.selectFromMenu(o.growthPeriod);
                }
            } else if (o.generalType === 'Varying amounts over time (E£)') {
                // ⚠ NOTE: branch literal preserved verbatim from the legacy source. Verify against test data.
                await this.actions.click((await this.costType.get()).filter({visible:true}), 'Open cost entry-type');
                await this.home.selectFromMenu(o.generalType);
                await this.fillVaryingTable('costs', o.values as string[]);
            }
        });
    }

    /**
     * Fill the "Cost of Revenue" form for a constant or varying revenue-based cost.
     * Legacy: click `ofRevenue` → Next → pick revenue → pick method → constant/varying branch.
     */
    async addCostOfRevenue(o: CostOfRevenueOptions): Promise<void> {
        await test.step('Fill Cost of Revenue', async () => {
            await this.actions.click(await this.ofRevenue.get(), 'Choose Cost of Revenue type');
            await this.financial.clickNext();
            await this.actions.click(await this.whichRevenue.get(), 'Open which-revenue selector');
            await this.home.selectFromMenu(o.revenue);
            await this.actions.click(await this.costOfExpensesRevenuesType.get(), 'Open revenue method');
            await this.home.selectFromMenu(o.revenueType);

            if (o.revenueType === 'Constant amount' || o.revenueType === 'Constant % of this stream') {
                await this.actions.fill(await this.howMuchCost.get(), o.cost as string, 'Fill constant cost amount');
                await this.actions.click(await this.startYear.get(), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(await this.startMonth.get(), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(await this.endYear.get(), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(await this.endMonth.get(), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.revenueType === 'Constant amount' && o.growthOrNot === 'yes') {
                    await this.actions.click(await this.growthSwitch.get(), 'Toggle growth');
                    await this.actions.fill(await this.growthAmount.get(), o.growth, 'Fill growth amount');
                    await this.actions.click(await this.growthPeriod.get(), 'Open growth period');
                    await this.home.selectFromMenu(o.growthPeriod);
                }
            } else if (o.revenueType === 'Varying amounts over time' || o.revenueType === 'Varying % of this stream') {
                await this.fillVaryingTable('costs', o.values as string[]);
            }
        });
    }

    /**
     * Fill the "Cost of Expenses" form for a constant or varying expense-based cost.
     * Legacy: click `costOfExpenses` → Next → pick expense → pick method → constant/varying branch.
     */
    async addCostOfExpenses(o: CostOfExpensesOptions): Promise<void> {
        await test.step('Fill Cost of Expenses', async () => {
            await this.actions.click(await this.costOfExpenses.get(), 'Choose Cost of Expenses type');
            await this.financial.clickNext();
            await this.actions.click(await this.whichExpenses.get(), 'Open which-expenses selector');
            await this.home.selectFromMenu(o.expense);
            await this.actions.click(await this.costOfExpensesRevenuesType.get(), 'Open expense method');
            await this.home.selectFromMenu(o.expenseType);

            if (o.expenseType === 'Constant amount') {
                // ⚠ NOTE: legacy filled `popUp.howMuchCostRevenues` here — a property that does not exist
                // on DirectCostPopUp (undefined at runtime). Migrated to the real amount input. Verify.
                await this.actions.fill(await this.howMuchCost.get(), o.cost as string, 'Fill constant cost amount');
                await this.actions.click(await this.startYear.get(), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(await this.startMonth.get(), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(await this.endYear.get(), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(await this.endMonth.get(), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.growthOrNot === 'yes') {
                    await this.actions.click(await this.growthSwitch.get(), 'Toggle growth');
                    await this.actions.fill(await this.growthAmount.get(), o.growth, 'Fill growth amount');
                    await this.actions.click(await this.growthPeriod.get(), 'Open growth period');
                    await this.home.selectFromMenu(o.growthPeriod);
                }
            } else {
                await this.fillVaryingTable('costs', o.values as string[]);
            }
        });
    }

    // ── Post-save verification for add flows ────────────────────────────────────

    /**
     * The shared post-add sequence (legacy `else` branch): save & close, assert the success
     * toast, wait for the list to return, reveal monthly columns, open the direct_costs
     * toggler, optionally assert the group row, then assert the entry / direct_costs / total
     * rows across all 42 period columns.
     */
    async saveAndVerifyAdd(o: AddVerifyOptions): Promise<void> {
        await test.step('Save direct cost and verify rendered rows', async () => {
            await this.financial.clickSaveAndClose();
            await this.assert.toBeVisible(await this.addMsg.get(), 'Direct Cost Added Successfully toast is visible');
            await this.actions.waitForVisible(await this.addNew.get(), 'Wait for direct-costs list', 60000);
            await this.page.waitForTimeout(1000);
            await this.financial.clickShowMonthly();

            await this.financial.openAndCloseToggler('direct_costs');
            if (o.grouping === 'yes') {
                await this.financial.openAndCloseToggler(o.group);
                await this.assertRowAcrossPeriods(o.group, o.groupRes);
            }
            await this.assertRowAcrossPeriods(o.nameOfAttribute, o.res);
            await this.assertRowAcrossPeriods('direct_costs', o.directCosts);
            await this.assertRowAcrossPeriods('total', o.total);
        });
    }

    // ── Edit / duplicate / delete flows ─────────────────────────────────────────

    /**
     * Discard the open form, then edit an existing direct cost's name and verify its rows.
     * Legacy `type === 'edit'`: close → confirm → toggle direct_costs → toggle group →
     * openSetting → edit → rename → Save & Close → assert editMsg → show monthly → assert rows.
     */
    async editDirectCost(o: EditOptions): Promise<void> {
        await test.step(`Edit direct cost "${o.oldName}" → "${o.nameOfDirectCost}"`, async () => {
            await this.financial.clickClose();
            await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard');
            await this.financial.openAndCloseToggler('direct_costs');
            await this.financial.openAndCloseToggler(o.group);
            await this.financial.openSetting(o.oldName);
            await this.financial.edit(o.oldName);
            await this.actions.fill((await this.financial.name.get()).filter({ visible: true }), o.nameOfDirectCost, 'Rename direct cost');

            await this.financial.clickSaveAndClose();
            await this.assert.toBeVisible(await this.editMsg.get(), 'Direct Cost Modified Successfully toast is visible');
            await this.actions.waitForVisible((await this.financial.showMonthly.get()).filter({ visible: true }), 'Wait for show-monthly toolbar', 60000);
            await this.financial.clickShowMonthly();

            await this.assertRowAcrossPeriods(o.attributeName, o.res);
            await this.assertRowAcrossPeriods('direct_costs', o.directCosts);
            await this.assertRowAcrossPeriods('total', o.total);
        });
    }

    /**
     * Discard the open form, then duplicate an existing direct cost under a new name and
     * verify its row.
     * Legacy `type === 'duplicate'`: close → confirm → toggle direct_costs → openSetting →
     * duplicate → rename duplicate → confirm → show monthly → assert rows.
     */
    async duplicateDirectCost(o: DuplicateOptions): Promise<void> {
        await test.step(`Duplicate direct cost "${o.oldName}" → "${o.nameOfDirectCost}"`, async () => {
            await this.financial.clickClose();
            await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard');
            await this.financial.openAndCloseToggler('direct_costs');
            await this.financial.openSetting(o.oldName);
            await this.financial.duplicate(o.oldName);
            await this.financial.fillDuplicatedName(o.nameOfDirectCost);
            await this.financial.confirmDuplicate();

            await this.page.waitForTimeout(1000);
            await this.financial.clickShowMonthly();
            await this.assertRowAcrossPeriods(o.attributeName, o.res);
        });
    }

    /**
     * Discard the open form, then delete an existing direct cost and verify it is gone and the
     * remaining rows recalculate.
     * Legacy `type === 'delete'`: close → confirm → toggle direct_costs → openSetting →
     * deleteEntry(name, flag) → assert deleteMsg → assert the row no longer exists → show
     * monthly → assert direct_costs / total rows.
     */
    async deleteDirectCost(o: DeleteOptions): Promise<void> {
        await test.step(`Delete direct cost "${o.nameOfDirectCost}"`, async () => {
            await this.financial.clickClose();
            await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard');
            await this.financial.openAndCloseToggler('direct_costs');
            await this.financial.openSetting(o.nameOfDirectCost);
            await this.financial.deleteEntry(o.nameOfDirectCost, o.flag);

            await this.assert.toBeVisible(await this.deleteMsg.get(), 'Direct Cost Deleted Successfully toast is visible');
            await this.actions.waitForVisible((await this.addNew.get()).filter({ visible: true }), 'Wait for direct-costs list', 60000);

            const titleAttr = `auto-financial-row-${o.nameOfDirectCost}-title`;
            await this.assert.toBeHidden(
                this.page.locator(`span[data-automation-test="${titleAttr}"]`),
                `Deleted direct cost "${o.nameOfDirectCost}" no longer exists`,
            );

            await this.financial.clickShowMonthly();
            await this.assertRowAcrossPeriods('direct_costs', o.directCosts);
            await this.assertRowAcrossPeriods('total', o.total);
        });
         
    }

    
    async checkTheInstructionsModal(flag:string){
        if (flag === 'Verify User could add a general constant direct cost') {
            await this.financial.dismissInstructionsModal();
        }
    }                                                                                                       

    // ── Private helpers ──────────────────────────────────────────────────────────

    /** Assert a rendered financial row's value in every one of the 42 period columns. */
    private async assertRowAcrossPeriods(attr: string, values: string[]): Promise<void> {
        for (let i = 0; i < 42; i++) {
            await this.financial.newChek(attr, this.periodTitles[i], values[i]);
        }
    }
}
   /* async addDirectCost(o : typeOptions){
        if (o.type === 'GeneralCost') {
            await this.addGeneralCost({
                generalType:  o.generalType,
                cost:         o.cost,
                per:          o.per,
                startYear:    o.startYear,
                startMonth:   o.startMonth,
                endYear:      o.endYear,
                endMonth:     o.endMonth,
                growthOrNot:  o.growthOrNot,
                growth:       o.growth,
                growthPeriod: o.growthPeriod,
                values:       o.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        o.grouping,
                group:           o.group,
                groupRes:        o.groupRes,
                nameOfAttribute: o.attributeName,
                res:             o.res,
                directCosts:     o.directCosts,
                total:           o.Total,
            });
        }  else if (o.type === 'cost of revenues') {
            await this.addCostOfRevenue({
                revenue:      o.revenue,
                revenueType:  o.generalType,
                cost:         o.cost,
                startYear:    o.startYear,
                startMonth:   o.startMonth,
                endYear:      o.endYear,
                endMonth:     o.endMonth,
                growthOrNot:  o.growthOrNot,
                growth:       o.growth,
                growthPeriod: o.growthPeriod,
                values:       o.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        o.grouping,
                group:           o.group,
                groupRes:        o.groupRes,
                nameOfAttribute: o.attributeName,
                res:             o.res,
                directCosts:     o.directCosts,
                total:           o.Total,
            });
        }  else if (o.type === 'cost of expenses') {
            await this.addCostOfExpenses({
                expense:      o.revenue,
                expenseType:  o.generalType,
                cost:         o.cost,
                startYear:    o.startYear,
                startMonth:   o.startMonth,
                endYear:      o.endYear,
                endMonth:     o.endMonth,
                growthOrNot:  o.growthOrNot,
                growth:       o.growth,
                growthPeriod: o.growthPeriod,
                values:       o.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        o.grouping,
                group:           o.group,
                groupRes:        o.groupRes,
                nameOfAttribute: o.attributeName,
                res:             o.res,
                directCosts:     o.directCosts,
                total:           o.Total,
            });
        } 
    } 
    async edit()
    else if (o.type === 'edit') {
            await this.editDirectCost({
                oldName:          input.oldName,
                nameOfDirectCost: input.nameOfDirectCost,
                group:            input.group,
                attributeName:    input.attributeName,
                res:              input.res,
                directCosts:      input.directCosts,
                total:            input.Total,
            });
    
            
        
       
        
        } else if (input.type === 'duplicate') {
            await directCost.duplicateDirectCost({
                oldName:          input.oldName,
                nameOfDirectCost: input.nameOfDirectCost,
                attributeName:    input.attributeName,
                res:              input.res,
            });
        } else if (input.type === 'delete') {
            await directCost.deleteDirectCost({
                nameOfDirectCost: input.nameOfDirectCost,
                flag:             input.flag,
                directCosts:      input.directCosts,
                total:            input.Total,
            });
        }
    */

// ─────────────────────────────────────────────────────────────────────────────
// Method option types (replace the legacy positional / input-row fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single data-driven scenario row from `test-data/DirectCostInputs.json`, consumed by
 * {@link DirectCostPageSelfHealing.runDirectCostScenario}. Loosely typed because the JSON is
 * data, not a contract — `type` selects which branch (and thus which fields) apply.
 */
export interface DirectCostScenarioInput {
    type: 'GeneralCost' | 'cost of revenues' | 'cost of expenses' | 'edit' | 'duplicate' | 'delete' | string;
    // Common add fields
    cost: string;
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthPeriod: string;
    Values: string[];
    // General Cost
    generalType: string;
    // Cost of Revenue
    revenue: string;
    revenueType: string;
    // Cost of Expenses
    Expense: string;
    ExpenseType: string;
    // Grouping / verification
    grouping: string;
    group: string;
    groupRes: string[];
    attributeName: string;
    res: string[];
    directCosts: string[];
    Total: string[];
    // Edit / duplicate / delete
    oldName: string;
    nameOfDirectCost: string;
    flag: string;
}

/** Options for {@link DirectCostPageSelfHealing.addGeneralCost}. */
export interface GeneralCostOptions {
    generalType: 'Constant amount (EÂ£)' | 'Varying amounts over time (EÂ£)' | string;
    /** A single value for the constant branch. */
    cost: string;
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthPeriod: string;
    /** The 36-cell array for the varying branch. */
    values: string[];
}

/** Options for {@link DirectCostPageSelfHealing.addCostOfRevenue}. */
export interface CostOfRevenueOptions {
    revenue: string;
    revenueType:
        | 'Constant amount'
        | 'Constant % of this stream'
        | 'Varying amounts over time'
        | 'Varying % of this stream'
        | string;
    cost: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthPeriod: string;
    values: string[];
}

/** Options for {@link DirectCostPageSelfHealing.addCostOfExpenses}. */
export interface CostOfExpensesOptions {
    expense: string;
    expenseType: 'Constant amount' | string;
    cost: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthPeriod: string;
    values: string[];
}

/** Options for {@link DirectCostPageSelfHealing.saveAndVerifyAdd}. */
export interface AddVerifyOptions {
    grouping: string;
    group: string;
    /** 42 expected values for the group row (only when grouping === 'yes'). */
    groupRes: string[];
    nameOfAttribute: string;
    /** 42 expected values for the entry row. */
    res: string[];
    /** 42 expected values for the direct_costs row. */
    directCosts: string[];
    /** 42 expected values for the total row. */
    total: string[];
}

/** Options for {@link DirectCostPageSelfHealing.editDirectCost}. */
export interface EditOptions {
    oldName: string;
    nameOfDirectCost: string;
    group: string;
    attributeName: string;
    res: string[];
    directCosts: string[];
    total: string[];
}

/** Options for {@link DirectCostPageSelfHealing.duplicateDirectCost}. */
export interface DuplicateOptions {
    oldName: string;
    nameOfDirectCost: string;
    attributeName: string;
    res: string[];
}

/** Options for {@link DirectCostPageSelfHealing.deleteDirectCost}. */
export interface DeleteOptions {
    nameOfDirectCost: string;
    flag: string;
    directCosts: string[];
    total: string[];
}
/*export interface typeOptions {
    type: string,
    generalType:string,
    cost:string,
    per:string,
    startYear:string,
    startMonth:string,
    endYear:string,
    endMonth:string,
    growthOrNot:string,
    growth:string,
    growthPeriod:string,
    Values:string[],
    grouping:string,
    group:string,
    groupRes:string[],
    attributeName:string,
    res:string[],
    directCosts:string[],
    Total:string[],
    revenue: string
}*/
