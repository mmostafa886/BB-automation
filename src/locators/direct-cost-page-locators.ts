import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for DirectCostSelfHealing — BznsBuilder "Add / Edit Direct Cost" pop-up.
 *
 * Converted from the legacy TestCafe page object `DirectCostPopUp.js`.
 * The pop-up opens from the direct-costs financial table when adding, editing, or
 * duplicating a direct cost and covers all three cost types: General Cost,
 * Cost of Expenses, and Cost of Revenue.
 *
 * Conversion notes:
 *   - `.filterVisible()`            → `:visible` pseudo-class appended to the CSS selector.
 *   - `.nth(n)` / `.withExactText`  → `(page) => Locator` factory selectors.
 *   - All selectors should be re-verified against https://stgapp.bznsbuilder.com/.
 */
export const directCostLocators = {

    // ─── General / shared fields ─────────────────────────────────────────────
    /*name: {
        // Direct cost name input
        selector: 'input[data-automation-test="auto-input-name"]',
        metadata: {
            role: 'textbox',
            description: 'name input in the add/edit direct cost pop-up',
        },
    },*/

    groupField: {
        // Category / group chooser — the typeable search input INSIDE the select head.
        // NOTE: `auto-select-category-selectHead` is a <div> (the select-box container) and is NOT
        // fillable — `fill()` on it throws "Element is not an <input>". The real typeable element is
        // the nested <input placeholder="Please choose group">; verified live on the direct-cost form.
        selector: 'div[data-automation-test="auto-select-category-selectHead"] input',
        metadata: {
            role: 'textbox',
            placeholder: 'Please choose group',
            description: 'category/group search input inside the add/edit direct cost pop-up select box',
        },
    },

    /*nextBtn: {
        // "Next" button advancing the pop-up wizard
        selector: 'button[data-automation-test="auto-button-formNext"]',
        metadata: {
            role: 'button',
            description: 'Next button advancing to the next step of the direct cost pop-up',
        },
    },*/

    /*backBtn: {
        // "Back" / previous button of the pop-up wizard
        selector: 'button[data-automation-test="auto-button-formPrev"]',
        metadata: {
            role: 'button',
            description: 'Back/previous button of the direct cost pop-up wizard',
        },
    },*/

   /* closeBtn: {
        // "Discard" / close button of the pop-up
        selector: 'button[data-automation-test="auto-button-formDiscard"]',
        metadata: {
            role: 'button',
            description: 'Discard/close button of the direct cost pop-up',
        },
    },*/

   /* saveAndCloseBtn: {
        // "Save Only" button that saves and closes the pop-up
        selector: 'button[data-automation-test="auto-button-formSaveOnly"]',
        metadata: {
            role: 'button',
            description: 'Save (save only) button that saves and closes the direct cost pop-up',
        },
    },*/

    // ─── Type selector panels (cost type) ────────────────────────────────────
    genaralCost: {
        // "General Cost" cost-type panel. NOTE: property name misspelled in source (`genaralCost`) — preserved verbatim for 1:1 mapping.
        selector: 'app-white-panel[data-automation-test="auto-button-type-general_cost"]',
        metadata: {
            description: 'General Cost cost-type panel in the add/edit direct cost pop-up',
        },
    },

    costOfExpenses: {
        // "Cost of Expenses" cost-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-cost_of_expenses"]',
        metadata: {
            description: 'Cost of Expenses cost-type panel in the add/edit direct cost pop-up',
        },
    },

    ofRevenue: {
        // "Cost of Revenue" cost-type panel
        selector: 'app-white-panel[data-automation-test="auto-button-type-cost_of_revenue"]',
        metadata: {
            description: 'Cost of Revenue cost-type panel in the add/edit direct cost pop-up',
        },
    },

    // ─── General Cost fields ─────────────────────────────────────────────────
    costType: {
        // "Enter type" dropdown head (constant vs varying amounts)
        selector: 'div[data-automation-test="auto-input-enterType-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'cost entry-type dropdown (constant / varying amounts) for general cost',
        },
    },

    howMuchCost: {
        // Constant amount input — visible instance only
        selector: 'input[data-automation-test="auto-input-constantAmount"]',
        metadata: {
            role: 'textbox',
            description: 'constant cost amount input (visible instance only) in the direct cost pop-up',
        },
    },

    per: {
        // Constant period dropdown head
        selector: 'div[data-automation-test="auto-input-constantPeriod-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'constant cost period dropdown (per month/year/etc.) in the direct cost pop-up',
        },
    },

    startMonth: {
        // Constant start month dropdown.
        // NOTE: source data-automation-test ends with "dateYear" for the *month* field — preserved verbatim (mirrors the same swap in the revenues page). Verify on the live app.
        selector: 'div[data-automation-test="auto-constant-start-dateYear-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'start month dropdown for a constant direct cost (data-automation-test value reads "dateYear")',
        },
    },

    startYear: {
        // Constant start year dropdown.
        // NOTE: source data-automation-test ends with "dateMonth" for the *year* field — preserved verbatim. Verify on the live app.
        selector: 'div[data-automation-test="auto-constant-start-dateMonth-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'start year dropdown for a constant direct cost (data-automation-test value reads "dateMonth")',
        },
    },

    endMonth: {
        // Constant end month dropdown.
        // NOTE: source data-automation-test ends with "dateYear" for the *month* field — preserved verbatim. Verify on the live app.
        selector: 'div[data-automation-test="auto-constant-end-dateYear-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'end month dropdown for a constant direct cost (data-automation-test value reads "dateYear")',
        },
    },

    endYear: {
        // Constant end year dropdown.
        // NOTE: source data-automation-test ends with "dateMonth" for the *year* field — preserved verbatim. Verify on the live app.
        selector: 'div[data-automation-test="auto-constant-end-dateMonth-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'end year dropdown for a constant direct cost (data-automation-test value reads "dateMonth")',
        },
    },

    // ─── Growth (constant cost) ──────────────────────────────────────────────
    growthSwitch: {
        // Toggle enabling growth for a constant cost
        selector: 'div[data-automation-test="auto-constantGrowth-switch"]',
        metadata: {
            description: 'growth toggle switch for a constant direct cost',
        },
    },

    growthAmount: {
        // Constant cost growth value
        selector: 'input[data-automation-test="auto-constantGrowth-value"]',
        metadata: {
            role: 'textbox',
            description: 'growth value input for a constant direct cost',
        },
    },

    growthPeriod: {
        // Constant cost growth period dropdown head
        selector: 'div[data-automation-test="auto-constantGrowth-period-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'growth period dropdown for a constant direct cost',
        },
    },

    growthType: {
        // Constant cost growth type
        selector: 'div[data-automation-test="auto-constantGrowth-type"]',
        metadata: {
            description: 'growth type dropdown for a constant direct cost',
        },
    },

    // ─── Cost of Expenses ────────────────────────────────────────────────────
    whichExpenses: {
        // Expense selector dropdown head
        selector: 'div[data-automation-test="auto-input-expensesvSelect-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'which-expense selector dropdown for a cost-of-expenses direct cost',
        },
    },

    // ─── Cost of Expenses / Cost of Revenue shared ───────────────────────────
    costOfExpensesRevenuesType: {
        // Over-revenue method dropdown head — visible instance only (shared by cost-of-expenses and cost-of-revenue)
        selector: 'div[data-automation-test="auto-select-overRev-method-selectHead"]:visible',
        metadata: {
            role: 'combobox',
            description: 'method/type dropdown (visible instance only) for cost-of-expenses and cost-of-revenue direct costs',
        },
    },

    // ─── Cost of Revenue ─────────────────────────────────────────────────────
    whichRevenue: {
        // Revenue selector dropdown head
        selector: 'div[data-automation-test="auto-input-revSelect-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'which-revenue selector dropdown for a cost-of-revenue direct cost',
        },
    },

    // ─── Direct-costs chapter list & toasts (RECONSTRUCTED) ───────────────────
    // NOTE: the following five entries come from the legacy `DirectCost` page object
    // (`const page = new DirectCost()`), whose source file was NOT provided. They are
    // best-effort reconstructions modeled on the Revenues precedent and MUST be verified
    // against https://stgapp.bznsbuilder.com/ before the spec is trusted.
    addNew: {
        // "Add" button at the top-right of the Direct Costs financial table.
        // RECONSTRUCTED — verify the tag/data-automation-test on the live app.
        selector: 'app-our-button[data-automation-test="auto-button-addDropdown"]',
        metadata: {
            role: 'button',
            description: 'Add button at the top-right of the Direct Costs financial table',
        },
    },

    addDirectCostBtn: {
        // The "Direct Cost" option revealed after clicking Add (two-step add for direct costs).
        // RECONSTRUCTED — the exact data-automation-test is unknown; verify on the live app.
        selector: 'div[data-automation-test="auto-button-Direct_Cost"]',
        metadata: {
            description: '"Direct Cost" option in the Add menu of the Direct Costs chapter (data-automation-test is a best guess)',
        },
    },

    addMsg: {
        // "Direct Cost Added Successfully" toast — exact text (confirmed live via semantic healing).
        // Factory getByText primary (mirrors the Revenues page) resolves instantly; the previous
        // `.dummy` placeholder forced ~2s of self-healing per assert, by which time the transient
        // toast had already faded → flaky "not visible" failures.
        selector: 'div[text()="Direct Cost Added Successfully"]',
        metadata: {
            text: 'Direct Cost Added Successfully',
            description: 'success toast shown after a direct cost is added',
        },
    },

    editMsg: {
        // "Direct Cost Modified Successfully" toast — exact text. RECONSTRUCTED text; verify wording.
        selector: 'div[text()="Direct Cost Modified Successfully"]',
        metadata: {
            text: 'Direct Cost Modified Successfully',
            description: 'success toast shown after a direct cost is modified (verify exact wording)',
        },
    },

    deleteMsg: {
        // "Direct cost deleted successfully!" toast — exact text. RECONSTRUCTED text; verify wording.
        selector: 'div[texr()="Direct cost deleted successfully!"]',
        metadata: {
            text: 'Direct cost deleted successfully!',
            description: 'success toast shown after a direct cost is deleted (verify exact wording)',
        },
    },

} satisfies Record<string, LocatorDefinition>;
