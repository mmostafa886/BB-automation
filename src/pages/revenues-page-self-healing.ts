import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { FinancialDashboardSelfHealing } from './financial-dashboard-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { revenuesLocators } from '../locators/revenues-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * RevenuesPageSelfHealing — Page Object for the BznsBuilder "Add / Edit Revenue" flow.
 *
 * Migrated from the legacy TestCafe `RevenuePage` page object (`page.js`). Covers all four
 * revenue types exercised by the legacy suite — Unit Sales, Billable Hours, Recurring
 * Charges, and Fixed (Revenue Only) — plus duplicate and edit flows and the post-save
 * value assertions across the 42 rendered period columns.
 *
 * ## Delegation
 * The legacy class delegated heavily to a shared `Financial` page object for generic
 * helpers (open a menu option, fill a varying-table cell, assert a rendered row, open
 * row settings, edit/duplicate a row, toggle sub-rows, show monthly columns) AND for the
 * shared form chrome (name input, Next/Save/Discard buttons, the close-confirm dialog).
 * Those all already exist on {@link FinancialDashboardSelfHealing} and target the very
 * same DOM elements (`auto-input-name`, `auto-button-formNext`, `auto-button-formSaveOnly`,
 * `auto-button-formDiscard`, the "Confirm" text button), so this page object composes one
 * internally (`this.financial`) and delegates to it rather than re-wiring duplicates.
 *
 * ## Faithful-behaviour notes (legacy bugs fixed during migration)
 *   - `fillNameAndGroupFields` referenced an undefined `input.groupName` → uses the
 *     `groupName` argument.
 *   - `edit` asserted against an undefined `input.res[i]` → uses `res[i]`.
 *   - `addRecurringChargesRevenue` declared `typeOfClients` twice and used `startMonth`/
 *     `startYear` that were never parameters → consolidated into a single typed options
 *     object with explicit `startMonth` / `startYear`.
 *   - The very long positional parameter lists are expressed as typed options objects.
 *   - Rename steps used `pressKey('ctrl+a')` + `pressKey('delete')` + `typeText`; the
 *     actions helper's `fill()` already clears the field, so a single `fill()` is used.
 *   - Currency-suffixed branch literals (e.g. `"… (EÂ£)"`) are preserved verbatim from the
 *     source so branching still matches the existing test-data JSON. ⚠ Verify the exact
 *     strings against `RevenuesInputs.json` / the live app.
 */
export class RevenuesPageSelfHealing extends SelfHealingPageBase {
    // ─── Shared form ─────────────────────────────────────────────────────────
    readonly groupField:  SelfHealingLocator;
    readonly addMsg:      SelfHealingLocator;
    readonly editMsg:     SelfHealingLocator;

    // ─── Revenue-type panels ─────────────────────────────────────────────────
    readonly billableHours:    SelfHealingLocator;
    readonly recurringCharges: SelfHealingLocator;
    readonly fixedRev:         SelfHealingLocator;

    // ─── Unit Sales / Billable Hours — units & period ────────────────────────
    readonly numberOfUnitsOrHours:     SelfHealingLocator;
    readonly unitsOrHoursPeriod:       SelfHealingLocator;
    readonly unitsOrClientsType:       SelfHealingLocator;
    readonly unitOrHourStartYear:      SelfHealingLocator;
    readonly unitOrHourStartMonth:     SelfHealingLocator;
    readonly unitOrHourEndYear:        SelfHealingLocator;
    readonly unitOrHourEndMonth:       SelfHealingLocator;
    readonly unitsAndHoursGrowthSwitch: SelfHealingLocator;
    readonly unitAndHoursGrowth:       SelfHealingLocator;
    readonly unitAndHoursGrowthType:   SelfHealingLocator;
    readonly unitAndHoursGrowthPeriod: SelfHealingLocator;

    // ─── Unit Sales — price ──────────────────────────────────────────────────
    readonly unitsPrice:       SelfHealingLocator;
    readonly priceType:        SelfHealingLocator;
    readonly priceGrowthSwitch: SelfHealingLocator;
    readonly priceGrowth:      SelfHealingLocator;
    readonly priceGrowthType:  SelfHealingLocator;
    readonly priceGrowthPeriod: SelfHealingLocator;

    // ─── Billable Hours — rate ───────────────────────────────────────────────
    readonly hoursType:       SelfHealingLocator;
    readonly rateType:        SelfHealingLocator;
    readonly priceOfEachHour: SelfHealingLocator;

    // ─── Recurring Charges ───────────────────────────────────────────────────
    readonly recStartMonth:        SelfHealingLocator;
    readonly recStartYear:         SelfHealingLocator;
    readonly numberOfClients:      SelfHealingLocator;
    readonly typeOfClients:        SelfHealingLocator;
    readonly chargeType:           SelfHealingLocator;
    readonly howMuchRecurringCharges: SelfHealingLocator;
    readonly chargePeriod:         SelfHealingLocator;
    readonly upFrontType:          SelfHealingLocator;
    readonly upfrontAmount:        SelfHealingLocator;
    readonly churnRateType:        SelfHealingLocator;
    readonly churnRate:            SelfHealingLocator;
    readonly SignupsGrowthSwitch:  SelfHealingLocator;
    readonly SignupsGrowth:        SelfHealingLocator;
    readonly SignupsGrowthPeriod:  SelfHealingLocator;
    readonly upfrontGrowthSwitch:  SelfHealingLocator;
    readonly upfrontGrowth:        SelfHealingLocator;
    readonly upfrontGrowthPeriod:  SelfHealingLocator;

    // ─── Fixed (Revenue Only) ────────────────────────────────────────────────
    readonly fixedType:        SelfHealingLocator;
    readonly amountOfmoney:    SelfHealingLocator;
    readonly fixedPeriod:      SelfHealingLocator;
    readonly fixedStartYear:   SelfHealingLocator;
    readonly fixedStartMonth:  SelfHealingLocator;
    readonly fixedEndYear:     SelfHealingLocator;
    readonly fixedEndMonth:    SelfHealingLocator;
    readonly fixedGrowthSwitch: SelfHealingLocator;
    readonly fixedGrowth:      SelfHealingLocator;
    readonly fixedGrowthPeriod: SelfHealingLocator;

    // ─── Revenues list ───────────────────────────────────────────────────────
    readonly addRevenuesBtn: SelfHealingLocator;

    /** Composed financial-dashboard page object — provides the shared helpers and form chrome. */
    private readonly financial: FinancialDashboardSelfHealing;
    private readonly home: HomePageSelfHealing;

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
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);
        this.financial = new FinancialDashboardSelfHealing(page, testName, aiProvider);
        this.home= new HomePageSelfHealing(page,testName,aiProvider);

        const logger = Logger.getLogger(`RevenuesPageSelfHealing-${testName}`);
        const L      = revenuesLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        // Shared form
        this.groupField = make(L.groupField);
        this.addMsg     = make(L.addMsg);
        this.editMsg    = make(L.editMsg);

        // Revenue-type panels
        this.billableHours    = make(L.billableHours);
        this.recurringCharges = make(L.recurringCharges);
        this.fixedRev         = make(L.fixedRev);

        // Unit Sales / Billable Hours — units & period
        this.numberOfUnitsOrHours      = make(L.numberOfUnitsOrHours);
        this.unitsOrHoursPeriod        = make(L.unitsOrHoursPeriod);
        this.unitsOrClientsType        = make(L.unitsOrClientsType);
        this.unitOrHourStartYear       = make(L.unitOrHourStartYear);
        this.unitOrHourStartMonth      = make(L.unitOrHourStartMonth);
        this.unitOrHourEndYear         = make(L.unitOrHourEndYear);
        this.unitOrHourEndMonth        = make(L.unitOrHourEndMonth);
        this.unitsAndHoursGrowthSwitch = make(L.unitsAndHoursGrowthSwitch);
        this.unitAndHoursGrowth        = make(L.unitAndHoursGrowth);
        this.unitAndHoursGrowthType    = make(L.unitAndHoursGrowthType);
        this.unitAndHoursGrowthPeriod  = make(L.unitAndHoursGrowthPeriod);

        // Unit Sales — price
        this.unitsPrice        = make(L.unitsPrice);
        this.priceType         = make(L.priceType);
        this.priceGrowthSwitch = make(L.priceGrowthSwitch);
        this.priceGrowth       = make(L.priceGrowth);
        this.priceGrowthType   = make(L.priceGrowthType);
        this.priceGrowthPeriod = make(L.priceGrowthPeriod);

        // Billable Hours — rate
        this.hoursType       = make(L.hoursType);
        this.rateType        = make(L.rateType);
        this.priceOfEachHour = make(L.priceOfEachHour);

        // Recurring Charges
        this.recStartMonth          = make(L.recStartMonth);
        this.recStartYear           = make(L.recStartYear);
        this.numberOfClients        = make(L.numberOfClients);
        this.typeOfClients          = make(L.typeOfClients);
        this.chargeType             = make(L.chargeType);
        this.howMuchRecurringCharges = make(L.howMuchRecurringCharges);
        this.chargePeriod           = make(L.chargePeriod);
        this.upFrontType            = make(L.upFrontType);
        this.upfrontAmount          = make(L.upfrontAmount);
        this.churnRateType          = make(L.churnRateType);
        this.churnRate              = make(L.churnRate);
        this.SignupsGrowthSwitch    = make(L.SignupsGrowthSwitch);
        this.SignupsGrowth          = make(L.SignupsGrowth);
        this.SignupsGrowthPeriod    = make(L.SignupsGrowthPeriod);
        this.upfrontGrowthSwitch    = make(L.upfrontGrowthSwitch);
        this.upfrontGrowth          = make(L.upfrontGrowth);
        this.upfrontGrowthPeriod    = make(L.upfrontGrowthPeriod);

        // Fixed (Revenue Only)
        this.fixedType        = make(L.fixedType);
        this.amountOfmoney    = make(L.amountOfmoney);
        this.fixedPeriod      = make(L.fixedPeriod);
        this.fixedStartYear   = make(L.fixedStartYear);
        this.fixedStartMonth  = make(L.fixedStartMonth);
        this.fixedEndYear     = make(L.fixedEndYear);
        this.fixedEndMonth    = make(L.fixedEndMonth);
        this.fixedGrowthSwitch = make(L.fixedGrowthSwitch);
        this.fixedGrowth      = make(L.fixedGrowth);
        this.fixedGrowthPeriod = make(L.fixedGrowthPeriod);

        // Revenues list
        this.addRevenuesBtn = make(L.addRevenuesBtn);
    }

    // ── Shared form helpers ────────────────────────────────────────────────────

    /**
     * Fill the revenue name and, when `groupFlag === 'yes'`, set a new category/group.
     * Legacy bug fixed: the group value now comes from `groupName` (was undefined `input.groupName`).
     */
    async fillNameAndGroupFields(name: string, groupFlag: string, groupName: string): Promise<void> {
        await test.step(`Fill revenue name "${name}"${groupFlag === 'yes' ? ` and group "${groupName}"` : ''}`, async () => {
            await this.financial.fillName(name);
            if (groupFlag === 'yes') {
                await this.actions.fill((await this.groupField.get()).filter({ visible: true}), groupName, 'Fill group field');
                await this.home.selectFromMenu('Add new: ' + groupName);
            }
        });
    }

    /**
     * Fill a full 3-year (2023-2025) × 12-month varying table for a chapter type.
     * `values` is consumed left-to-right, 36 cells total.
     */
    async fillVaryingTable(name: string, values: string[]): Promise<void> {
        await test.step(`Fill ${name} varying table (3 years × 12 months)`, async () => {
            let k = 0;
            for (let i = 0; i < this.years.length; i++) {
                for (let j = 0; j < this.months.length; j++) {
                    await this.financial.fillVaryingfield(name, this.years[i], this.months[j], values[k]);
                    k++;
                }
            }
        });
    }

    /** Wait for the revenues chapter to load, then open the add-revenue form. */
    async clickAddRevenue(): Promise<void> {
        await test.step('Open add-revenue form', async () => {
            await this.actions.waitForVisible((await this.addRevenuesBtn.get()).filter({ visible: true}), 'Wait for Add revenue button', 60000);
            await this.actions.click((await this.addRevenuesBtn.get()).filter({ visible: true}), 'Click Add revenue button');
        });
    }

    // ── Add revenue flows ──────────────────────────────────────────────────────

    /** Add a Unit Sales revenue and verify the rendered rows across all 42 period columns. */
    async addUnitSalesRevenue(o: UnitSalesRevenueOptions): Promise<void> {
        await test.step('Add Unit Sales revenue', async () => {
            await this.financial.clickNext();

            if (o.unitType === 'constant') {
                await this.actions.fill((await this.numberOfUnitsOrHours.get()).filter({ visible: true}), o.noOfUnits as string, 'Fill number of units');
                await this.actions.click((await this.unitsOrHoursPeriod.get()).filter({ visible: true}), 'Open units period');
                await this.home.selectFromMenu(o.per);
                await this.actions.click((await this.unitOrHourStartYear.get()).filter({ visible: true}), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click((await this.unitOrHourStartMonth.get()).filter({visible:true}), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click((await this.unitOrHourEndYear.get()).filter({visible:true}), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click((await this.unitOrHourEndMonth.get()).filter({ visible:true}), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                /*if (o.unitGrowthFlag === 'yes') {
                    await this.actions.click(await this.unitsAndHoursGrowthSwitch.get(), 'Toggle units growth');
                    await this.actions.fill(await this.unitAndHoursGrowth.get(), o.unitGrowth, 'Fill units growth');
                    if (o.unitGrowthType === 'number') {
                        await this.actions.click(await this.unitAndHoursGrowthType.get(), 'Set units growth type to number');
                    }
                    await this.actions.click(await this.unitAndHoursGrowthPeriod.get(), 'Open units growth period');
                    await this.financial.selectFromMenu(o.unitGrowthPeriod);
                }*/
            } else if (o.unitType === 'varying') {
                await this.actions.click((await this.unitsOrClientsType.get()).filter({visible:true}), 'Open units varying type');
                await this.home.selectFromMenu(o.unitTypeChoice);
                await this.fillVaryingTable('sales', o.noOfUnits as string[]);
            }

            await this.financial.clickNext();

            if (o.priceType === 'constant') {
                await this.actions.fill((await this.unitsPrice.get()).filter({visible:true}), o.priceOfEachUnit as string, 'Fill price per unit');
                /*if (o.priceGrowthOrNot === 'yes') {
                    await this.actions.click(await this.priceGrowthSwitch.get(), 'Toggle price growth');
                    await this.actions.fill(await this.priceGrowth.get(), o.priceGrowth, 'Fill price growth');
                    if (o.priceGrowthType === 'number') {
                        await this.actions.click(await this.priceGrowthType.get(), 'Set price growth type to number');
                    }
                    await this.actions.click(await this.priceGrowthPeriod.get(), 'Open price growth period');
                    await this.financial.selectFromMenu(o.priceGrowthPeriod);
                }*/
            } else if (o.priceType === 'varying') {
                await this.actions.click((await this.priceType.get()).filter({visible:true}), 'Open price varying type');
                await this.home.selectFromMenu(o.priceTypeChoice);
                await this.fillVaryingTable('prices', o.priceOfEachUnit as string[]);
            }

            await this.saveAndOpenMonthly(this.addMsg);

            await this.assertRowAcrossPeriods(o.nameOfAttribute, o.results);
            await this.assertRowAcrossPeriods('total', o.total);
            await this.financial.openAndCloseToggler(o.nameOfAttribute);
            await this.page.waitForTimeout(1000);
            await this.assertRowAcrossPeriods('unit_sales', o.unitsSales);
            await this.assertRowAcrossPeriods('unit_price', o.price);
        });
    }

    /** Add a Billable Hours revenue and verify the rendered rows across all 42 period columns. */
    async addBillableHoursRevenue(o: BillableHoursRevenueOptions): Promise<void> {
        await test.step('Add Billable Hours revenue', async () => {
            await this.actions.click(await this.billableHours.get(), 'Choose Billable Hours type');
            await this.financial.clickNext();

            if (o.hoursType === 'constant') {
                await this.actions.fill(await this.numberOfUnitsOrHours.get(), o.noOfHours as string, 'Fill number of hours');
                await this.actions.click(await this.unitsOrHoursPeriod.get(), 'Open hours period');
                await this.home.selectFromMenu(o.per);
                await this.actions.click(await this.unitOrHourStartYear.get(), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(await this.unitOrHourStartMonth.get(), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(await this.unitOrHourEndYear.get(), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(await this.unitOrHourEndMonth.get(), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.hoursGrowthFlag === 'yes') {
                    await this.actions.click(await this.unitsAndHoursGrowthSwitch.get(), 'Toggle hours growth');
                    await this.actions.fill(await this.unitAndHoursGrowth.get(), o.hoursGrowth, 'Fill hours growth');
                    await this.actions.click(await this.unitAndHoursGrowthPeriod.get(), 'Open hours growth period');
                    await this.home.selectFromMenu(o.hoursGrowthPeriod);
                }
            } else if (o.hoursType === 'Varying amounts over time') {
                await this.actions.click(await this.hoursType.get(), 'Open hours varying type');
                await this.home.selectFromMenu(o.hoursType);
                await this.fillVaryingTable('billable', o.noOfHours as string[]);
            }

            await this.financial.clickNext();

            if (o.priceType === 'constant') {
                await this.actions.fill(await this.priceOfEachHour.get(), o.pricePerHour as string, 'Fill price per hour');
            } else if (o.priceType === 'Varying rates over time (EÂ£)') {
                // ⚠ NOTE: branch literal preserved verbatim from the legacy source (mojibake currency suffix). Verify against test data.
                await this.actions.click(await this.rateType.get(), 'Open rate varying type');
                await this.home.selectFromMenu(o.priceType);
                await this.fillVaryingTable('rate', o.pricePerHour as string[]);
            }

            await this.saveAndOpenMonthly(this.addMsg);

            await this.assertRowAcrossPeriods(o.nameOfAttribute, o.res);
            await this.financial.openAndCloseToggler(o.nameOfAttribute);
            await this.page.waitForTimeout(1000);
            await this.assertRowAcrossPeriods('billable_hours', o.hours);
            await this.assertRowAcrossPeriods('hourly_rate', o.rates);
        });
    }

    /** Add a Recurring Charges revenue and verify the rendered rows across all 42 period columns. */
    async addRecurringChargesRevenue(o: RecurringChargesRevenueOptions): Promise<void> {
        await test.step('Add Recurring Charges revenue', async () => {
            await this.actions.click(await this.recurringCharges.get(), 'Choose Recurring Charges type');
            await this.financial.clickNext();
            await this.actions.click(await this.recStartMonth.get(), 'Open recurring start month');
            await this.home.selectFromMenu(o.startMonth);
            await this.actions.click(await this.recStartYear.get(), 'Open recurring start year');
            await this.home.selectFromMenu(o.startYear);

            if (o.typeOfClients === 'Constant amount') {
                await this.actions.fill(await this.numberOfClients.get(), o.numberOfClients as string, 'Fill number of clients');
                if (o.clientsGrowthOrNot === 'yes') {
                    await this.actions.click(await this.SignupsGrowthSwitch.get(), 'Toggle signups growth');
                    await this.actions.fill(await this.SignupsGrowth.get(), o.signupsGrowth, 'Fill signups growth');
                    await this.actions.click(await this.SignupsGrowthPeriod.get(), 'Open signups growth period');
                    await this.home.selectFromMenu(o.signupsGrowthPeriod);
                }
            } else {
                await this.actions.click(await this.typeOfClients.get(), 'Open type-of-clients dropdown');
                await this.home.selectFromMenu(o.typeOfClients);
                await this.fillVaryingTable('sales', o.numberOfClients as string[]);
            }

            await this.financial.clickNext();

            if (o.chargeType === 'Varying prices over time (EÂ£)') {
                // ⚠ NOTE: branch literal preserved verbatim from the legacy source. Verify against test data.
                await this.actions.click(await this.chargeType.get(), 'Open charge varying type');
                await this.home.selectFromMenu(o.chargeType);
                await this.fillVaryingTable('sales', o.chargeValues as string[]);
            } else {
                await this.actions.fill(await this.howMuchRecurringCharges.get(), o.chargeValues as string, 'Fill recurring charge amount');
                if (o.chargeGrowthOrNot === 'yes') {
                    await this.actions.click(await this.fixedGrowthSwitch.get(), 'Toggle charge growth');
                    await this.actions.fill(await this.fixedGrowth.get(), o.chargeGrowth, 'Fill charge growth');
                    await this.actions.click(await this.fixedGrowthPeriod.get(), 'Open charge growth period');
                    await this.home.selectFromMenu(o.chargeGrowthPeriod);
                }
            }

            await this.actions.click(await this.chargePeriod.get(), 'Open charge period');
            await this.home.selectFromMenu(o.chargePeriod);

            if (o.upFrontType === 'Constant amount (EÂ£)') {
                // ⚠ NOTE: branch literal preserved verbatim from the legacy source. Verify against test data.
                await this.actions.click(await this.upFrontType.get(), 'Open up-front type');
                await this.home.selectFromMenu(o.upFrontType);
                await this.actions.fill(await this.upfrontAmount.get(), o.upFront as string, 'Fill up-front amount');
                if (o.upFrontGrowthOrNot === 'yes') {
                    await this.actions.click(await this.upfrontGrowthSwitch.get(), 'Toggle up-front growth');
                    await this.actions.fill(await this.upfrontGrowth.get(), o.upfrontGrowth, 'Fill up-front growth');
                    await this.actions.click(await this.upfrontGrowthPeriod.get(), 'Open up-front growth period');
                    await this.home.selectFromMenu(o.upfrontGrowthPeriod);
                }
            } else if (o.upFrontType === 'Varying amounts over time (EÂ£)') {
                // ⚠ NOTE: branch literal preserved verbatim from the legacy source. Verify against test data.
                await this.actions.click(await this.upFrontType.get(), 'Open up-front type');
                await this.home.selectFromMenu(o.upFrontType);
                await this.fillVaryingTable('fees', o.upFront as string[]);
            }

            await this.financial.clickNext();

            if (o.churnRateType === 'Varying rates over time') {
                await this.actions.click(await this.churnRateType.get(), 'Open churn-rate varying type');
                await this.home.selectFromMenu(o.churnRateType);
                await this.fillVaryingTable('sales', o.churnRate as string[]);
            } else {
                await this.actions.fill(await this.churnRate.get(), o.churnRate as string, 'Fill churn rate');
            }

            await this.saveAndOpenMonthly(this.addMsg);

            await this.assertRowAcrossPeriods(o.nameOfAttribute, o.res);
            await this.financial.openAndCloseToggler(o.nameOfAttribute);
            await this.page.waitForTimeout(1000);
            await this.assertRowAcrossPeriods('customers_at_start', o.customers);
            await this.assertRowAcrossPeriods('churn_rate', o.rates);
            await this.assertRowAcrossPeriods('signups', o.signups);
            await this.assertRowAcrossPeriods('up-front_fee', o.fee);
            await this.assertRowAcrossPeriods('recurring_charge', o.charges);
        });
    }

    /** Add a Fixed (Revenue Only) revenue and verify the rendered row across all 42 period columns. */
    async addFixedRevenue(o: FixedRevenueOptions): Promise<void> {
        await test.step('Add Fixed revenue', async () => {
            await this.actions.click(await this.fixedRev.get(), 'Choose Fixed / Revenue Only type');
            await this.financial.clickNext();

            if (o.type === 'constant') {
                await this.actions.fill(await this.amountOfmoney.get(), o.amount as string, 'Fill fixed revenue amount');
                await this.actions.click(await this.fixedPeriod.get(), 'Open fixed period');
                await this.home.selectFromMenu(o.per);
                await this.actions.click(await this.fixedStartYear.get(), 'Open start year');
                await this.home.selectFromMenu(o.startYear);
                await this.actions.click(await this.fixedStartMonth.get(), 'Open start month');
                await this.home.selectFromMenu(o.startMonth);
                await this.actions.click(await this.fixedEndYear.get(), 'Open end year');
                await this.home.selectFromMenu(o.endYear);
                await this.actions.click(await this.fixedEndMonth.get(), 'Open end month');
                await this.home.selectFromMenu(o.endMonth);

                if (o.growthOrNot === 'yes') {
                    await this.actions.click(await this.fixedGrowthSwitch.get(), 'Toggle fixed growth');
                    await this.actions.fill(await this.fixedGrowth.get(), o.growth, 'Fill fixed growth');
                    await this.actions.click(await this.fixedGrowthPeriod.get(), 'Open fixed growth period');
                    await this.home.selectFromMenu(o.growthPeriod);
                }
            } else {
                await this.actions.click(await this.fixedType.get(), 'Open fixed varying type');
                await this.home.selectFromMenu(o.type);
                await this.fillVaryingTable('fixedRevenue', o.amount as string[]);
            }

            await this.saveAndOpenMonthly(this.addMsg);
            await this.assertRowAcrossPeriods(o.nameOfAttribute, o.res);
        });
    }

    // ── Duplicate / edit flows ──────────────────────────────────────────────────

    /** Close the open form, then duplicate an existing revenue under a new name and verify its row. */
    async duplicate(oldName: string, nameOfRevenue: string, nameOfAttribute: string, res: string[]): Promise<void> {
        await test.step(`Duplicate revenue "${oldName}" → "${nameOfRevenue}"`, async () => {
            await this.financial.clickClose();
            await this.financial.confirmClosing();
            await this.page.waitForTimeout(1000);

            await this.financial.openSetting(oldName);
            await this.financial.duplicate(oldName);
            await this.financial.fillDuplicatedName(nameOfRevenue);
            await this.financial.confirmDuplicate();

            await this.page.waitForTimeout(2000);
            await this.actions.waitForVisible(await this.addRevenuesBtn.get(), 'Wait for revenues list', 60000);
            await this.financial.clickShowMonthly();

            await this.assertRowAcrossPeriods(nameOfAttribute, res);
        });
    }

    /**
     * Close the open form, then edit an existing revenue's name and verify its row.
     * Legacy bug fixed: assertion uses `res[i]` (was undefined `input.res[i]`).
     */
    async edit(oldName: string, nameOfRevenue: string, nameOfAttribute: string, res: string[]): Promise<void> {
        await test.step(`Edit revenue "${oldName}" → "${nameOfRevenue}"`, async () => {
            await this.financial.clickClose();
            await this.financial.confirmClosing();
            await this.page.waitForTimeout(1000);

            await this.financial.openSetting(oldName);
            await this.financial.edit(oldName);

            await this.financial.fillName(nameOfRevenue);
            await this.financial.clickSave();

            await this.assert.toBeVisible(await this.editMsg.get(), 'Revenue Modified Successfully toast is visible');
            await this.actions.waitForVisible(await this.addRevenuesBtn.get(), 'Wait for revenues list', 60000);
            await this.page.waitForTimeout(2000);
            await this.financial.clickShowMonthly();

            await this.assertRowAcrossPeriods(nameOfAttribute, res);
        });
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    /**
     * Click Save, assert the success toast, wait for the revenues list to return, then
     * reveal the monthly columns — the post-save sequence shared by every add flow.
     */
    private async saveAndOpenMonthly(toast: SelfHealingLocator): Promise<void> {
        await this.financial.clickSave();
        await this.assert.toBeVisible(await toast.get(), 'Success toast is visible');
        await this.actions.waitForVisible((await this.addRevenuesBtn.get()).filter({visible:true}), 'Wait for revenues list', 60000);
        await this.page.waitForTimeout(2000);
        await this.financial.clickShowMonthly();
    }

    /** Assert a rendered financial row's value in every one of the 42 period columns. */
    private async assertRowAcrossPeriods(attr: string, values: string[]): Promise<void> {
        for (let i = 0; i < 42; i++) {
            await this.financial.newChek(attr, this.periodTitles[i], values[i]);
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Method option types (replace the legacy positional parameter lists)
// ─────────────────────────────────────────────────────────────────────────────

/** Options for {@link RevenuesPageSelfHealing.addUnitSalesRevenue}. */
export interface UnitSalesRevenueOptions {
    unitType: 'constant' | 'varying';
    /** A single value for `constant`; the 36-cell array for `varying`. */
    noOfUnits: string | string[];
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    unitGrowthFlag: string;
    unitGrowth: string;
    unitGrowthType: string;
    unitGrowthPeriod: string;
    unitTypeChoice: string;
    priceType: 'constant' | 'varying';
    /** A single value for `constant`; the 36-cell array for `varying`. */
    priceOfEachUnit: string | string[];
    priceGrowthOrNot: string;
    priceGrowth: string;
    priceGrowthType: string;
    priceGrowthPeriod: string;
    priceTypeChoice: string;
    nameOfAttribute: string;
    /** 42 expected values for the main attribute row. */
    results: string[];
    /** 42 expected values for the total row. */
    total: string[];
    /** 42 expected values for the unit_sales sub-row. */
    unitsSales: string[];
    /** 42 expected values for the unit_price sub-row. */
    price: string[];
}

/** Options for {@link RevenuesPageSelfHealing.addBillableHoursRevenue}. */
export interface BillableHoursRevenueOptions {
    hoursType: 'constant' | 'Varying amounts over time' | string;
    noOfHours: string | string[];
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    hoursGrowthFlag: string;
    hoursGrowth: string;
    hoursGrowthPeriod: string;
    priceType: 'constant' | 'Varying rates over time (EÂ£)' | string;
    pricePerHour: string | string[];
    nameOfAttribute: string;
    res: string[];
    hours: string[];
    rates: string[];
}

/** Options for {@link RevenuesPageSelfHealing.addRecurringChargesRevenue}. */
export interface RecurringChargesRevenueOptions {
    startMonth: string;
    startYear: string;
    typeOfClients: 'Constant amount' | string;
    numberOfClients: string | string[];
    clientsGrowthOrNot: string;
    signupsGrowth: string;
    signupsGrowthPeriod: string;
    chargeType: 'Varying prices over time (EÂ£)' | string;
    chargeValues: string | string[];
    chargeGrowthOrNot: string;
    chargeGrowth: string;
    chargeGrowthPeriod: string;
    chargePeriod: string;
    upFrontType: 'Constant amount (EÂ£)' | 'Varying amounts over time (EÂ£)' | string;
    upFront: string | string[];
    upFrontGrowthOrNot: string;
    upfrontGrowth: string;
    upfrontGrowthPeriod: string;
    churnRateType: 'Varying rates over time' | string;
    churnRate: string | string[];
    nameOfAttribute: string;
    res: string[];
    customers: string[];
    rates: string[];
    signups: string[];
    fee: string[];
    charges: string[];
}

/** Options for {@link RevenuesPageSelfHealing.addFixedRevenue}. */
export interface FixedRevenueOptions {
    type: 'constant' | string;
    amount: string | string[];
    per: string;
    startYear: string;
    startMonth: string;
    endYear: string;
    endMonth: string;
    growthOrNot: string;
    growth: string;
    growthPeriod: string;
    nameOfAttribute: string;
    res: string[];
}
