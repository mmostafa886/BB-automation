import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for RevenuesSelfHealing — BznsBuilder "Add / Edit Revenue" page.
 *
 * Converted from the legacy TestCafe page object `RevenuesPopUp.js`.
 * The pop-up opens from the revenues page when adding, editing, or duplicating a revenue
 * and covers all five revenue types: Unit Sales, Billable Hours, Recurring Charges,
 * Fixed (Revenue Only), and Commission.
 *
 * Conversion notes:
 *   - `.filterVisible()`            → `:visible` pseudo-class appended to the CSS selector.
 *   - `.nth(n)` / `.withExactText`  → `(page) => Locator` factory selectors.
 *   - All selectors should be re-verified against https://stgapp.bznsbuilder.com/.
 */
export const revenuesLocators = {


    groupField: {
        // Second `.field-wrapper` on the form (group selector) — index-based, no clean CSS equivalent
        selector: (page) => page.locator('.field-wrapper').nth(1),
        metadata: {
            description: 'the group field wrapper (second field-wrapper) in the add/edit revenue pop-up',
        },
    },

    taxGroup: {
        // Tax chooser input, matched by its placeholder text
        selector: 'input[placeholder="Please choose tax"]',
        metadata: {
            placeholder: 'Please choose tax',
            description: 'tax group chooser input in the add/edit revenue pop-up',
        },
    },

    addTax: {
        // "Add New Tax" option — exact text match
        selector: (page) => page.getByText('Add New Tax', { exact: true }),
        metadata: {
            text: 'Add New Tax',
            description: 'Add New Tax option in the tax dropdown of the add/edit revenue pop-up',
        },
    },

    // ─── Type selector panels (revenue type) ─────────────────────────────────
    unitSales: {
        // "Unit Sales" revenue-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-unitSales"]',
        metadata: {
            description: 'Unit Sales revenue type panel in the add/edit revenue pop-up',
        },
    },

    billableHours: {
        // "Billable Hours" revenue-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-billableHours"]',
        metadata: {
            description: 'Billable Hours revenue type panel in the add/edit revenue pop-up',
        },
    },

    recurringCharges: {
        // "Recurring Charges" revenue-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-recurringCharges"]',
        metadata: {
            description: 'Recurring Charges revenue type panel in the add/edit revenue pop-up',
        },
    },

    fixedRev: {
        // "Revenue Only" (Fixed) revenue-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-revenueOnly"]',
        metadata: {
            description: 'Fixed / Revenue Only revenue type panel in the add/edit revenue pop-up',
        },
    },

    commision: {
        // "Commission" revenue-type panel.
        // NOTE: source TestCafe used attribute name `app-white-panel` (not `data-automation-test`) — preserved verbatim. Verify on the live app.
        selector: 'app-white-panel[app-white-panel="auto-button-type-commision"]',
        metadata: {
            description: 'Commission revenue type panel in the add/edit revenue pop-up',
        },
    },

    // ─── Unit Sales ──────────────────────────────────────────────────────────
    numberOfUnitsOrHours: {
        // Number of units (Unit Sales) or hours (Billable Hours)
        selector: 'input[data-automation-test="auto-input-unitsNum"]',
        metadata: {
            description: 'number of units (unit sales) or hours (billable hours) input',
        },
    },

    unitsOrClientsType: {
        // Sales varying type dropdown (units / clients)
        selector: 'div[data-automation-test="auto-select-sales-varying-selectHead"]',
        metadata: {
            description: 'units or clients varying-type dropdown for sales',
        },
    },

    unitsOrHoursPeriod: {
        // Period of units / hours
        selector: 'div[data-automation-test="auto-input-unitsPeriod-selectHead"]',
        metadata: {
            description: 'period dropdown for number of units or hours',
        },
    },

    unitsAndHoursGrowthSwitch: {
        // Toggle enabling growth for units / hours
        selector: 'div[data-automation-test="auto-unitsGrowth-switch"]',
        metadata: {
            description: 'growth toggle switch for units/hours',
        },
    },

    unitAndHoursGrowth: {
        // Units / hours growth value
        selector: 'input[data-automation-test="auto-unitsGrowth-value"]',
        metadata: {
            description: 'growth value input for units/hours',
        },
    },

    unitAndHoursGrowthType: {
        // Units / hours growth type dropdown
        selector: 'div[data-automation-test="auto-unitsGrowth-type"]',
        metadata: {
            description: 'growth type dropdown for units/hours',
        },
    },

    unitAndHoursGrowthPeriod: {
        // Units / hours growth period dropdown
        selector: 'div[data-automation-test="auto-unitsGrowth-period-selectHead"]',
        metadata: {
            description: 'growth period dropdown for units/hours',
        },
    },

    unitsPrice: {
        // Price per unit
        selector: 'input[data-automation-test="auto-input-unitsPrice"]',
        metadata: {
            description: 'price per unit input for unit sales',
        },
    },

    unitOrHourStartMonth: {
        // Unit / hour sales start month
        selector: 'div[data-automation-test="auto-sales-start-dateYear-selectHead"]',
        metadata: {
            description: 'start month dropdown for unit sales / billable hours revenue',
        },
    },

    unitOrHourStartYear: {
        // Unit / hour sales start year
        selector: 'div[data-automation-test="auto-sales-start-dateMonth-selectHead"]',
        metadata: {
            description: 'start year dropdown for unit sales / billable hours revenue',
        },
    },

    unitOrHourEndMonth: {
        // Unit / hour sales end month
        selector: 'div[data-automation-test="auto-sales-end-dateYear-selectHead"]',
        metadata: {
            description: 'end month dropdown for unit sales / billable hours revenue',
        },
    },

    unitOrHourEndYear: {
        // Unit / hour sales end year
        selector: 'div[data-automation-test="auto-sales-end-dateMonth-selectHead"]',
        metadata: {
            description: 'end year dropdown for unit sales / billable hours revenue',
        },
    },

    // ─── Price / commission varying & growth ─────────────────────────────────
    priceAndCommissionChargeType: {
        // Prices varying type dropdown (shared by price & commission)
        selector: 'div[data-automation-test="auto-select-prices-varying-selectHead"]',
        metadata: {
            description: 'prices varying-type dropdown (price and commission charge type)',
        },
    },

    priceGrowthSwitch: {
        // Toggle enabling price growth
        selector: 'div[data-automation-test="auto-pricesGrowth-switch"]',
        metadata: {
            description: 'price growth toggle switch',
        },
    },

    priceGrowth: {
        // Price growth value
        selector: 'input[data-automation-test="auto-pricesGrowth-value"]',
        metadata: {
            description: 'price growth value input',
        },
    },

    priceGrowthType: {
        // Price growth type (down variant)
        selector: 'div[data-automation-test="auto-pricesGrowth-type-down"]',
        metadata: {
            description: 'price growth type dropdown (down variant)',
        },
    },

    priceGrowthPeriod: {
        // Price growth period dropdown
        selector: 'div[data-automation-test="auto-pricesGrowth-period-selectHead"]',
        metadata: {
            description: 'price growth period dropdown',
        },
    },

    priceType: {
        // Prices varying type dropdown (alias of priceAndCommissionChargeType)
        selector: 'div[data-automation-test="auto-select-prices-varying-selectHead"]',
        metadata: {
            description: 'price varying-type dropdown',
        },
    },

    // ─── Billable Hours ──────────────────────────────────────────────────────
    hoursType: {
        // Billable hours varying type dropdown
        selector: 'div[data-automation-test="auto-select-billable-varying-selectHead"]',
        metadata: {
            description: 'billable hours varying-type dropdown',
        },
    },

    rateType: {
        // Rate varying type dropdown
        selector: 'div[data-automation-test="auto-select-rate-varying-selectHead"]',
        metadata: {
            description: 'rate varying-type dropdown for billable hours',
        },
    },

    priceOfEachHour: {
        // Price per hour
        selector: 'input[data-automation-test="auto-input-hoursPrice"]',
        metadata: {
            description: 'price per hour input for billable hours',
        },
    },

    rateGrowthSwitch: {
        // Toggle enabling rate growth.
        // NOTE: source TestCafe targeted an <input> here (other growth switches use <div>) — preserved verbatim.
        selector: 'input[data-automation-test="auto-rateGrowth-switch"]',
        metadata: {
            description: 'rate growth toggle switch for billable hours',
        },
    },

    rateGrowth: {
        // Rate growth value
        selector: 'input[data-automation-test="auto-rateGrowth-value"]',
        metadata: {
            description: 'rate growth value input for billable hours',
        },
    },

    rateGrowthType: {
        // Rate growth type dropdown
        selector: 'div[data-automation-test="auto-rateGrowth-type"]',
        metadata: {
            description: 'rate growth type dropdown for billable hours',
        },
    },

    rateGrowthPeriod: {
        // Rate growth period dropdown
        selector: 'div[data-automation-test="auto-rateGrowth-period-selectHead"]',
        metadata: {
            description: 'rate growth period dropdown for billable hours',
        },
    },

    // ─── Recurring Charges ───────────────────────────────────────────────────
    numberOfClients: {
        // Number of clients
        selector: 'input[data-automation-test="auto-input-numOfClients"]',
        metadata: {
            description: 'number of clients input for recurring charges',
        },
    },

    recStartMonth: {
        // Recurring signups start month
        selector: 'div[data-automation-test="auto-signups-start-dateYear-selectHead"]',
        metadata: {
            description: 'start month dropdown for recurring charges (signups)',
        },
    },

    recStartYear: {
        // Recurring signups start year
        selector: 'div[data-automation-test="auto-signups-start-dateMonth-selectHead"]',
        metadata: {
            description: 'start year dropdown for recurring charges (signups)',
        },
    },

    upFrontType: {
        // Upfront payment type dropdown
        selector: 'div[data-automation-test="auto-select-upfrontPayment-selectHead"]',
        metadata: {
            description: 'upfront payment type dropdown for recurring charges',
        },
    },

    chargePeriod: {
        // Charge period dropdown
        selector: 'div[data-automation-test="auto-select-chargePeriod-selectHead"]',
        metadata: {
            description: 'charge period dropdown for recurring charges',
        },
    },

    howMuchRecurringCharges: {
        // Recurring charge amount
        selector: 'input[data-automation-test="auto-input-chargeAmount"]',
        metadata: {
            description: 'recurring charge amount input',
        },
    },

    churnRateType: {
        // Sales varying type dropdown used for churn rate — visible instance only
        selector: 'div[data-automation-test="auto-select-sales-varying-selectHead"]:visible',
        metadata: {
            description: 'churn rate type dropdown (visible instance only) for recurring charges',
        },
    },

    upfrontAmount: {
        // Upfront amount
        selector: 'input[data-automation-test="auto-input-upfrontAmount"]',
        metadata: {
            description: 'upfront amount input for recurring charges',
        },
    },

    churnRate: {
        // Churn rate input
        selector: 'input[data-automation-test="auto-select-churnRate"]',
        metadata: {
            description: 'churn rate input for recurring charges',
        },
    },

    typeOfClients: {
        // Sales varying type dropdown (type of clients)
        selector: 'div[data-automation-test="auto-select-sales-varying-selectHead"]',
        metadata: {
            description: 'type of clients varying-type dropdown for recurring charges',
        },
    },

    chargeType: {
        // Sales varying type dropdown used for charge type — visible instance only
        selector: 'div[data-automation-test="auto-select-sales-varying-selectHead"]:visible',
        metadata: {
            description: 'charge type dropdown (visible instance only) for recurring charges',
        },
    },

    SignupsGrowthSwitch: {
        // Toggle enabling signups growth
        selector: 'div[data-automation-test="auto-signupsGrowth-switch"]',
        metadata: {
            description: 'signups growth toggle switch for recurring charges',
        },
    },

    SignupsGrowth: {
        // Signups growth value
        selector: 'input[data-automation-test="auto-signupsGrowth-value"]',
        metadata: {
            description: 'signups growth value input for recurring charges',
        },
    },

    SignupsGrowthType: {
        // Signups growth type (up variant) — rendered as an <svg>
        selector: 'svg[data-automation-test="auto-signupsGrowth-type-up"]',
        metadata: {
            description: 'signups growth type icon (up variant) for recurring charges',
        },
    },

    SignupsGrowthPeriod: {
        // Signups growth period dropdown
        selector: 'div[data-automation-test="auto-signupsGrowth-period-selectHead"]',
        metadata: {
            description: 'signups growth period dropdown for recurring charges',
        },
    },

    upfrontGrowthSwitch: {
        // Upfront (fixed-rev) growth toggle — second instance on the form
        selector: (page) => page.locator('input[data-automation-test="auto-fixedRevGrowth-switch"]').nth(1),
        metadata: {
            description: 'upfront growth toggle switch (second fixedRevGrowth switch) for recurring charges',
        },
    },

    upfrontGrowth: {
        // Upfront (fixed-rev) growth value — second instance on the form
        selector: (page) => page.locator('input[data-automation-test="auto-fixedRevGrowth-value"]').nth(1),
        metadata: {
            description: 'upfront growth value input (second fixedRevGrowth value) for recurring charges',
        },
    },

    upfrontGrowthPeriod: {
        // Upfront (fixed-rev) growth period — second instance on the form
        selector: (page) => page.locator('ng-select[data-automation-test="auto-fixedRevGrowth-period-selectHead"]').nth(1),
        metadata: {
            description: 'upfront growth period dropdown (second fixedRevGrowth period) for recurring charges',
        },
    },

    // ─── Fixed (Revenue Only) ────────────────────────────────────────────────
    fixedType: {
        // Fixed revenue varying type dropdown
        selector: 'div[data-automation-test="auto-select-fixedRevenue-varying-selectHead"]',
        metadata: {
            description: 'fixed revenue varying-type dropdown',
        },
    },

    fixedGrowthSwitch: {
        // Fixed revenue growth toggle — visible instance only
        selector: 'div[data-automation-test="auto-fixedRevGrowth-switch"]:visible',
        metadata: {
            description: 'fixed revenue growth toggle switch (visible instance only)',
        },
    },

    fixedGrowth: {
        // Fixed revenue growth value — visible instance only
        selector: 'input[data-automation-test="auto-fixedRevGrowth-value"]:visible',
        metadata: {
            description: 'fixed revenue growth value input (visible instance only)',
        },
    },

    fixedGrowthType: {
        // Fixed revenue growth type dropdown
        selector: 'div[data-automation-test="auto-fixedRevGrowth-type"]',
        metadata: {
            description: 'fixed revenue growth type dropdown',
        },
    },

    fixedGrowthPeriod: {
        // Fixed revenue growth period — visible instance only
        selector: 'div[data-automation-test="auto-fixedRevGrowth-period-selectHead"]:visible',
        metadata: {
            description: 'fixed revenue growth period dropdown (visible instance only)',
        },
    },

    amountOfmoney: {
        // Fixed revenue amount
        selector: 'input[data-automation-test="auto-input-fixedRevenue-value"]',
        metadata: {
            description: 'fixed revenue amount input',
        },
    },

    fixedPeriod: {
        // Fixed revenue period dropdown
        selector: 'div[data-automation-test="auto-input-fixedRevenue-period-selectHead"]',
        metadata: {
            description: 'fixed revenue period dropdown',
        },
    },

    fixedStartMonth: {
        // Fixed revenue start month
        selector: 'div[data-automation-test="auto-input-fixedRevenue-start-dateYear-selectHead"]',
        metadata: {
            description: 'start month dropdown for fixed revenue',
        },
    },

    fixedStartYear: {
        // Fixed revenue start year
        selector: 'div[data-automation-test="auto-input-fixedRevenue-start-dateMonth-selectHead"]',
        metadata: {
            description: 'start year dropdown for fixed revenue',
        },
    },

    fixedEndMonth: {
        // Fixed revenue end month
        selector: 'div[data-automation-test="auto-input-fixedRevenue-end-dateYear-selectHead"]',
        metadata: {
            description: 'end month dropdown for fixed revenue',
        },
    },

    fixedEndYear: {
        // Fixed revenue end year
        selector: 'div[data-automation-test="auto-input-fixedRevenue-end-dateMonth-selectHead"]',
        metadata: {
            description: 'end year dropdown for fixed revenue',
        },
    },

    // ─── Commission ──────────────────────────────────────────────────────────
    dealsType: {
        // Deals varying type dropdown
        selector: 'div[data-automation-test="auto-select-prices-varying-selectHead"]',
        metadata: {
            description: 'deals varying-type dropdown for commission',
        },
    },

    numberOfDeals: {
        // Number of deals
        selector: 'input[data-automation-test="auto-input-dealsNum"]',
        metadata: {
            description: 'number of deals input for commission',
        },
    },

    averageSize: {
        // Average deal size
        selector: 'input[data-automation-test="auto-input-avgSize"]',
        metadata: {
            description: 'average deal size input for commission',
        },
    },

    commissionPeriod: {
        // Commission period dropdown
        selector: 'ng-select[data-automation-test="auto-input-commisionPeriod-selectHead"]',
        metadata: {
            description: 'commission period dropdown',
        },
    },

    commissionStartMonth: {
        // Commission start month — first instance
        selector: (page) => page.locator('div[data-automation-test="auto-commision-start-dateYear-selectHead"]').nth(0),
        metadata: {
            description: 'start month dropdown for commission (first instance)',
        },
    },

    commisionStartYear: {
        // Commission start year — first instance
        selector: (page) => page.locator('div[data-automation-test="auto-commision-start-dateMonth-selectHead"]').nth(0),
        metadata: {
            description: 'start year dropdown for commission (first instance)',
        },
    },

    commisionEndMonth: {
        // Commission end month — second instance of the start-month selector
        selector: (page) => page.locator('div[data-automation-test="auto-commision-start-dateYear-selectHead"]').nth(1),
        metadata: {
            description: 'end month dropdown for commission (second instance of the start-month selector)',
        },
    },

    commisionEndYear: {
        // Commission end year — second instance of the start-year selector
        selector: (page) => page.locator('div[data-automation-test="auto-commision-start-dateMonth-selectHead"]').nth(1),
        metadata: {
            description: 'end year dropdown for commission (second instance of the start-year selector)',
        },
    },

    commissionGrowthSwitch: {
        // Commission growth toggle.
        // NOTE: source data-automation-test value is literally "undefined-switch" — preserved verbatim. Likely a bug in the app/test; verify on the live app.
        selector: 'div[data-automation-test="undefined-switch"]',
        metadata: {
            description: 'commission growth toggle switch (data-automation-test value is literally "undefined-switch")',
        },
    },

    commissionGrowth: {
        // Commission growth value.
        // NOTE: source data-automation-test value is literally "undefined-value" — preserved verbatim.
        selector: 'input[data-automation-test="undefined-value"]',
        metadata: {
            description: 'commission growth value input (data-automation-test value is literally "undefined-value")',
        },
    },

    commissionGrowthType: {
        // Commission growth type.
        // NOTE: source data-automation-test value is literally "undefined-type" — preserved verbatim.
        selector: 'div[data-automation-test="undefined-type"]',
        metadata: {
            description: 'commission growth type dropdown (data-automation-test value is literally "undefined-type")',
        },
    },

    commissionGrowthPeriod: {
        // Commission growth period.
        // NOTE: source data-automation-test value is literally "undefined-period-selectHead" — preserved verbatim.
        selector: 'div[data-automation-test="undefined-period-selectHead"]',
        metadata: {
            description: 'commission growth period dropdown (data-automation-test value is literally "undefined-period-selectHead")',
        },
    },

    setupType: {
        // Commission type / setup dropdown
        selector: 'div[data-automation-test="auto-select-commissionType-selectHead"]',
        metadata: {
            description: 'commission setup/type dropdown',
        },
    },

    commissionPercentage: {
        // Commission percentage
        selector: 'input[data-automation-test="auto-input-commPercentage"]',
        metadata: {
            description: 'commission percentage input',
        },
    },

    fullyTransferedMenu: {
        // Whole-transferred commission dropdown
        selector: 'div[data-automation-test="auto-select-commWholeTransferred-selectHead"]',
        metadata: {
            description: 'fully transferred commission dropdown',
        },
    },

    commisionWeeks: {
        // Commission weeks dropdown
        selector: 'div[data-automation-test="auto-select-commWeeks-selectHead"]',
        metadata: {
            description: 'commission weeks dropdown',
        },
    },

    uponSellingMenu: {
        // Commission timing (upon selling) dropdown
        selector: 'div[data-automation-test="auto-select-commTime-selectHead"]',
        metadata: {
            description: 'commission timing (upon selling) dropdown',
        },
    },

    afterSellingWeeks: {
        // After-selling weeks dropdown
        selector: 'div[data-automation-test="auto-select-commAfterSellWeeks-selectHead"]',
        metadata: {
            description: 'commission after-selling weeks dropdown',
        },
    },

    fees: {
        // Commission fee input
        selector: 'input[data-automation-test="auto-input-commFee"]',
        metadata: {
            description: 'commission fee input',
        },
    },

    // ─── Toast / success messages ────────────────────────────────────────────
    addMsg: {
        // "Revenue Added Successfully" toast — exact text
        selector: (page) => page.getByText('Revenue Added Successfully', { exact: true }),
        metadata: {
            text: 'Revenue Added Successfully',
            description: 'success toast shown after a revenue is added',
        },
    },

    editMsg: {
        // "Revenue Modified Successfully" toast — exact text
        selector: (page) => page.getByText('Revenue Modified Successfully', { exact: true }),
        metadata: {
            text: 'Revenue Modified Successfully',
            description: 'success toast shown after a revenue is modified',
        },
    },

    deleteMsg: {
        // "Revenue Deleted Successfully!" toast — exact text
        selector: (page) => page.getByText('Revenue Deleted Successfully!', { exact: true }),
        metadata: {
            text: 'Revenue Deleted Successfully!',
            description: 'success toast shown after a revenue is deleted',
        },
    },
    addRevenuesBtn: {
        // "Add Revenue Stream" button at the top-right of the Revenue financial table
        selector: 'app-our-button[data-automation-test="auto-button-add"]',
        metadata: {
            role: 'button',
            name: 'Add Revenue Stream',
            text: 'Add Revenue Stream',
            description: 'Add Revenue Stream button at the top-right of the Revenue financial table',
        },
    },
   
    closeInstructionsModal: {
        // appear when opening an empty financial chapter,it is used to close the instructions modal 
        selector: '[data-automation-test="auto-button-closeModal"]',
        metadata: {
            description: 'appear when opening an empty financial chapter,it is used to close the instructions modal',
        },
    },

} satisfies Record<string, LocatorDefinition>;
