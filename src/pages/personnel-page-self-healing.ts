import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { FinancialDashboardSelfHealing } from './financial-dashboard-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { personnelLocators } from '../locators/personnel-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * PersonnelPageSelfHealing — Page Object for the BznsBuilder "Add / Edit Personnel" flow.
 *
 * Migrated from the legacy TestCafe `Personnel` selector class (`PersonnelPage.js`) plus the
 * `BRD-109_PersonnelTestCases.js` spec, whose per-scenario logic lived in the test body.
 * Covers individual/group personnel, regular/direct labor, optional tax, the four salary-entry
 * methods (constant amount, % of revenue, constant + % of revenue, varying amounts over time),
 * plus the edit, duplicate, and delete flows and the post-save value assertions across the 42
 * rendered period columns.
 *
 * ## Delegation (mirrors DirectCostPageSelfHealing / RevenuesPageSelfHealing)
 * The legacy spec delegated heavily to a shared `Financial` page object (Next/Save/Discard
 * buttons, new group, row settings/edit/duplicate/delete, sub-row togglers, varying-table
 * cells, rendered-row assertions, show monthly) and to the home dashboard for picking an
 * option from an open menu. Those already exist on {@link FinancialDashboardSelfHealing} /
 * {@link HomePageSelfHealing} and target the same DOM, so this page object composes them
 * (`this.financial`, `this.home`) rather than re-wiring duplicates. The personnel pop-up's own
 * fields are wired here from {@link personnelLocators}.
 *
 * ## Faithful-behaviour notes (quirks preserved verbatim)
 *   - `startyear`/`startMonth` (and `endyear`/`endMonth`) resolve to swapped
 *     `…dateMonth…`/`…dateYear…` data-automation-test values in the source — preserved verbatim.
 *   - `whichRevenue` / `RevenuePercntage` carry literal single-quotes baked into the source
 *     data-automation-test string (`"'auto-select-revenueId'-selectHead"`, an apparent authoring
 *     bug) — preserved verbatim. `RevenuePercntage` keeps its misspelled source name.
 *   - The legacy spec re-toggles the `head_count` sub-row on EVERY one of the 42 iterations of
 *     the duplicate/delete verification loop (see {@link assertPersonnelRow7WithToggle}) — an
 *     apparent bug in the original TestCafe spec, preserved verbatim.
 *   - `net_profit_per_employee` is asserted for duplicate/delete but commented out (never
 *     asserted) for add/edit in the legacy spec — preserved verbatim (see
 *     {@link assertPersonnelRow6} vs {@link assertPersonnelRow7WithToggle}).
 *   - `pressKey('ctrl+a')` + `delete` + `typeText` renames are migrated to a single `fill()`
 *     call, since the actions helper's `fill()` already clears the field first.
 *   - The add/employee-group/salary branches all read from the SAME `input.Values` array in the
 *     legacy spec (never a per-branch array) — preserved verbatim via the single `values` field
 *     threaded through {@link addPersonnel}.
 */
export class PersonnelPageSelfHealing extends SelfHealingPageBase {
    // ─── General / Add ────────────────────────────────────────────────────────
    readonly addNew: SelfHealingLocator;
    readonly addEmployeeTaxesAndBenefits: SelfHealingLocator;
    readonly addPersonnelBtn: SelfHealingLocator;

    // ─── Tax ──────────────────────────────────────────────────────────────────
    readonly taxList: SelfHealingLocator;
    readonly newTax: SelfHealingLocator;

    // ─── Individual / Group & Labor type panels ──────────────────────────────
    readonly individual: SelfHealingLocator;
    readonly group: SelfHealingLocator;
    readonly regularLabor: SelfHealingLocator;
    readonly directLabor: SelfHealingLocator;

    // ─── Salary method ────────────────────────────────────────────────────────
    readonly salaryType: SelfHealingLocator;
    readonly constantType: SelfHealingLocator;
    readonly ofRevenueType: SelfHealingLocator;
    readonly bothType: SelfHealingLocator;
    readonly varyingType: SelfHealingLocator;
    readonly howMuchCost: SelfHealingLocator;
    readonly per: SelfHealingLocator;
    readonly annualRaises: SelfHealingLocator;
    readonly startyear: SelfHealingLocator;
    readonly startMonth: SelfHealingLocator;
    readonly endyear: SelfHealingLocator;
    readonly endMonth: SelfHealingLocator;
    readonly whichRevenue: SelfHealingLocator;
    readonly RevenuePercntage: SelfHealingLocator;

    // ─── Group employee count ─────────────────────────────────────────────────
    readonly noOfEmployeesType: SelfHealingLocator;
    readonly noOfEmployees: SelfHealingLocator;
    readonly groupConstant: SelfHealingLocator;
    readonly groupVarying: SelfHealingLocator;

    // ─── Toasts ───────────────────────────────────────────────────────────────
    readonly addMsg: SelfHealingLocator;
    readonly editMsg: SelfHealingLocator;
    readonly deleteMsg: SelfHealingLocator;

    /** Composed shared page objects — provide form chrome, row actions and menu selection. */
    private readonly financial: FinancialDashboardSelfHealing;
    private readonly home: HomePageSelfHealing;

    private readonly page: Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert: AdvancedAssertionsHelper;

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
        this.page = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert = new AdvancedAssertionsHelper(page, testName);
        this.financial = new FinancialDashboardSelfHealing(page, testName, aiProvider);
        this.home = new HomePageSelfHealing(page, testName, aiProvider);

        const logger = Logger.getLogger(`PersonnelPageSelfHealing-${testName}`);
        const L = personnelLocators;
        const make = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        // General / Add
        this.addNew = make(L.addNew);
        this.addEmployeeTaxesAndBenefits = make(L.addEmployeeTaxesAndBenefits);
        this.addPersonnelBtn = make(L.addPersonnelBtn);

        // Tax
        this.taxList = make(L.taxList);
        this.newTax = make(L.newTax);

        // Individual / Group & Labor type panels
        this.individual = make(L.individual);
        this.group = make(L.group);
        this.regularLabor = make(L.regularLabor);
        this.directLabor = make(L.directLabor);

        // Salary method
        this.salaryType = make(L.salaryType);
        this.constantType = make(L.constantType);
        this.ofRevenueType = make(L.ofRevenueType);
        this.bothType = make(L.bothType);
        this.varyingType = make(L.varyingType);
        this.howMuchCost = make(L.howMuchCost);
        this.per = make(L.per);
        this.annualRaises = make(L.annualRaises);
        this.startyear = make(L.startyear);
        this.startMonth = make(L.startMonth);
        this.endyear = make(L.endyear);
        this.endMonth = make(L.endMonth);
        this.whichRevenue = make(L.whichRevenue);
        this.RevenuePercntage = make(L.RevenuePercntage);

        // Group employee count
        this.noOfEmployeesType = make(L.noOfEmployeesType);
        this.noOfEmployees = make(L.noOfEmployees);
        this.groupConstant = make(L.groupConstant);
        this.groupVarying = make(L.groupVarying);

        // Toasts
        this.addMsg = make(L.addMsg);
        this.editMsg = make(L.editMsg);
        this.deleteMsg = make(L.deleteMsg);
    }

    // ── Instructions modal ──────────────────────────────────────────────────────

    /**
     * Dismiss the Financial Tables instructions modal — legacy only dismissed it for the one
     * scenario titled "User could add individual regular labor % of revenue personnel".
     * Legacy: `if (input.test === '...') { expect(closeInstructionsModal.visible).ok(); click(closeInstructionsModal) }`.
     */
    async checkTheInstructionsModal(testName: string): Promise<void> {
        if (testName === 'User could add individual regular labor % of revenue personnel') {
            await this.financial.dismissInstructionsModal();
        }
    }

    /**
     * Wait for the Personnel chapter's Add button to render — legacy performed this single wait
     * once, before branching into edit/duplicate/delete/add, so it applies to every scenario.
     * Legacy: `.expect(page.addNew.visible).ok({timeout:60000})`.
     */
    async waitForPersonnelListLoaded(): Promise<void> {
        await this.actions.waitForVisible((await this.addNew.get()).filter({ visible: true }), 'Wait for Personnel Add button', 60000);
    }

    // ── Open the add-personnel form ─────────────────────────────────────────────

    /**
     * Open the add-personnel form (two-step add: the "Add" button reveals the "Add Personnel"
     * option). Legacy: `.click(page.addNew).click(page.addPersonnelBtn)`.
     */
    async openAddPersonnelForm(): Promise<void> {
        await test.step('Open add-personnel form', async () => {
            await this.actions.click((await this.addNew.get()).filter({ visible: true }), 'Click Add button', true);
            await this.actions.click(await this.addPersonnelBtn.get(), 'Click Add Personnel option');
        });
    }

    // ── Shared form helpers ─────────────────────────────────────────────────────

    /**
     * Fill the personnel name and, when `groupFlag === 'yes'`, set the category/group — either
     * creating a new one (`newGroupFlag === 'yes'`) or picking an existing one.
     * Legacy: type name → (optional) type new group + `newGroup()` OR open group + select.
     */
    async fillNameAndGroupFields(
        name: string,
        groupFlag: string,
        newGroupFlag: string,
        group: string,
    ): Promise<void> {
        await test.step(`Fill personnel name "${name}"${groupFlag === 'yes' ? ` and group "${group}"` : ''}`, async () => {
            await this.actions.fill((await this.financial.name.get()).filter({ visible: true }), name, 'Fill personnel name');
            if (groupFlag === 'yes') {
                if (newGroupFlag === 'yes') {
                    await this.actions.fill((await this.financial.groupField.get()).filter({ visible: true }), group, 'Fill new group field');
                    await this.financial.newGroup();
                } else {
                    await this.actions.click((await this.financial.groupField.get()).filter({ visible: true }), 'Open group dropdown');
                    await this.home.selectFromMenu(group);
                }
            }
        });
    }

    /**
     * Select a tax from the tax dropdown. Legacy: `.click(page.taxList)` → `financial.selectFromMenu(tax)`.
     */
    async fillTaxField(tax: string): Promise<void> {
        await test.step(`Select tax "${tax}"`, async () => {
            await this.actions.click(await this.taxList.get(), 'Open tax dropdown');
            await this.home.selectFromMenu(tax);
        });
    }

    /**
     * Choose the "Direct" labor type. Legacy: `.click(page.directLabor)`.
     */
    async chooseDirectLabor(): Promise<void> {
        await test.step('Choose Direct labor type', async () => {
            await this.actions.click(await this.directLabor.get(), 'Click Direct labor type');
        });
    }

    /**
     * Fill a 3-year × 12-month varying table plus the last 2 summary years (38 values total).
     * Used by the group employee-count varying branch and the varying salary branch.
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

    /**
     * Fill the number-of-employees fields for a group personnel entry (constant amount, or
     * varying amounts over time via {@link fillVaryingTableWith2ExtraYears}).
     * Legacy: click `group` → Next → click `noOfEmployeesType` → constant/varying branch.
     */
    async fillEmployeeGroupFields(o: EmployeeGroupOptions): Promise<void> {
        await test.step('Fill employee-group fields', async () => {
            await this.actions.click(await this.group.get(), 'Choose Group personnel type');
            await this.financial.clickNext();
            await this.actions.click(await this.noOfEmployeesType.get(), 'Open number-of-employees entry-type dropdown');

            if (o.numberOfEmployeesType === 'Constant amount') {
                await this.actions.click(await this.groupConstant.get(), 'Choose constant number of employees');
                await this.actions.fill(await this.noOfEmployees.get(), o.numberOfEmployees as string, 'Fill number of employees');
            } else {
                await this.actions.click(await this.groupVarying.get(), 'Choose varying number of employees');
                await this.fillVaryingTableWith2ExtraYears('employeeCount', o.values as string[]);
            }
        });
    }

    /**
     * Fill the salary-method form for one of the four entry methods.
     * Legacy: Next → open `salaryType` → switch on `howEnterSalary`.
     */
    async fillSalaryMethod(o: SalaryMethodOptions): Promise<void> {
        await test.step(`Fill salary method "${o.howEnterSalary}"`, async () => {
            await this.financial.clickNext();
            await this.actions.click((await this.salaryType.get()).filter({ visible: true }), 'Open salary-method dropdown');

            if (o.howEnterSalary === 'Constant amount') {
                await this.actions.click(await this.constantType.get(), 'Choose Constant amount salary method');
                await this.actions.fill(await this.howMuchCost.get(), o.cost as string, 'Fill constant salary amount');
                await this.actions.click(await this.per.get(), 'Open salary period dropdown');
                await this.home.selectFromMenu(o.per as string);
                await this.actions.fill(await this.annualRaises.get(), o.annualRaises as string, 'Fill annual raises');

                // Legacy: the date-range fields are skipped when the employee-group count is varying.
                if (!(o.employeeGroup === 'yes' && o.numberOfEmployeesType === 'varying')) {
                    await this.actions.click(await this.startyear.get(), 'Open start year dropdown');
                    await this.home.selectFromMenu(o.startYear as string);
                    await this.actions.click(await this.startMonth.get(), 'Open start month dropdown');
                    await this.home.selectFromMenu(o.startMonth as string);
                    await this.actions.click(await this.endyear.get(), 'Open end year dropdown');
                    await this.home.selectFromMenu(o.endYear as string);
                    await this.actions.click(await this.endMonth.get(), 'Open end month dropdown');
                    await this.home.selectFromMenu(o.endMonth as string);
                }
            } else if (o.howEnterSalary === '% of revenue') {
                await this.actions.click(await this.ofRevenueType.get(), 'Choose % of revenue salary method');
                await this.actions.click(await this.whichRevenue.get(), 'Open which-revenue dropdown');
                await this.home.selectFromMenu(o.revenue as string);
                await this.actions.fill(await this.RevenuePercntage.get(), o.percentage as string, 'Fill revenue percentage');
            } else if (o.howEnterSalary === 'Constant + % of revenue') {
                await this.actions.click(await this.bothType.get(), 'Choose Constant + % of revenue salary method');
                await this.actions.fill(await this.howMuchCost.get(), o.cost as string, 'Fill constant salary amount');
                await this.actions.click(await this.per.get(), 'Open salary period dropdown');
                await this.home.selectFromMenu(o.per as string);
                await this.actions.click(await this.startyear.get(), 'Open start year dropdown');
                await this.home.selectFromMenu(o.startYear as string);
                await this.actions.click(await this.startMonth.get(), 'Open start month dropdown');
                await this.home.selectFromMenu(o.startMonth as string);
                await this.actions.click(await this.endyear.get(), 'Open end year dropdown');
                await this.home.selectFromMenu(o.endYear as string);
                await this.actions.click(await this.endMonth.get(), 'Open end month dropdown');
                await this.home.selectFromMenu(o.endMonth as string);
                await this.actions.fill(await this.annualRaises.get(), o.annualRaises as string, 'Fill annual raises');
                await this.actions.click(await this.whichRevenue.get(), 'Open which-revenue dropdown');
                await this.home.selectFromMenu(o.revenue as string);
                await this.actions.fill(await this.RevenuePercntage.get(), o.percentage as string, 'Fill revenue percentage');
            } else {
                await this.actions.click(await this.varyingType.get(), 'Choose Varying amounts over time salary method');
                await this.fillVaryingTableWith2ExtraYears('salary', o.values as string[]);
            }
        });
    }

    // ── Post-save verification for the add flow ─────────────────────────────────

    /**
     * The shared post-add sequence: save & close, assert the success toast, reveal monthly
     * columns, open the labor-type toggler, optionally assert the group row, open the
     * head_count toggler, then assert the entry / head_count / average_salary /
     * revenue_per_employee / labor / total rows across all 42 period columns.
     * Legacy `else` branch tail (after the salary-method fill).
     */
    async saveAndVerifyAdd(o: AddVerifyOptions): Promise<void> {
        await test.step('Save personnel and verify rendered rows', async () => {
            // The success toast is short-lived and can disappear before a *sequential*
            // click → get() → toBeVisible() chain gets around to checking it (click()'s own
            // helper overhead plus the self-healing probe phases can together take longer
            // than the toast stays on screen). Race the visibility wait against the click
            // itself — using the raw primary locator (`.locator`, no probe delay) — so
            // polling starts at the same moment the click fires instead of after it settles.
            await Promise.all([
                this.assert.toBeVisible(this.addMsg.locator, 'Personnel Added Successfully toast is visible'),
                this.financial.clickSaveAndClose(),
            ]);
            await this.financial.clickShowMonthly();

            await this.financial.openAndCloseToggler(o.laborToggler);
            if (o.grouping === 'yes') {
                await this.financial.openAndCloseToggler(o.group);
            }
            await this.financial.openAndCloseToggler('head_count');

            await this.assertPersonnelRow6(o.attributeName, o.laborName, o.res, o.headCount, o.avgSalary, o.revPerEmployee, o.laborRes, o.total);
        });
    }

    // ── Scenario dispatch (branch by input.type) ────────────────────────────────

    /**
     * Dispatch a single data-driven personnel scenario by its `type`, mirroring the legacy
     * per-row branching that used to live in the spec body. The default (no explicit `type`)
     * branch runs the full add flow; `edit`/`duplicate`/`delete` run their own
     * maintenance-and-verify flow.
     */
    async runPersonnelScenario(input: PersonnelScenarioInput): Promise<void> {
        if (input.type === 'edit') {
            await this.editPersonnelEntry({
                attributeOldName: input.attributeOldName,
                name: input.name,
                laborToggler: input.laborToggler,
                attributeName: input.attributeName,
                laborName: input.laborName,
                res: input.res,
                headCount: input.headCount,
                avgSalary: input.avgSalary,
                revPerEmployee: input.revPerEmployee,
                laborRes: input.laborRes,
                total: input.Total,
            });
        } else if (input.type === 'duplicate') {
            await this.duplicatePersonnelEntry({
                oldName: input.oldName,
                name: input.name,
                attributeName: input.attributeName,
                laborName: input.laborName,
                res: input.res,
                headCount: input.headCount,
                avgSalary: input.avgSalary,
                revPerEmployee: input.revPerEmployee,
                netPerEmployee: input.netPerEmployee,
                laborRes: input.laborRes,
                total: input.Total,
            });
        } else if (input.type === 'delete') {
            await this.deletePersonnelEntry({
                name: input.name,
                flag: input.flag,
                attributeName: input.attributeName,
                laborName: input.laborName,
                res: input.res,
                headCount: input.headCount,
                avgSalary: input.avgSalary,
                revPerEmployee: input.revPerEmployee,
                netPerEmployee: input.netPerEmployee,
                laborRes: input.laborRes,
                total: input.Total,
            });
        } else {
            await this.addPersonnel({
                name: input.name,
                grouping: input.grouping,
                newGroup: input.newGroup,
                group: input.group,
                includeTax: input.includeTax,
                tax: input.tax,
                labor: input.labor,
                employeeGroup: input.employeeGroup,
                numberOfEmployeesType: input.numberOfEmployeesType,
                numberOfEmployees: input.numberOfEmployees,
                howEnterSalary: input.howEnterSalary,
                cost: input.cost,
                per: input.per,
                annualRaises: input.annualRaises,
                startYear: input.startYear,
                startMonth: input.startMonth,
                endYear: input.endYear,
                endMonth: input.endMonth,
                revenue: input.revenue,
                percentage: input.percentage,
                values: input.Values,
                laborToggler: input.laborToggler,
                attributeName: input.attributeName,
                laborName: input.laborName,
                res: input.res,
                headCount: input.headCount,
                avgSalary: input.avgSalary,
                revPerEmployee: input.revPerEmployee,
                laborRes: input.laborRes,
                total: input.Total,
            });
        }
    }

    // ── Add flow ─────────────────────────────────────────────────────────────────

    /**
     * The full "add personnel" flow (legacy `else` branch): open form → fill name/group →
     * (optional) tax → (optional) direct labor → (optional) employee-group → salary method →
     * save & verify.
     */
    async addPersonnel(o: AddPersonnelOptions): Promise<void> {
        await test.step(`Add personnel "${o.name}"`, async () => {
            await this.openAddPersonnelForm();
            await this.fillNameAndGroupFields(o.name, o.grouping, o.newGroup, o.group);

            if (o.includeTax === 'yes') {
                await this.fillTaxField(o.tax as string);
            }
            if (o.labor === 'direct') {
                await this.chooseDirectLabor();
            }
            if (o.employeeGroup === 'yes') {
                await this.fillEmployeeGroupFields({
                    numberOfEmployeesType: o.numberOfEmployeesType,
                    numberOfEmployees: o.numberOfEmployees,
                    values: o.values,
                });
            }

            await this.fillSalaryMethod({
                howEnterSalary: o.howEnterSalary,
                cost: o.cost,
                per: o.per,
                annualRaises: o.annualRaises,
                employeeGroup: o.employeeGroup,
                numberOfEmployeesType: o.numberOfEmployeesType,
                startYear: o.startYear,
                startMonth: o.startMonth,
                endYear: o.endYear,
                endMonth: o.endMonth,
                revenue: o.revenue,
                percentage: o.percentage,
                values: o.values,
            });

            await this.saveAndVerifyAdd({
                laborToggler: o.laborToggler,
                grouping: o.grouping,
                group: o.group,
                attributeName: o.attributeName,
                laborName: o.laborName,
                res: o.res,
                headCount: o.headCount,
                avgSalary: o.avgSalary,
                revPerEmployee: o.revPerEmployee,
                laborRes: o.laborRes,
                total: o.total,
            });
        });
    }

    // ── Edit / duplicate / delete flows ─────────────────────────────────────────

    /**
     * Toggle open the labor-type row, edit an existing personnel entry's name, save, and verify
     * its rows. Legacy `type === 'edit'`: toggle laborToggler → openSetting → edit → rename →
     * Save & Close → assert editMsg → show monthly → toggle head_count → assert rows.
     */
    async editPersonnelEntry(o: EditOptions): Promise<void> {
        await test.step(`Edit personnel "${o.attributeOldName}" → "${o.name}"`, async () => {
            await this.financial.openAndCloseToggler(o.laborToggler);
            await this.financial.openSetting(o.attributeOldName);
            await this.financial.edit(o.attributeOldName);
            await this.actions.fill((await this.financial.name.get()).filter({ visible: true }), o.name, 'Rename personnel entry');

            await this.financial.clickSaveAndClose();
            await this.assert.toBeVisible(await this.editMsg.get(), 'Personnel Modified Successfully toast is visible');
            await this.actions.waitForVisible((await this.financial.showMonthly.get()).filter({ visible: true }), 'Wait for show-monthly toolbar', 60000);
            await this.financial.clickShowMonthly();

            await this.financial.openAndCloseToggler('head_count');
            await this.assertPersonnelRow6(o.attributeName, o.laborName, o.res, o.headCount, o.avgSalary, o.revPerEmployee, o.laborRes, o.total);
        });
    }

    /**
     * Duplicate an existing personnel entry under a new name and verify its rows.
     * Legacy `type === 'duplicate'`: openSetting → duplicate → rename duplicate → confirm →
     * wait → show monthly → assert rows (with the per-iteration head_count toggle quirk).
     */
    async duplicatePersonnelEntry(o: DuplicateOptions): Promise<void> {
        await test.step(`Duplicate personnel "${o.oldName}" → "${o.name}"`, async () => {
            await this.financial.openSetting(o.oldName);
            await this.financial.duplicate(o.oldName);
            await this.financial.fillDuplicatedName(o.name);
            await this.financial.confirmDuplicate();

            await this.page.waitForTimeout(1000);
            await this.financial.clickShowMonthly();
            await this.assertPersonnelRow7WithToggle(o.attributeName, o.laborName, o.res, o.headCount, o.avgSalary, o.revPerEmployee, o.netPerEmployee, o.laborRes, o.total);
        });
    }

    /**
     * Delete an existing personnel entry and verify it is gone and the remaining rows
     * recalculate. Legacy `type === 'delete'`: openSetting → deleteEntry → assert deleteMsg →
     * assert the row no longer exists → show monthly → assert rows (with the per-iteration
     * head_count toggle quirk).
     */
    async deletePersonnelEntry(o: DeleteOptions): Promise<void> {
        await test.step(`Delete personnel "${o.name}"`, async () => {
            await this.financial.openSetting(o.name);
            await this.financial.deleteEntry(o.name, o.flag);

            await this.assert.toBeVisible(await this.deleteMsg.get(), 'Personnel deleted successfully! toast is visible');
            await this.actions.waitForVisible((await this.addNew.get()).filter({ visible: true }), 'Wait for Personnel list', 60000);

            const titleAttr = `auto-financial-row-${o.name}-title`;
            await this.assert.toBeHidden(
                this.page.locator(`span[data-automation-test="${titleAttr}"]`),
                `Deleted personnel entry "${o.name}" no longer exists`,
            );

            await this.financial.clickShowMonthly();
            await this.assertPersonnelRow7WithToggle(o.attributeName, o.laborName, o.res, o.headCount, o.avgSalary, o.revPerEmployee, o.netPerEmployee, o.laborRes, o.total);
        });
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    /**
     * Assert a rendered personnel row's entry/head_count/average_salary/revenue_per_employee/
     * labor/total values in every one of the 42 period columns (add + edit flows).
     * `net_profit_per_employee` is commented out in the legacy source for these two flows —
     * preserved verbatim by omission.
     */
    private async assertPersonnelRow6(
        attributeName: string,
        laborName: string,
        res: string[],
        headCount: string[],
        avgSalary: string[],
        revPerEmployee: string[],
        laborRes: string[],
        total: string[],
    ): Promise<void> {
        for (let i = 0; i < 42; i++) {
            await this.financial.newChek(attributeName, this.periodTitles[i], res[i]);
            await this.financial.newChek('head_count', this.periodTitles[i], headCount[i]);
            await this.financial.newChek('average_salary', this.periodTitles[i], avgSalary[i]);
            await this.financial.newChek('revenue_per_employee', this.periodTitles[i], revPerEmployee[i]);
            await this.financial.newChek(laborName, this.periodTitles[i], laborRes[i]);
            await this.financial.newChek('total', this.periodTitles[i], total[i]);
        }
    }

    /**
     * Assert a rendered personnel row across all 42 period columns for the duplicate/delete
     * flows, including `net_profit_per_employee`. NOTE: re-opens/closes the `head_count`
     * toggler on every one of the 42 iterations — an apparent bug in the legacy TestCafe spec,
     * preserved verbatim.
     */
    private async assertPersonnelRow7WithToggle(
        attributeName: string,
        laborName: string,
        res: string[],
        headCount: string[],
        avgSalary: string[],
        revPerEmployee: string[],
        netPerEmployee: string[],
        laborRes: string[],
        total: string[],
    ): Promise<void> {
        for (let i = 0; i < 42; i++) {
            await this.financial.newChek(attributeName, this.periodTitles[i], res[i]);
            await this.financial.openAndCloseToggler('head_count');
            await this.financial.newChek('head_count', this.periodTitles[i], headCount[i]);
            await this.financial.newChek('average_salary', this.periodTitles[i], avgSalary[i]);
            await this.financial.newChek('revenue_per_employee', this.periodTitles[i], revPerEmployee[i]);
            await this.financial.newChek('net_profit_per_employee', this.periodTitles[i], netPerEmployee[i]);
            await this.financial.newChek(laborName, this.periodTitles[i], laborRes[i]);
            await this.financial.newChek('total', this.periodTitles[i], total[i]);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Method option types (replace the legacy positional / input-row fields)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single data-driven scenario row from `test-data/PersonnelInputs.json`, consumed by
 * {@link PersonnelPageSelfHealing.runPersonnelScenario}. Loosely typed because the JSON is
 * data, not a contract — `type` selects which branch (and thus which fields) apply.
 */
export interface PersonnelScenarioInput {
    test: string;
    type: 'edit' | 'duplicate' | 'delete' | string;
    // Add fields
    name: string;
    grouping: string;
    newGroup: string;
    group: string;
    includeTax: string;
    tax: string;
    labor: string;
    employeeGroup: string;
    numberOfEmployeesType: string;
    numberOfEmployees: string;
    howEnterSalary: string;
    cost: string;
    per: string;
    annualRaises: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    revenue: string;
    percentage: string;
    /** Shared varying-table source for both the employee-group and salary varying branches. */
    Values: string[];
    // Verification (add / edit / duplicate / delete)
    laborToggler: string;
    attributeName: string;
    laborName: string;
    res: string[];
    headCount: string[];
    avgSalary: string[];
    revPerEmployee: string[];
    netPerEmployee: string[];
    laborRes: string[];
    Total: string[];
    // Edit
    attributeOldName: string;
    // Duplicate / delete
    oldName: string;
    flag: string;
}

/** Options for {@link PersonnelPageSelfHealing.fillEmployeeGroupFields}. */
export interface EmployeeGroupOptions {
    numberOfEmployeesType: 'Constant amount' | string;
    numberOfEmployees: string;
    /** The 38-cell shared `Values` array for the varying branch. */
    values: string[];
}

/** Options for {@link PersonnelPageSelfHealing.fillSalaryMethod}. */
export interface SalaryMethodOptions {
    howEnterSalary:
        | 'Constant amount'
        | '% of revenue'
        | 'Constant + % of revenue'
        | string;
    cost: string;
    per: string;
    annualRaises: string;
    employeeGroup: string;
    numberOfEmployeesType: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    revenue: string;
    percentage: string;
    /** The 38-cell shared `Values` array for the varying branch. */
    values: string[];
}

/** Options for {@link PersonnelPageSelfHealing.saveAndVerifyAdd}. */
export interface AddVerifyOptions {
    laborToggler: string;
    grouping: string;
    group: string;
    attributeName: string;
    laborName: string;
    /** 42 expected values for the entry row. */
    res: string[];
    /** 42 expected values for the head_count row. */
    headCount: string[];
    /** 42 expected values for the average_salary row. */
    avgSalary: string[];
    /** 42 expected values for the revenue_per_employee row. */
    revPerEmployee: string[];
    /** 42 expected values for the labor row (`laborName`). */
    laborRes: string[];
    /** 42 expected values for the total row. */
    total: string[];
}

/** Options for {@link PersonnelPageSelfHealing.addPersonnel}. */
export interface AddPersonnelOptions {
    name: string;
    grouping: string;
    newGroup: string;
    group: string;
    includeTax: string;
    tax: string;
    labor: string;
    employeeGroup: string;
    numberOfEmployeesType: string;
    numberOfEmployees: string;
    howEnterSalary: string;
    cost: string;
    per: string;
    annualRaises: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    revenue: string;
    percentage: string;
    values: string[];
    laborToggler: string;
    attributeName: string;
    laborName: string;
    res: string[];
    headCount: string[];
    avgSalary: string[];
    revPerEmployee: string[];
    laborRes: string[];
    total: string[];
}

/** Options for {@link PersonnelPageSelfHealing.editPersonnelEntry}. */
export interface EditOptions {
    attributeOldName: string;
    name: string;
    laborToggler: string;
    attributeName: string;
    laborName: string;
    res: string[];
    headCount: string[];
    avgSalary: string[];
    revPerEmployee: string[];
    laborRes: string[];
    total: string[];
}

/** Options for {@link PersonnelPageSelfHealing.duplicatePersonnelEntry}. */
export interface DuplicateOptions {
    oldName: string;
    name: string;
    attributeName: string;
    laborName: string;
    res: string[];
    headCount: string[];
    avgSalary: string[];
    revPerEmployee: string[];
    netPerEmployee: string[];
    laborRes: string[];
    total: string[];
}

/** Options for {@link PersonnelPageSelfHealing.deletePersonnelEntry}. */
export interface DeleteOptions {
    name: string;
    flag: string;
    attributeName: string;
    laborName: string;
    res: string[];
    headCount: string[];
    avgSalary: string[];
    revPerEmployee: string[];
    netPerEmployee: string[];
    laborRes: string[];
    total: string[];
}
