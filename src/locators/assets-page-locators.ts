import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for AssetsPageSelfHealing — BznsBuilder "Assets" page and Add/Edit Asset pop-up.
 *
 * Converted from two legacy TestCafe page objects: `AssetsPage.js` and `AssetsPopUp.js`.
 * Covers the main Assets page (add button, toast messages) and the full add/edit pop-up
 * (asset type selector, One-Time / Constant / Varying entry panels, Long Term / Current
 * classification, and optional Resell configuration).
 *
 * Conversion notes:
 *   - `.withAttribute('data-automation-test','X')` → `tag[data-automation-test="X"]` CSS.
 *   - `.withExactText('X')`                        → `'//div[text()="X"]'` XPath string (no getByText).
 *   - All selectors should be re-verified against https://stgapp.bznsbuilder.com/.
 *
 * ⚠ Quirks preserved verbatim (verify on the live app):
 *   - oneStartMonth / oneStartYear — attributes say dateYear / dateMonth respectively
 *     (names appear swapped in the legacy source); preserved as-is.
 *   - constantStartMonth / constantStartYear — same Year/Month attribute swap.
 *   - resellStartMonth / resellStartYear — same Year/Month attribute swap.
 *   - `Resell` — PascalCase property name (capital R); kept exactly as in the source.
 */
export const assetsLocators = {

    // ─── Assets page — toolbar & toast messages ───────────────────────────────

    addAssetsBtn: {
        selector: 'app-our-button[data-automation-test="auto-button-add"]',
        metadata: {
            description: '"Add Asset" button on the Assets page toolbar',
        },
    },

    addMsg: {
        // Toast shown after a new asset is saved successfully
        selector: 'div[text()="Asset Added Successfully"]',
        metadata: {
            text: 'Asset Added Successfully',
            description: 'success toast message after adding a new asset',
        },
    },

    editMsg: {
        // Toast shown after an existing asset is saved with modifications
        selector: '//div[text()="Asset Modified Successfully"]',
        metadata: {
            text: 'Asset Modified Successfully',
            description: 'success toast message after editing/modifying an existing asset',
        },
    },

    deleteMsg: {
        // Toast shown after an asset is deleted
        selector: '//div[text()="Asset deleted successfully!"]',
        metadata: {
            text: 'Asset deleted successfully!',
            description: 'success toast message after deleting an asset',
        },
    },

    // ─── Pop-up — asset entry-type selector ──────────────────────────────────

    assetType: {
        // Drop-down head that selects how the asset value will be entered
        selector: 'div[data-automation-test="auto-select-assetType-selectHead"]',
        metadata: {
            description: 'asset entry-type dropdown head (One-Time / Constant / Varying) in the add/edit asset pop-up',
        },
    },

    // ─── Pop-up — One-Time amount panel ──────────────────────────────────────

    amountOfOneTime: {
        selector: 'input[data-automation-test="auto-input-oneTimeValue"]',
        metadata: {
            role: 'textbox',
            description: 'one-time amount value input in the add/edit asset pop-up',
        },
    },

    oneStartMonth: {
        // NOTE: legacy attribute says "dateYear" but this property represents the start-month
        // selector — names appear swapped in the source. Preserved verbatim. Verify on live app.
        selector: 'div[data-automation-test="auto-oneTime-when-dateYear-selectHead"]',
        metadata: {
            description: 'one-time start-month dropdown head in the add/edit asset pop-up (⚠ attribute says dateYear — swap preserved verbatim)',
        },
    },

    oneStartYear: {
        // NOTE: legacy attribute says "dateMonth" but this property represents the start-year
        // selector — names appear swapped in the source. Preserved verbatim. Verify on live app.
        selector: 'div[data-automation-test="auto-oneTime-when-dateMonth-selectHead"]',
        metadata: {
            description: 'one-time start-year dropdown head in the add/edit asset pop-up (⚠ attribute says dateMonth — swap preserved verbatim)',
        },
    },

    // ─── Pop-up — Constant amount panel ──────────────────────────────────────

    constantValue: {
        selector: 'input[data-automation-test="auto-input-constantValue"]',
        metadata: {
            role: 'textbox',
            description: 'constant amount value input in the add/edit asset pop-up',
        },
    },

    period: {
        // Drop-down for selecting the period (per month, per year, etc.)
        selector: 'div[data-automation-test="auto-input-constantPeriod-selectHead"]',
        metadata: {
            description: 'constant-amount period dropdown head (per month / per year) in the add/edit asset pop-up',
        },
    },

    constantStartMonth: {
        // NOTE: legacy attribute says "dateYear" but this property represents the start-month
        // selector — names appear swapped in the source. Preserved verbatim. Verify on live app.
        selector: 'div[data-automation-test="auto-constant-start-dateYear-selectHead"]',
        metadata: {
            description: 'constant-amount start-month dropdown head in the add/edit asset pop-up (⚠ attribute says dateYear — swap preserved verbatim)',
        },
    },

    constantStartYear: {
        // NOTE: legacy attribute says "dateMonth" but this property represents the start-year
        // selector — names appear swapped in the source. Preserved verbatim. Verify on live app.
        selector: 'div[data-automation-test="auto-constant-start-dateMonth-selectHead"]',
        metadata: {
            description: 'constant-amount start-year dropdown head in the add/edit asset pop-up (⚠ attribute says dateMonth — swap preserved verbatim)',
        },
    },

    // ─── Pop-up — Asset classification (Long Term / Current) ─────────────────

    longTerm: {
        // "Long Term Asset" classification option
        selector: 'div[data-automation-test="auto-select-assetType-long_term"]',
        metadata: {
            description: '"Long Term Asset" classification option in the asset type selector pop-up',
        },
    },

    usefulLife: {
        // Drop-down for selecting the useful life of a long-term asset
        selector: 'div[data-automation-test="auto-select-longTermWhen-selectHead"]',
        metadata: {
            description: 'useful-life dropdown head for long-term assets in the add/edit asset pop-up',
        },
    },

    customUsefulLife: {
        // Text input for entering a custom useful-life value (2–50 years)
        selector: 'input[data-automation-test="auto-input-longTermWhen-custom"]',
        metadata: {
            role: 'textbox',
            description: 'custom useful-life number input (2–50 years) for long-term assets in the add/edit asset pop-up',
        },
    },

    current: {
        // "Current Asset" classification option
        selector: 'div[data-automation-test="auto-select-assetType-current"]',
        metadata: {
            description: '"Current Asset" classification option in the asset type selector pop-up',
        },
    },

    currentHowLong: {
        // Drop-down for selecting how long the current asset will be held
        selector: 'div[data-automation-test="auto-select-currentWhen-selectHead"]',
        metadata: {
            description: 'how-long dropdown head for current assets in the add/edit asset pop-up',
        },
    },

    // ─── Pop-up — Resell configuration (long-term assets only) ───────────────

    Resell: {
        // NOTE: PascalCase property name (capital R) — kept exactly as in the legacy source.
        // Drop-down for selecting whether the asset will be resold
        selector: 'div[data-automation-test="auto-select-resellPlan-selectHead"]',
        metadata: {
            description: '"Plan to Resell" dropdown head on the long-term asset configuration panel',
        },
    },

    resellValue: {
        selector: 'input[data-automation-test="auto-input-resellValue"]',
        metadata: {
            role: 'textbox',
            description: 'resell value amount input on the long-term asset configuration panel',
        },
    },

    resellStartMonth: {
        // NOTE: legacy attribute says "dateYear" but this property represents the resell start-month
        // selector — names appear swapped in the source. Preserved verbatim. Verify on live app.
        selector: 'div[data-automation-test="auto-resell-when-dateYear-selectHead"]',
        metadata: {
            description: 'resell start-month dropdown head on the long-term asset configuration panel (⚠ attribute says dateYear — swap preserved verbatim)',
        },
    },

    resellStartYear: {
        // NOTE: legacy attribute says "dateMonth" but this property represents the resell start-year
        // selector — names appear swapped in the source. Preserved verbatim. Verify on live app.
        selector: 'div[data-automation-test="auto-resell-when-dateMonth-selectHead"]',
        metadata: {
            description: 'resell start-year dropdown head on the long-term asset configuration panel (⚠ attribute says dateMonth — swap preserved verbatim)',
        },
    },

} satisfies Record<string, LocatorDefinition>;
