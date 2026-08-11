import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for PersonnelSelfHealing — BznsBuilder "Add / Edit Personnel" pop-up.
 *
 * Converted from the legacy TestCafe page object `PersonnelPage.js`.
 * The pop-up opens from the Personnel financial table when adding, editing, or
 * duplicating a personnel entry (individual/group, direct/regular labor, tax &
 * benefits, and the constant / % of revenue / varying salary methods).
 *
 * Conversion notes:
 *   - `.filterVisible()`  → `:visible` pseudo-class appended to the CSS selector.
 *   - `.withExactText(X)` → XPath `text()="X"` treated as an attribute-style string per
 *     the existing `direct-cost-page-locators.ts` convention in this repo.
 *   - All selectors should be re-verified against https://stgapp.bznsbuilder.com/.
 */
export const personnelLocators = {

    // ─── General / Add ────────────────────────────────────────────────────────
    addNew: {
        // "Add" dropdown button at the top-right of the Personnel financial table
        selector: 'app-our-button[data-automation-test="auto-button-addDropdown"]',
        metadata: {
            role: 'button',
            description: 'Add dropdown button at the top-right of the Personnel financial table',
        },
    },

    addEmployeeTaxesAndBenefits: {
        // "Add Personnel Taxes" option in the Add dropdown menu
        selector: 'div[data-automation-test="auto-button-PersonnelPage.Add_Personnel_Taxes"]',
        metadata: {
            description: 'Add Personnel Taxes option in the Personnel Add dropdown menu',
        },
    },

    addPersonnelBtn: {
        // "Add Personnel" option in the Add dropdown menu
        selector: 'div[data-automation-test="auto-button-PersonnelPage.AddPersonnel"]',
        metadata: {
            description: 'Add Personnel option in the Personnel Add dropdown menu',
        },
    },

    // ─── Tax ──────────────────────────────────────────────────────────────────
    taxList: {
        // Tax dropdown head in the add/edit personnel pop-up
        selector: 'div[data-automation-test="auto-select-tax-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'tax dropdown head in the add/edit personnel pop-up',
        },
    },

    newTax: {
        // "Add New Tax" option inside the tax dropdown
        selector: 'div[data-automation-test="auto-select-tax-singleOption-Add_New_Tax"]',
        metadata: {
            description: '"Add New Tax" option inside the tax dropdown of the personnel pop-up',
        },
    },

    // ─── Individual / Group & Labor type panels ─────────────────────────────────
    individual: {
        // "Individual" personnel-type panel
        selector: 'div[data-automation-test="auto-select-individual"]',
        metadata: {
            description: 'Individual personnel-type panel in the add personnel pop-up',
        },
    },

    group: {
        // "Group" personnel-type panel
        selector: 'div[data-automation-test="auto-select-group"]',
        metadata: {
            description: 'Group personnel-type panel in the add personnel pop-up',
        },
    },

    regularLabor: {
        // "Regular" labor-type panel
        selector: 'div[data-automation-test="auto-select-regular"]',
        metadata: {
            description: 'Regular labor-type panel in the add personnel pop-up',
        },
    },

    directLabor: {
        // "Direct" labor-type panel
        selector: 'div[data-automation-test="auto-select-direct"]',
        metadata: {
            description: 'Direct labor-type panel in the add personnel pop-up',
        },
    },

    // ─── Salary method (type selector) ───────────────────────────────────────
    salaryType: {
        // Salary-method dropdown head — visible instance only
        selector: 'div[data-automation-test="auto-select-salaryMethod-selectHead"]:visible',
        metadata: {
            role: 'combobox',
            description: 'salary-method dropdown head (visible instance only) in the add/edit personnel pop-up',
        },
    },

    constantType: {
        // "Constant amount" salary-method option
        selector: 'div[data-automation-test="auto-select-salaryMethod-singleOption-Constant_amount"]',
        metadata: {
            description: '"Constant amount" salary-method option in the salary-method dropdown',
        },
    },

    ofRevenueType: {
        // "% of revenue" salary-method option
        selector: 'div[data-automation-test="auto-select-salaryMethod-singleOption-%_of_revenue"]',
        metadata: {
            description: '"% of revenue" salary-method option in the salary-method dropdown',
        },
    },

    bothType: {
        // "Constant + % of revenue" salary-method option
        selector: 'div[data-automation-test="auto-select-salaryMethod-singleOption-Constant_+_%_of_revenue"]',
        metadata: {
            description: '"Constant + % of revenue" salary-method option in the salary-method dropdown',
        },
    },

    varyingType: {
        // "Varying amounts over time" salary-method option
        selector: 'div[data-automation-test="auto-select-salaryMethod-singleOption-Varying_amounts_over_time"]',
        metadata: {
            description: '"Varying amounts over time" salary-method option in the salary-method dropdown',
        },
    },

    // ─── Constant salary fields ───────────────────────────────────────────────
    howMuchCost: {
        // Constant salary amount input
        selector: 'input[data-automation-test="auto-input-constantAmount"]',
        metadata: {
            role: 'textbox',
            description: 'constant salary amount input in the add/edit personnel pop-up',
        },
    },

    per: {
        // Constant salary period dropdown head
        selector: 'div[data-automation-test="auto-select-constantPeriod-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'constant salary period dropdown (per month/year/etc.) in the personnel pop-up',
        },
    },

    annualRaises: {
        // Annual raise percentage input
        selector: 'input[data-automation-test="auto-input-annual_percentage"]',
        metadata: {
            role: 'textbox',
            description: 'annual raise percentage input in the add/edit personnel pop-up',
        },
    },

    // ─── Constant salary date range ───────────────────────────────────────────
    // NOTE: in the source, `startyear` resolves to a "...dateMonth-selectHead" data-automation-test
    // and `startMonth` resolves to "...dateYear-selectHead" (and likewise for end date) — the
    // suffixes are swapped relative to the property names. Preserved verbatim (mirrors the same
    // swap pattern already flagged in `direct-cost-page-locators.ts`). Verify on the live app.
    startyear: {
        // Constant salary start-date "year" field — NOTE: source data-automation-test reads "dateMonth". Preserved verbatim.
        selector: 'div[data-automation-test="\'auto-date-start\'-dateMonth-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'start-date year dropdown for a constant personnel salary (data-automation-test value reads "dateMonth" — preserved verbatim, verify on live app)',
        },
    },

    startMonth: {
        // Constant salary start-date "month" field — NOTE: source data-automation-test reads "dateYear". Preserved verbatim.
        selector: 'div[data-automation-test="\'auto-date-start\'-dateYear-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'start-date month dropdown for a constant personnel salary (data-automation-test value reads "dateYear" — preserved verbatim, verify on live app)',
        },
    },

    endyear: {
        // Constant salary end-date "year" field — NOTE: source data-automation-test reads "dateMonth". Preserved verbatim.
        selector: 'div[data-automation-test="\'auto-date-end\'-dateMonth-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'end-date year dropdown for a constant personnel salary (data-automation-test value reads "dateMonth" — preserved verbatim, verify on live app)',
        },
    },

    endMonth: {
        // Constant salary end-date "month" field — NOTE: source data-automation-test reads "dateYear". Preserved verbatim.
        selector: 'div[data-automation-test="\'auto-date-end\'-dateYear-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'end-date month dropdown for a constant personnel salary (data-automation-test value reads "dateYear" — preserved verbatim, verify on live app)',
        },
    },

    // ─── % of revenue salary fields ───────────────────────────────────────────
    // NOTE: source wraps the attribute value in extra literal single-quotes
    // (`"'auto-select-revenueId'-selectHead"` / `"'auto-select-revenuePercentage'"`) — an apparent
    // authoring bug in the legacy page object. Preserved verbatim; verify the real attribute on the
    // live app before trusting these two selectors.
    whichRevenue: {
        // Which-revenue dropdown head for the % of revenue / both salary methods. NOTE: literal quotes preserved verbatim from source.
        selector: 'div[data-automation-test="\'auto-select-revenueId\'-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'which-revenue dropdown head for % of revenue / constant + % of revenue salary methods (data-automation-test value has literal quotes preserved verbatim from source — verify on live app)',
        },
    },

    RevenuePercntage: {
        // Revenue percentage input. NOTE: property name misspelled in source ("Percntage") and literal quotes preserved verbatim.
        selector: 'input[data-automation-test="\'auto-select-revenuePercentage\'"]',
        metadata: {
            role: 'textbox',
            description: 'revenue percentage input for % of revenue / constant + % of revenue salary methods (property name misspelled "Percntage" and data-automation-test has literal quotes — both preserved verbatim from source, verify on live app)',
        },
    },

    // ─── Group employee count ─────────────────────────────────────────────────
    noOfEmployeesType: {
        // Number-of-employees entry-type dropdown head (constant vs varying) for a group
        selector: 'div[data-automation-test="auto-input-groupNum-selectHead"]',
        metadata: {
            role: 'combobox',
            description: 'number-of-employees entry-type dropdown (constant/varying) for a group personnel entry',
        },
    },

    noOfEmployees: {
        // Constant number-of-employees amount input for a group
        selector: 'input[data-automation-test="auto-input-groupNum"]',
        metadata: {
            role: 'textbox',
            description: 'constant number-of-employees amount input for a group personnel entry',
        },
    },

    groupConstant: {
        // "Constant amount" option for the number-of-employees entry type
        selector: 'div[data-automation-test="auto-input-groupNum-singleOption-Constant_amount"]',
        metadata: {
            description: '"Constant amount" option for the group number-of-employees entry-type dropdown',
        },
    },

    groupVarying: {
        // "Varying amounts over time" option for the number-of-employees entry type
        selector: 'div[data-automation-test="auto-input-groupNum-singleOption-Varying_amounts_over_time"]',
        metadata: {
            description: '"Varying amounts over time" option for the group number-of-employees entry-type dropdown',
        },
    },

    // ─── Toasts ───────────────────────────────────────────────────────────────
    addMsg: {
        // "Personnel Added Successfully" toast — exact text. Tag-agnostic (`//*` +
        // normalize-space) because the toast's actual leaf element/tag couldn't be
        // pinned down live (it renders and clears too fast for a manual DOM probe to
        // catch), and a `div`-specific match with an unnormalized string was proven live
        // to match nothing even while the message was confirmed present in the page.
        selector: '//*[normalize-space(text())="Personnel Added Successfully"]',
        metadata: {
            text: 'Personnel Added Successfully',
            description: 'success toast shown after a personnel entry is added',
        },
    },

    editMsg: {
        // "Personnel Modified Successfully" toast — exact text
        selector: '//div[text()="Personnel Modified Successfully"]',
        metadata: {
            text: 'Personnel Modified Successfully',
            description: 'success toast shown after a personnel entry is modified',
        },
    },

    deleteMsg: {
        // "Personnel deleted successfully!" toast — exact text
        selector: '//div[text()="Personnel deleted successfully!"]',
        metadata: {
            text: 'Personnel deleted successfully!',
            description: 'success toast shown after a personnel entry is deleted',
        },
    },

} satisfies Record<string, LocatorDefinition>;
