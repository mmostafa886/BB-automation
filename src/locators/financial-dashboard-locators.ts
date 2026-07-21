import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for FinancialDashboardSelfHealing — BznsBuilder financial dashboard.
 *
 * This page is reached immediately after clicking forecast from the side menu.
 * All selectors are verified against https://stgapp.bznsbuilder.com/.
 */
export const financialDashboardLocators = {

    financialTables: {
        // financial tables tab in the navbar that shows the links of the financial chapters when clicking on it
        selector: '[data-automation-test="auto-navbar-link-Financial_Tables"]',
        metadata: {
            description: 'financial tables tab in the navbar shown after clicking forecast',
        },
    },

    editRevenues: {
        // revenues tab in the navbar that navigating to the revenues page after clicking on it
        selector: '[data-automation-test="auto-navbar-subLink-Revenue"]',
        metadata: {
            description: 'revenues tab in the navbar shown after clicking financial tables tab',
        },
    },

    showMonthly: {
        // show monthly button that is exist in all financial chapters pages
        selector: '[data-automation-test="auto-button-showMonthly"]',
        metadata: {
            description: 'show monthly button that is shows the values of the months in the financial chapter page afte clicking on it',
        },
    },

    

    confirmClosingBtn: {
        // "Confirm" button shown when closing the form with unsaved changes — exact text
        selector: (page) => page.getByText('Confirm', { exact: true }),
        metadata: {
            text: 'Confirm',
            description: 'Confirm button in the close-without-saving confirmation dialog',
        },
    },
    
    confirmDuplication: {
        // Confirm button in the duplication modal
        selector: 'app-our-button[data-automation-test="auto-button-duplicationModalConfirm"]',
        metadata: {
            description: 'confirm button in the financial entry duplication modal',
        },
    },
    

    nameOfDuplicated: {
        // Name input for the duplicated financial entry
        selector: 'input[data-automation-test="auto-input-duplicationModalName"]',
        metadata: {
            description: 'name input for the duplicated  financial entry in the duplication modal',
        },
    },

    cancelBtn: {
        // cancel button that is exist when opening the steps of the financial entry,it is used to cancel the adding or editing of the entry
        selector: '[data-automation-test="auto-btn-modalCancel"]',
        metadata: {
            description: 'cancel button that is exist when opening the steps of the financial entry,it is used to cancel the adding or editing of the entry',
        },
    },
     resetForm: {
        // Reset form button
        selector: '.reset-btn',
        metadata: {
            description: 'reset form button in the add/edit financial entry',
        },
    },

    closeBtn: {
        // Discard / close button
        selector: 'button[data-automation-test="auto-button-formDiscard"]',
        metadata: {
            role: 'button',
            description: 'discard/close button in the add/edit financial entry',
        },
    },

    // ─── General / shared ────────────────────────────────────────────────────
    name: {
        //  name input — only the visible instance is targeted
        selector: 'input[data-automation-test="auto-input-name"]',
        metadata: {
            description: ' name text input in the add/edit financial entry (visible instance only)',
        },
    },

    /*name: {
        // the name field when adding or editing a financial entry
        selector: '[data-automation-test="auto-input-name"]',
        metadata: {
            description: 'the name field when adding or editing a financial entry',
        },
    },*/

    nextBtn: {
        // Next button advancing to the next step of the financial entry form
        selector: 'button[data-automation-test="auto-button-formNext"]',
        metadata: {
            role: 'button',
            description: 'Next button that advances to the next step in the add/edit financial entry',
        },
    },
    

    saveBtn: {
        // Save-only button
        selector: 'button[data-automation-test="auto-button-formSaveOnly"]',
        metadata: {
            role: 'button',
            description: 'save button in the add/edit financial entry',
        },
    },

    // ─── Navbar — chapter edit sub-links ─────────────────────────────────────
    editDirectCost: {
        // Direct Costs chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Direct_Costs"]',
        metadata: {
            role: 'link',
            description: 'Direct Costs chapter sub-link in the navbar (navigates to the direct costs page)',
        },
    },

    editPersonnel: {
        // Personnel chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Personnel"]',
        metadata: {
            role: 'link',
            description: 'Personnel chapter sub-link in the navbar (navigates to the personnel page)',
        },
    },

    editExpenses: {
        // Expenses chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Expenses"]',
        metadata: {
            role: 'link',
            description: 'Expenses chapter sub-link in the navbar (navigates to the expenses page)',
        },
    },

    editAssets: {
        // Assets chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Assets"]',
        metadata: {
            role: 'link',
            description: 'Assets chapter sub-link in the navbar (navigates to the assets page)',
        },
    },

    editTaxes: {
        // Taxes chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Taxes"]',
        metadata: {
            role: 'link',
            description: 'Taxes chapter sub-link in the navbar (navigates to the taxes page)',
        },
    },

    editDividends: {
        // Dividends chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Dividends"]',
        metadata: {
            role: 'link',
            description: 'Dividends chapter sub-link in the navbar (navigates to the dividends page)',
        },
    },

    editFinancing: {
        // Financing chapter sub-link in the navbar
        selector: 'a[data-automation-test="auto-navbar-subLink-Financing"]',
        metadata: {
            role: 'link',
            description: 'Financing chapter sub-link in the navbar (navigates to the financing page)',
        },
    },

    // ─── Navbar — report view links ──────────────────────────────────────────
    viewProfitAndLoss: {
        // Profit & Loss report link in the navbar
        selector: 'a[data-automation-test="auto-navbar-link-Profit_&_Loss"]',
        metadata: {
            role: 'link',
            description: 'Profit & Loss report link in the navbar (navigates to the P&L statement)',
        },
    },

    viewCashFlow: {
        // Cash Flow report link in the navbar
        selector: 'a[data-automation-test="auto-navbar-link-Cash_Flow"]',
        metadata: {
            role: 'link',
            description: 'Cash Flow report link in the navbar (navigates to the cash flow statement)',
        },
    },

    viewBalanceSheet: {
        // Balance Sheet report link in the navbar
        selector: 'a[data-automation-test="auto-navbar-link-Balance_Sheet"]',
        metadata: {
            role: 'link',
            description: 'Balance Sheet report link in the navbar (navigates to the balance sheet)',
        },
    },

    cashAssumptions: {
        // Cash Assumptions sub-link in the navbar.
        // NOTE: source data-automation-test value contains a space ("Cash Assumptions") — preserved verbatim. Verify on the live app.
        selector: 'a[data-automation-test="auto-navbar-subLink-Cash Assumptions"]',
        metadata: {
            role: 'link',
            description: 'Cash Assumptions sub-link in the navbar',
        },
    },

    initialBalances: {
        // Initial Balances sub-link in the navbar.
        // NOTE: source data-automation-test value contains a space ("Initial Balances") — preserved verbatim. Verify on the live app.
        selector: 'a[data-automation-test="auto-navbar-subLink-Initial Balances"]',
        metadata: {
            role: 'link',
            description: 'Initial Balances sub-link in the navbar',
        },
    },

    // ─── Chapter toolbar ─────────────────────────────────────────────────────
    export: {
        // Export-chapter-to-CSV button — visible instance only
        selector: 'button[data-automation-test="auto-button-exportChapterCsv"]:visible',
        metadata: {
            role: 'button',
            description: 'export chapter to CSV button (visible instance only) in a financial chapter page',
        },
    },

    confirmBtn: {
        // Generic modal Confirm button
        selector: 'app-our-button[data-automation-test="auto-btn-modalConfirm"]',
        metadata: {
            description: 'confirm button in a generic financial modal',
        },
    },

    // ─── Shared chapter form fields (add / edit entry) ───────────────────────
    groupField: {
        // Category / group dropdown shared across chapters
        selector: 'div[data-automation-test="auto-select-category-selectHead"]',
        metadata: {
            description: 'category/group dropdown shared across financial chapter entry forms',
        },
    },

    genaralCost: {
        // "General Cost" entry-type panel.
        // NOTE: property name keeps the source spelling ("genaralCost") for a 1:1 mapping to the legacy page object.
        selector: 'app-white-panel[data-automation-test="auto-button-type-general_cost"]',
        metadata: {
            description: 'General Cost entry-type panel in the add/edit financial entry',
        },
    },

    costType: {
        // Cost entry-type dropdown
        selector: 'div[data-automation-test="auto-input-enterType-selectHead"]',
        metadata: {
            description: 'cost entry type dropdown in the add/edit financial entry',
        },
    },

    howMuchCost: {
        // Constant cost amount input — visible instance only
        selector: 'input[data-automation-test="auto-input-constantAmount"]:visible',
        metadata: {
            description: 'cost amount input (constant, visible instance only) in the add/edit financial entry',
        },
    },

    per: {
        // Cost period dropdown
        selector: 'div[data-automation-test="auto-input-constantPeriod-selectHead"]',
        metadata: {
            description: 'cost period dropdown (per month/year) in the add/edit financial entry',
        },
    },

    startMonth: {
        // Constant cost start month
        selector: 'div[data-automation-test="auto-constant-start-dateYear-selectHead"]',
        metadata: {
            description: 'start month dropdown for a financial chapter entry',
        },
    },

    startYear: {
        // Constant cost start year
        selector: 'div[data-automation-test="auto-constant-start-dateMonth-selectHead"]',
        metadata: {
            description: 'start year dropdown for a financial chapter entry',
        },
    },

    endMonth: {
        // Constant cost end month
        selector: 'div[data-automation-test="auto-constant-end-dateYear-selectHead"]',
        metadata: {
            description: 'end month dropdown for a financial chapter entry',
        },
    },

    endYear: {
        // Constant cost end year
        selector: 'div[data-automation-test="auto-constant-end-dateMonth-selectHead"]',
        metadata: {
            description: 'end year dropdown for a financial chapter entry',
        },
    },

    growthSwitch: {
        // Toggle enabling growth on a constant cost
        selector: 'div[data-automation-test="auto-constantGrowth-switch"]',
        metadata: {
            description: 'growth toggle switch in the add/edit financial entry',
        },
    },

    growthAmount: {
        // Growth value
        selector: 'input[data-automation-test="auto-constantGrowth-value"]',
        metadata: {
            description: 'growth value input in the add/edit financial entry',
        },
    },

    growthPeriod: {
        // Growth period dropdown
        selector: 'div[data-automation-test="auto-constantGrowth-period-selectHead"]',
        metadata: {
            description: 'growth period dropdown in the add/edit financial entry',
        },
    },

    growthType: {
        // Growth type dropdown
        selector: 'div[data-automation-test="auto-constantGrowth-type"]',
        metadata: {
            description: 'growth type dropdown in the add/edit financial entry',
        },
    },

    backBtn: {
        // Back / previous-step button
        selector: 'button[data-automation-test="auto-button-formPrev"]',
        metadata: {
            role: 'button',
            description: 'Back button that returns to the previous step in the add/edit financial entry',
        },
    },

    ofRevenue: {
        // "Cost of Revenue" entry-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-cost_of_revenue"]',
        metadata: {
            description: 'Cost of Revenue entry-type panel in the add/edit financial entry',
        },
    },

    whichRevenue: {
        // Revenue selector dropdown (cost of revenue)
        selector: 'div[data-automation-test="auto-input-revSelect-selectHead"]',
        metadata: {
            description: 'which-revenue selector dropdown for a cost of revenue entry',
        },
    },

    saveAndCloseBtn: {
        // Save & close button.
        // NOTE: same selector as `saveBtn` (auto-button-formSaveOnly); kept as a separate key to mirror the legacy page object.
        selector: 'button[data-automation-test="auto-button-formSaveOnly"]',
        metadata: {
            role: 'button',
            description: 'save and close button in the add/edit financial entry',
        },
    },

    costOfExpenses: {
        // "Cost of Expenses" entry-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-cost_of_expenses"]',
        metadata: {
            description: 'Cost of Expenses entry-type panel in the add/edit financial entry',
        },
    },

    whichExpenses: {
        // Expenses selector dropdown (cost of expenses)
        selector: 'div[data-automation-test="auto-input-expensesvSelect-selectHead"]',
        metadata: {
            description: 'which-expenses selector dropdown for a cost of expenses entry',
        },
    },

    costOfExpensesRevenuesType: {
        // Over-revenue method dropdown for cost of expenses — visible instance only
        selector: 'div[data-automation-test="auto-select-overRev-method-selectHead"]:visible',
        metadata: {
            description: 'over-revenue method dropdown (visible instance only) for a cost of expenses entry',
        },
    },

    // ─── Modals / banners ────────────────────────────────────────────────────
    closeInstructionsModal: {
        // Closes the instructions modal shown when opening an empty financial chapter
        selector: 'button[data-automation-test="auto-button-closeModal"]',
        metadata: {
            role: 'button',
            description: 'close button for the instructions modal shown when opening an empty financial chapter',
        },
    },

    closeFreeTrialModal: {
        // Closes the free-trial banner — visible instance only
        selector: 'button[data-automation-test="auto-button-closeFreeTrialBanner"]:visible',
        metadata: {
            role: 'button',
            description: 'close button for the free trial banner (visible instance only)',
        },
    },

} satisfies Record<string, LocatorDefinition>;
