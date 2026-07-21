import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for IndirectCostPageSelfHealing — BznsBuilder "Add / Edit Indirect Cost"
 * (Expenses chapter) page.
 *
 * Converted from the legacy TestCafe page objects `IndirectCost.js` and `IndirectCostPopUp.js`.
 * `IndirectCostPopUp.js` was empty — all shared form fields (name, cost type, amounts, periods,
 * growth, cost-type panels, etc.) are provided by `FinancialDashboardSelfHealing` and live in
 * `financial-dashboard-locators.ts`. This file contains only the selectors that were unique to
 * `IndirectCost.js`.
 *
 * All selectors should be re-verified against https://stgapp.bznsbuilder.com/.
 */
export const indirectCostLocators = {

    addExpensesBtn: {
        // "Add" button on the Indirect Costs / Expenses chapter list
        selector: 'app-our-button[data-automation-test="auto-button-add"]',
        metadata: {
            role: 'button',
            description: 'Add button on the Indirect Costs (Expenses) chapter list',
        },
    },

    addMsg: {
        // "Expenses Added Successfully" toast — exact text from the legacy source
        selector: 'div[text()="Expenses Added Successfully"]',
        metadata: {
            text: 'Expenses Added Successfully',
            description: 'success toast shown after an indirect cost (expense) is added',
        },
    },

    editMsg: {
        // "Expenses Modified Successfully" toast — exact text from the legacy source
        selector: 'div[text()="Expenses Modified Successfully"]',
        metadata: {
            text: 'Expenses Modified Successfully',
            description: 'success toast shown after an indirect cost (expense) is modified',
        },
    },

    deleteMsg: {
        // "Expenses deleted successfully!" toast — exact text from the legacy source
        selector: 'div[text()="Expenses deleted successfully!"]',
        metadata: {
            text: 'Expenses deleted successfully!',
            description: 'success toast shown after an indirect cost (expense) is deleted',
        },
    },

} satisfies Record<string, LocatorDefinition>;
