import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { FinancialDashboardSelfHealing } from './financial-dashboard-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { indirectCostLocators } from '../locators/indirect-cost-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * IndirectCostPageSelfHealing — Page Object for the BznsBuilder "Add / Edit Indirect Cost"
 * (Expenses chapter) flow.
 *
 * Migrated from the legacy TestCafe `IndirectCost.js` selector class and
 * `BRD-110_IndirectCostTestCases.js` spec, whose per-type logic lived in the test body.
 * Covers all three cost types — General Cost, Cost of Revenue, and Cost of Expenses — plus
 * the edit, duplicate, and delete flows and the post-save value assertions.
 *
 * ## Delegation (mirrors DirectCostPageSelfHealing)
 * The legacy spec delegated all shared form fields and helpers to the `Financial` page object
 * (`financial-dashboard-page-self-healing.ts`) and the home dashboard for menu selection.
 * This page object composes `this.financial` and `this.home` and delegates to them for all
 * shared form interactions; only the Expenses-chapter-specific locators are wired here.
 *
 * ## Differences from DirectCostPageSelfHealing (faithful 1:1 from the legacy spec)
 *   - Single-click open: `addExpensesBtn` directly opens the form — no two-step Add menu.
 *   - No `indirect_costs` toggler or row assertion in the add-verify flow.
 *   - Edit / duplicate / delete: no chapter or group toggler before `openSetting`.
 *   - Varying table for General Cost and Cost of Revenue fills 3×12 months + 2 last years
 *     via `financial.fillingLast2Years` (38 values); Cost of Expenses fills 3×12 only (36).
 *
 * ## Quirks preserved verbatim
 *   - Currency-suffixed branch literals (e.g. `"Constant amount (EÂ£)"`) preserved so
 *     branching still matches existing test-data JSON. ⚠ Verify the exact strings.
 *   - `IndirectCostPopUp.js` was empty. The legacy spec referenced `popUp.closeBtn` in the
 *     delete branch — a runtime error (undefined). Migrated to `this.financial.clickClose()`.
 *   - `input.name` is reused for both the new name in edit and the target name in delete
 *     (the legacy spec uses `input.name` in both branches).
 *   - The instructions modal is dismissed both before filling the name and again after saving
 *     (same quirk as DirectCost).
 */
export class IndirectCostPageSelfHealing extends SelfHealingPageBase {
    readonly addExpensesBtn: SelfHealingLocator;
    readonly addMsg:         SelfHealingLocator;
    readonly editMsg:        SelfHealingLocator;
    readonly deleteMsg:      SelfHealingLocator;

    private readonly financial: FinancialDashboardSelfHealing;
    private readonly home:      HomePageSelfHealing;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    private readonly months = [
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',
    ];
    private readonly years = ['2023', '2024', '2025'];

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

        const logger = Logger.getLogger(`IndirectCostPageSelfHealing-${testName}`);
        const L      = indirectCostLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        this.addExpensesBtn = make(L.addExpensesBtn);
        this.addMsg         = make(L.addMsg);
        this.editMsg        = make(L.editMsg);
        this.deleteMsg      = make(L.deleteMsg);
    }

    // ── Open the add-expenses form ──────────────────────────────────────────────

    /**
     * Wait for the Expenses chapter to load, then click the Add button to open the form.
     * Legacy: wait `page.addExpensesBtn` visible → click `page.addExpensesBtn`.
     */
    async openAddExpensesForm(): Promise<void> {
        await test.step('Open add-expenses form', async () => {
            await this.actions.waitForVisible(await this.addExpensesBtn.get(), 'Wait for Add button', 60000);
            await this.actions.click(await this.addExpensesBtn.get(), 'Click Add button');
        });
    }

    /**
     * Dismiss the instructions modal that appears on the first add scenario.
     * Called from the spec immediately after `openAddExpensesForm` when applicable.
     * Legacy: `if (input.test === 'Verify user could add one amount indirect cost with specific date ')`.
     */
    async checkInstructionsModal(testTitle: string): Promise<void> {
        if (testTitle === 'Verify user could add one amount indirect cost with specific date') {
            await test.step('Dismiss instructions modal', async () => {
                await this.financial.dismissInstructionsModal();
            });
        }
    }

    // ── Shared form helpers ─────────────────────────────────────────────────────

    /**
     * Fill the expense name and, when `groupFlag === 'yes'`, set the category/group —
     * either creating a new one (`newGroupFlag === 'yes'`) or picking an existing one.
     * Legacy: type name → (optional) type new group + `newGroup()` OR open group + select.
     */
    async fillNameAndGroupFields(
        name: string,
        groupFlag: string,
        newGroupFlag: string,
        group: string,
    ): Promise<void> {
        await test.step(`Fill expense name "${name}"${groupFlag === 'yes' ? ` and group "${group}"` : ''}`, async () => {
            await this.actions.fill((await this.financial.name.get()).filter({ visible: true }), name, 'Fill expense name');
            if (groupFlag === 'yes') {
                if (newGroupFlag === 'yes') {
                    const head = this.page
                        .locator('div[data-automation-test="auto-select-category-selectHead"]')
                        .filter({ visible: true });
                    await this.actions.click(head.first(), 'Open category dropdown');
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
                        await this.actions.clickOption(existing.first(), `Select existing group "${group}"`);
                    } else {
                        await this.actions.fill(
                            (await this.financial.groupField.get()).filter({ visible: true }),
                            group,
                            'Fill new group field',
                        );
                        await this.financial.newGroup();
                    }
                } else {
                    await this.actions.click(
                        (await this.financial.groupField.get()).filter({ visible: true }),
                        'Open group dropdown',
                    );
                    await this.home.selectFromMenu(group);
                }
            }
        });
    }

    /**
     * Fill a 3-year × 12-month varying table (36 values).
     * Used by the Cost of Expenses varying branch.
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

    /**
     * Fill a 3-year × 12-month varying table plus the last 2 summary years (38 values total).
     * Used by the General Cost and Cost of Revenue varying branches.
     * Legacy: loop i<4, if i<3 fill 12 months, else `fillingLast2Years(values[k], values[k+1])`.
     */
    async fillVaryingTableWith2ExtraYears(type: string, values: string[]): Promise<void> {
        await test.step(`Fill ${type} varying table (3 years × 12 months + 2 summary years)`, async () => {
            let k = 0;
            for (let i = 0; i < this.years.length; i++) {
                for (let j = 0; j < this.months.length; j++) {
                    await this.financial.fillVaryingfield(type, this.years[i], this.months[j], values[k]);
                    k++;
                }
            }
            await this.financial.fillingLast2Years(type, values[k], values[k + 1]);
        });
    }

    // ── Scenario dispatch (branch by input.type) ────────────────────────────────

    /**
     * Dispatch a single data-driven indirect-cost scenario by its `type`, mirroring the
     * legacy per-row branching that lived in the spec body.
     */
    async runIndirectCostScenario(input: IndirectCostScenarioInput): Promise<void> {
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
                growthType:   input.growthType,
                growthPeriod: input.growthPeriod,
                values:       input.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        input.grouping,
                group:           input.group,
                groupRes:        input.groupRes,
                nameOfAttribute: input.attributeName,
                res:             input.res,
                total:           input.total,
                testTitle:       input.test,
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
                total:           input.total,
                testTitle:       input.test,
            });
        } else if (input.type === 'cost of expenses') {
            await this.addCostOfExpenses({
                expense:     input.Expense,
                expenseType: input.ExpenseType,
                cost:        input.cost,
                startYear:   input.startYear,
                startMonth:  input.startMonth,
                endYear:     input.endYear,
                endMonth:    input.endMonth,
                growthOrNot: input.growthOrNot,
                growth:      input.growth,
                growthType:  input.growthType,
                growthPeriod:input.growthPeriod,
                values:      input.Values,
            });
            await this.saveAndVerifyAdd({
                grouping:        input.grouping,
                group:           input.group,
                groupRes:        input.groupRes,
                nameOfAttribute: input.attributeName,
                res:             input.res,
                total:           input.total,
                testTitle:       input.test,
            });
        } else if (input.type === 'edit') {
            await this.editExpense({
                oldName:       input.oldName,
                newName:       input.name,
                attributeName: input.attributeName,
                res:           input.res,
            });
        } else if (input.type === 'duplicate') {
            await this.duplicateExpense({
                oldName:       input.oldName,
                newName:       input.name,
                attributeName: input.attributeName,
                res:           input.res,
            });
        } else if (input.type === 'delete') {
            await this.deleteExpense({
                name:  input.name,
                flag:  input.flag,
            });
        }
    }

    // ── Add cost flows ──────────────────────────────────────────────────────────

    /**
     * Fill the "General Cost" form (constant or varying amounts over time).
     * Legacy: click `genaralCost` → Next → switch on `generalType`.
     */
    async addGeneralCost(o: IndirectGeneralCostOptions): Promise<void> {
        await test.step('Fill General Cost', async () => {
            await this.actions.click(await this.financial.genaralCost.get(), 'Choose General Cost type');
            await this.financial.clickNext();

            if (o.generalType === 'Constant amount (E£)') {
                // ⚠ Branch literal preserved verbatim from legacy source (mojibake currency suffix). Verify against test data.
                await this.actions.fill(
                    (await this.financial.howMuchCost.get()).filter({ visible: true }),
                    o.cost as string,
                    'Fill constant cost amount',
                );
                await this.actions.click(
                    (await this.financial.per.get()).filter({ visible: true }),
                    'Open cost period',
                );
                await this.home.selectFromMenu(o.per);
                await this.actions.click(
                    (await this.financial.startYear.get()).filter({ visible: true }),
                    'Open start year',
                );
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(
                    (await this.financial.startMonth.get()).filter({ visible: true }),
                    'Open start month',
                );
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(
                    (await this.financial.endYear.get()).filter({ visible: true }),
                    'Open end year',
                );
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(
                    (await this.financial.endMonth.get()).filter({ visible: true }),
                    'Open end month',
                );
                await this.home.selectFromMenu(o.endMonth);

                if (o.growthOrNot === 'yes') {
                    await this.actions.click(await this.financial.growthSwitch.get(), 'Toggle growth');
                    await this.actions.fill(await this.financial.growthAmount.get(), o.growth as string, 'Fill growth amount');
                    if (o.growthType === 'number') {
                        await this.actions.click(await this.financial.growthType.get(), 'Switch growth type to number');
                    }
                    await this.actions.click(await this.financial.growthPeriod.get(), 'Open growth period');
                    await this.home.selectFromMenu(o.growthPeriod as string);
                }
            } else if (o.generalType === 'One time amount (E£)') {
                // ⚠ Branch literal preserved verbatim from legacy source. Verify against test data.
                await this.actions.click(
                    (await this.financial.costType.get()).filter({ visible: true }),
                    'Open cost entry-type',
                );
                await this.home.selectFromMenu(o.generalType);
                await this.actions.fill(
                    (await this.financial.howMuchCost.get()).filter({ visible: true }),
                    o.cost as string,
                    'Fill one-time cost amount',
                );
                await this.actions.click(
                    (await this.financial.startYear.get()).filter({ visible: true }),
                    'Open start year',
                );
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(
                    (await this.financial.startMonth.get()).filter({ visible: true }),
                    'Open start month',
                );
                await this.home.selectFromMenu(o.startMonth);
            } else if (o.generalType === 'Varying amounts over time (E£)') {
                // ⚠ Branch literal preserved verbatim from legacy source. Verify against test data.
                await this.actions.click(
                    (await this.financial.costType.get()).filter({ visible: true }),
                    'Open cost entry-type',
                );
                await this.home.selectFromMenu(o.generalType);
                await this.fillVaryingTableWith2ExtraYears('costs', o.values as string[]);
            }
        });
    }

    /**
     * Fill the "Cost of Revenue" form (constant or varying).
     * Legacy: click `ofRevenue` → Next → pick revenue → pick method → constant/varying branch.
     */
    async addCostOfRevenue(o: IndirectCostOfRevenueOptions): Promise<void> {
        await test.step('Fill Cost of Revenue', async () => {
            await this.actions.click(await this.financial.ofRevenue.get(), 'Choose Cost of Revenue type');
            await this.financial.clickNext();
            await this.actions.click(await this.financial.whichRevenue.get(), 'Open which-revenue selector');
            await this.home.selectFromMenu(o.revenue);
            await this.actions.click(await this.financial.costOfExpensesRevenuesType.get(), 'Open revenue method');
            await this.home.selectFromMenu(o.revenueType);

            if (o.revenueType === 'Constant amount' || o.revenueType === 'Constant % of this stream') {
                await this.actions.fill(await this.financial.howMuchCost.get(), o.cost as string, 'Fill constant cost amount');
                await this.actions.click(await this.financial.startYear.get(), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(await this.financial.startMonth.get(), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(await this.financial.endYear.get(), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(await this.financial.endMonth.get(), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.revenueType === 'Constant amount' && o.growthOrNot === 'yes') {
                    await this.actions.click(await this.financial.growthSwitch.get(), 'Toggle growth');
                    await this.actions.fill(await this.financial.growthAmount.get(), o.growth as string, 'Fill growth amount');
                    await this.actions.click(await this.financial.growthPeriod.get(), 'Open growth period');
                    await this.home.selectFromMenu(o.growthPeriod as string);
                }
            } else if (
                o.revenueType === 'Varying amounts over time' ||
                o.revenueType === 'Varying % of this stream'
            ) {
                await this.fillVaryingTableWith2ExtraYears('costs', o.values as string[]);
            }
        });
    }

    /**
     * Fill the "Cost of Expenses" form (constant or varying).
     * Legacy: click `costOfExpenses` → Next → pick expense → pick method → constant/varying branch.
     * NOTE: cost of expenses varying fills only 3×12=36 values (no extra summary years).
     */
    async addCostOfExpenses(o: IndirectCostOfExpensesOptions): Promise<void> {
        await test.step('Fill Cost of Expenses', async () => {
            await this.actions.click(await this.financial.costOfExpenses.get(), 'Choose Cost of Expenses type');
            await this.financial.clickNext();
            await this.actions.click(await this.financial.whichExpenses.get(), 'Open which-expenses selector');
            await this.home.selectFromMenu(o.expense);
            await this.actions.click(await this.financial.costOfExpensesRevenuesType.get(), 'Open expense method');
            await this.home.selectFromMenu(o.expenseType);

            if (o.expenseType === 'Constant amount' || o.expenseType === 'Constant % of this expense') {
                // ⚠ Legacy filled `popUp.howMuchCostRevenues` — undefined at runtime (IndirectCostPopUp was empty).
                // Migrated to the real visible amount input. Verify.
                await this.actions.fill(
                    await this.financial.howMuchCost.get(),
                    o.cost as string,
                    'Fill constant cost amount',
                );
                await this.actions.click(await this.financial.startYear.get(), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(await this.financial.startMonth.get(), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(await this.financial.endYear.get(), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(await this.financial.endMonth.get(), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.growthOrNot === 'yes') {
                    await this.actions.click(await this.financial.growthSwitch.get(), 'Toggle growth');
                    await this.actions.fill(await this.financial.growthAmount.get(), o.growth as string, 'Fill growth amount');
                    if (o.growthType === 'number') {
                        await this.actions.click(await this.financial.growthType.get(), 'Switch growth type to number');
                    }
                    await this.actions.click(await this.financial.growthPeriod.get(), 'Open growth period');
                    await this.home.selectFromMenu(o.growthPeriod as string);
                }
            } else {
                // Varying — only 3×12 cells (no summary years), unlike General Cost / Revenue.
                await this.fillVaryingTable('costs', o.values as string[]);
            }
        });
    }

    // ── Post-save verification for add flows ────────────────────────────────────

    /**
     * Shared post-add sequence: save & close → assert add toast → wait for list → reveal
     * monthly → (optional) open group toggler and assert group row → assert entry row →
     * assert total row.
     * NOTE: no `indirect_costs` toggler or row assertion — preserved 1:1 from the legacy spec.
     */
    async saveAndVerifyAdd(o: IndirectAddVerifyOptions): Promise<void> {
        await test.step('Save expense and verify rendered rows', async () => {
            await this.financial.clickSaveAndClose();
            await this.assert.toBeVisible(await this.addMsg.get(), 'Expenses Added Successfully toast is visible');

            // ⚠ After saving the first scenario the instructions modal re-appears — dismiss it.
            if (o.testTitle === 'Verify user could add one amount indirect cost with specific date ') {
                await this.financial.dismissInstructionsModal();
            }

            await this.actions.waitForVisible(await this.addExpensesBtn.get(), 'Wait for expenses list', 60000);
            await this.page.waitForTimeout(1000);
            await this.financial.clickShowMonthly();

            if (o.grouping === 'yes') {
                await this.financial.openAndCloseToggler(o.group);
                await this.assertRowAcrossPeriods(o.group, o.groupRes);
            }
            await this.assertRowAcrossPeriods(o.nameOfAttribute, o.res);
            await this.assertRowAcrossPeriods('total', o.total);
        });
    }

    // ── Edit / duplicate / delete flows ─────────────────────────────────────────

    /**
     * Discard the open form, then edit an existing expense's name and verify its row.
     * Legacy `type === 'edit'`: close → confirm → openSetting(oldName) → edit(oldName) →
     * rename → (bottom block) save → assert editMsg → show monthly → assert row.
     * NOTE: no `openAndCloseToggler` before `openSetting` — preserved 1:1 from legacy spec.
     */
    async editExpense(o: IndirectEditOptions): Promise<void> {
        await test.step(`Edit expense "${o.oldName}" → "${o.newName}"`, async () => {
            await this.financial.clickClose();
            await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard');
            await this.financial.openSetting(o.oldName);
            await this.financial.edit(o.oldName);
            // Legacy: click name, ctrl+a, delete, typeText → migrated to fill() which clears first.
            await this.actions.fill(
                (await this.financial.name.get()).filter({ visible: true }),
                o.newName,
                'Rename expense',
            );

            await this.financial.clickSaveAndClose();
            await this.assert.toBeVisible(await this.editMsg.get(), 'Expenses Modified Successfully toast is visible');
            await this.actions.waitForVisible(
                (await this.financial.showMonthly.get()).filter({ visible: true }),
                'Wait for show-monthly toolbar',
                60000,
            );
            await this.financial.clickShowMonthly();
            await this.assertRowAcrossPeriods(o.attributeName, o.res);
        });
    }

    /**
     * Discard the open form, then duplicate an existing expense under a new name and verify
     * its row.
     * Legacy `type === 'duplicate'`: close → confirm → openSetting(oldName) → duplicate(oldName)
     * → rename duplicate → confirmDuplicate → wait 1s → show monthly → assert row.
     * NOTE: no `openAndCloseToggler` before `openSetting` — preserved 1:1 from legacy spec.
     */
    async duplicateExpense(o: IndirectDuplicateOptions): Promise<void> {
        await test.step(`Duplicate expense "${o.oldName}" → "${o.newName}"`, async () => {
            await this.financial.clickClose();
            await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard');
            await this.financial.openSetting(o.oldName);
            await this.financial.duplicate(o.oldName);
            await this.financial.fillDuplicatedName(o.newName);
            await this.financial.confirmDuplicate();

            await this.page.waitForTimeout(1000);
            await this.financial.clickShowMonthly();
            await this.assertRowAcrossPeriods(o.attributeName, o.res);
        });
    }

    /**
     * Discard the open form, then delete an existing expense and verify it is gone.
     * Legacy `type === 'delete'`: popUp.closeBtn (undefined — bug) → confirm → openSetting(name)
     * → deleteEntry(name, flag) → assert deleteMsg → assert addExpensesBtn visible → assert
     * row no longer exists.
     * NOTE: `popUp.closeBtn` migrated to `this.financial.clickClose()` (IndirectCostPopUp was empty).
     * NOTE: no `openAndCloseToggler` before `openSetting` — preserved 1:1 from legacy spec.
     */
    async deleteExpense(o: IndirectDeleteOptions): Promise<void> {
        await test.step(`Delete expense "${o.name}"`, async () => {
            await this.financial.clickClose();
            await this.actions.click(await this.financial.confirmBtn.get(), 'Confirm discard');
            await this.financial.openSetting(o.name);
            await this.financial.deleteEntry(o.name, o.flag);

            await this.assert.toBeVisible(await this.deleteMsg.get(), 'Expenses Deleted Successfully toast is visible');
            await this.actions.waitForVisible(
                (await this.addExpensesBtn.get()).filter({ visible: true }),
                'Wait for expenses list',
                60000,
            );

            const titleAttr = `auto-financial-row-${o.name}-title`;
            await this.assert.toBeHidden(
                this.page.locator(`span[data-automation-test="${titleAttr}"]`),
                `Deleted expense "${o.name}" no longer exists`,
            );
        });
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    private async assertRowAcrossPeriods(attr: string, values: string[]): Promise<void> {
        for (let i = 0; i < 42; i++) {
            await this.financial.newChek(attr, this.periodTitles[i], values[i]);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Method option types
// ─────────────────────────────────────────────────────────────────────────────

export interface IndirectCostScenarioInput {
    type: 'GeneralCost' | 'cost of revenues' | 'cost of expenses' | 'edit' | 'duplicate' | 'delete' | string;
    test: string;
    // Navigation
    mail: string;
    password: string;
    company: string;
    forecast: string;
    // Form fields
    name: string;
    oldName: string;
    grouping: string;
    newGroup: string;
    group: string;
    attributeName: string;
    // General Cost
    generalType: string;
    cost: string;
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthType: string;
    growthPeriod: string;
    Values: string[];
    // Cost of Revenue
    revenue: string;
    revenueType: string;
    // Cost of Expenses
    Expense: string;
    ExpenseType: string;
    // Verification
    res: string[];
    groupRes: string[];
    total: string[];
    // Delete
    flag: string;
}

export interface IndirectGeneralCostOptions {
    generalType: string;
    cost: string;
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthType: string;
    growthPeriod: string;
    values: string[];
}

export interface IndirectCostOfRevenueOptions {
    revenue: string;
    revenueType: string;
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

export interface IndirectCostOfExpensesOptions {
    expense: string;
    expenseType: string;
    cost: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthType: string;
    growthPeriod: string;
    values: string[];
}

export interface IndirectAddVerifyOptions {
    grouping: string;
    group: string;
    groupRes: string[];
    nameOfAttribute: string;
    res: string[];
    total: string[];
    testTitle: string;
}

export interface IndirectEditOptions {
    oldName: string;
    newName: string;
    attributeName: string;
    res: string[];
}

export interface IndirectDuplicateOptions {
    oldName: string;
    newName: string;
    attributeName: string;
    res: string[];
}

export interface IndirectDeleteOptions {
    name: string;
    flag: string;
}
