import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for RealityCheckSelfHealing — the BznsBuilder
 * "Financial Reality Check" wizard.
 *
 * Reached via: login -> "Reality Check" in the left sidebar
 * (URL: /reality-check-dashboard/reality-check).
 *
 * The wizard is a 7-step flow (Idea, Customer, Revenue, Costs, Signals, Timeline, Reality).
 * Only steps 1 and 2 are covered here; add the remaining steps as sections below when
 * they are automated.
 *
 * ⚠ RENDER TIMING (step 1): the six business-category cards arrive a few seconds AFTER the
 * idea textarea is present — they are fetched separately. Before touching a category card,
 * wait for the last one, e.g. `[data-automation-test="auto-industry-6"]`.
 *
 * ⚠ SHARED CHROME: `stepIndicator`, `activeStep`, `passedStep`, `stepTitle`,
 * `continueButton`, `backButton`, `selectBoxHead` and `selectBoxOptionsContainer` are the
 * same elements on every step — they are declared ONCE, under "Wizard chrome", and reused.
 *
 * ⚠ CUSTOM SELECT BOXES: each select now has its own automation prefix —
 * `auto-select-country-…` on step 1, `auto-select-currency-…` on step 2:
 *   head:   [data-automation-test="auto-select-<field>-selectHead"]
 *   option: [data-automation-test="auto-select-<field>-singleOption-<Value>"]
 * Options are value-dependent, so they are NOT declared here — build them at runtime.
 * (The old shared "undefined-selectHead" / "undefined-singleOption-<Value>" attributes are gone.)
 *
 * ⚠ Clicking the inner input does NOT open the dropdown — click the select head instead.
 * The inner input's placeholder is replaced by the selected value ("Select Country" ->
 * "Egypt"), so it is matched through the head, never by placeholder.
 *
 * ⚠ `continueButton` / `backButton` attributes sit on the <app-our-button> wrapper; the
 * selectors step into the inner <button> so that enabled/disabled assertions work.
 */
export const realityCheckLocators = {

    // ═══════════════════════════════════════════════════════════════════════════
    // Entry point
    // ═══════════════════════════════════════════════════════════════════════════

    realityCheckSidebarLink: {
        // Left-sidebar link; carries no data-automation-test, so the routerLink href is the
        // most stable handle available.
        selector: 'a[href="/reality-check-dashboard/reality-check"]',
        metadata: {
            role:        'link',
            name:        'Reality Check',
            text:        'Reality Check',
            description: 'Reality Check link in the BznsBuilder left sidebar that opens the Financial Reality Check wizard',
        },
    },

    financialRealityCheckTab: {
        // Top-navbar tab; the sibling tab is auto-navbar-link-Pitch_Deck
        selector: '[data-automation-test="auto-navbar-link-Financial_Reality_Check"]',
        metadata: {
            role:        'link',
            name:        'Financial Reality Check',
            text:        'Financial Reality Check',
            description: 'Financial Reality Check tab in the top navbar of the Reality Check dashboard',
        },
    },

    pitchDeckTab: {
        selector: '[data-automation-test="auto-navbar-link-Pitch_Deck"]',
        metadata: {
            role:        'link',
            name:        'Pitch Deck',
            text:        'Pitch Deck',
            description: 'Pitch Deck tab in the top navbar of the Reality Check dashboard',
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Wizard chrome — identical on every step
    // ═══════════════════════════════════════════════════════════════════════════

    wizardHeading: {
        // <h2> with the second half in a coloured <span>, so match the accessible name
        selector: (page) => page.getByRole('heading', { level: 2, name: 'Is your idea worth your money?' }),
        metadata: {
            role:        'heading',
            name:        'Is your idea worth your money?',
            text:        'Is your idea worth your money?',
            description: 'Main heading of the Financial Reality Check wizard, shown above the step indicator on every step',
        },
    },

    stepIndicator: {
        // Container of the 7 step chips; each chip is auto-step-<Name>
        // (Idea, Customer, Revenue, Costs, Signals, Timeline, Reality)
        selector: '[data-automation-test="auto-stepper"]',
        metadata: {
            description: 'Seven-step progress indicator across the top of the Financial Reality Check wizard',
        },
    },

    activeStep: {
        // The step chip currently being filled in
        selector: '[data-automation-test="auto-stepper"] > div.active',
        metadata: {
            description: 'Currently active step chip in the Financial Reality Check step indicator',
        },
    },

    passedStep: {
        // Any completed step chip — used to assert an earlier step was left behind
        selector: '[data-automation-test="auto-stepper"] > div.passed',
        metadata: {
            description: 'Completed step chip in the Financial Reality Check step indicator, marking a step already filled in',
        },
    },

    stepTitle: {
        // No automation attribute. Text varies per step ("Start with the idea",
        // "Who's your customer?", …) — assert the expected text from the page object.
        selector: 'h3.step-title',
        metadata: {
            role:        'heading',
            description: 'Heading of the current step of the Financial Reality Check wizard, e.g. "Start with the idea" on step 1',
        },
    },

    continueButton: {
        // Green submit button; stays disabled until the current step is valid
        selector: '[data-automation-test="auto-btn-proceed"] button',
        metadata: {
            role:        'button',
            name:        'Continue',
            text:        'Continue',
            description: 'Green Continue button that advances the Financial Reality Check wizard to the next step',
        },
    },

    backButton: {
        // Grey button; rendered from step 2 onwards only, so its presence marks "not step 1"
        selector: '[data-automation-test="auto-btn-back"] button',
        metadata: {
            role:        'button',
            name:        'Back',
            text:        'Back',
            description: 'Grey Back button in the Financial Reality Check wizard that returns to the previous step',
        },
    },

    selectBoxHead: {
        // Head of whichever select box the current step shows — country on step 1, currency
        // on step 2. Only one select is rendered per step, so the suffix match is unambiguous.
        // Prefer countrySelectHead / currencySelectHead when the step is known.
        selector: '[data-automation-test^="auto-select-"][data-automation-test$="-selectHead"]',
        metadata: {
            description: 'Clickable head of the current step\'s select box in the Financial Reality Check wizard, which opens its options list',
        },
    },

    selectBoxOptionsContainer: {
        // Rendered only while a select box is open
        selector: 'div.selectbox-options-container',
        metadata: {
            description: 'Dropdown panel listing the options of the current step\'s select box in the Financial Reality Check wizard',
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Live Financial Preview — right-hand side panel, present on every step
    // ═══════════════════════════════════════════════════════════════════════════

    livePreviewPanel: {
        selector: '[data-automation-test="auto-live-preview-panel"]',
        metadata: {
            description: 'Live Financial Preview side panel of the Financial Reality Check wizard',
        },
    },

    viabilityScore: {
        // Number inside the viability ring, e.g. "0" before step 1 is filled
        selector: '[data-automation-test="auto-preview-score"]',
        metadata: {
            description: 'Viability score number in the Live Financial Preview panel of the Financial Reality Check wizard',
        },
    },

    progressSummary: {
        // e.g. "Start with the business idea" / "Not enough information yet"
        selector: '[data-automation-test="auto-preview-progress-summary"]',
        metadata: {
            description: 'Progress summary text under the viability score in the Live Financial Preview panel',
        },
    },

    monthlyRevenueValue: {
        // The rendered figure inside the "Monthly revenue" stat, e.g. "EGP 150000".
        //
        // ⚠ The text carries BOTH the currency code and the amount in one string, with NO
        // thousands separator ("EGP 150000", not "EGP 150,000"). The currency prefix follows
        // the currency chosen on step 2.
        //
        // ⚠ Empty state: before both inputs are filled — and after either is cleared —
        // this renders "-" rather than a number.
        selector: '[data-automation-test="auto-preview-monthly-revenue"]',
        metadata: {
            description: 'Monthly revenue figure in the Live Financial Preview side panel of the Financial Reality Check wizard, rendered as currency code plus amount (e.g. "EGP 150000")',
        },
    },

    monthlyBurnValue: {
        selector: '[data-automation-test="auto-preview-monthly-burn"]',
        metadata: {
            description: 'Monthly burn figure in the Live Financial Preview side panel of the Financial Reality Check wizard',
        },
    },

    netPositionValue: {
        selector: '[data-automation-test="auto-preview-net-position"]',
        metadata: {
            description: 'Net position figure in the Live Financial Preview side panel of the Financial Reality Check wizard',
        },
    },

    runwayValue: {
        selector: '[data-automation-test="auto-preview-runway"]',
        metadata: {
            description: 'Runway figure in the Live Financial Preview side panel of the Financial Reality Check wizard',
        },
    },

    survivalMonth1: {
        // Siblings: auto-preview-survival-month-3, auto-preview-survival-month-6
        selector: '[data-automation-test="auto-preview-survival-month-1"]',
        metadata: {
            description: 'M1 cell of the Survival Timeline in the Live Financial Preview panel',
        },
    },

    survivalMonth3: {
        selector: '[data-automation-test="auto-preview-survival-month-3"]',
        metadata: {
            description: 'M3 cell of the Survival Timeline in the Live Financial Preview panel',
        },
    },

    survivalMonth6: {
        selector: '[data-automation-test="auto-preview-survival-month-6"]',
        metadata: {
            description: 'M6 cell of the Survival Timeline in the Live Financial Preview panel',
        },
    },

    industryLens: {
        // Rendered once a business category is picked on step 1
        selector: '[data-automation-test="auto-preview-industry-lens"]',
        metadata: {
            description: 'Industry Lens card in the Live Financial Preview panel, showing context for the chosen business category',
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 1 — Idea  ("Start with the idea")
    // ═══════════════════════════════════════════════════════════════════════════

    businessIdeaTextarea: {
        // Free-text idea field, capped at 300 characters
        selector: '[data-automation-test="auto-input-idea"]',
        metadata: {
            role:        'textbox',
            placeholder: 'e.g. A premium Egyptian cotton bedding brand selling to expats, tourists, and boutique hotels online...',
            description: 'Business idea textarea on step 1 of the Financial Reality Check wizard, limited to 300 characters',
        },
    },

    // ── Business category — auto-industry-1 … auto-industry-6 ───────────────

    productEcommerceCategoryOption: {
        selector: '[data-automation-test="auto-industry-1"]',
        metadata: {
            text:        'Product / E-commerce',
            description: 'Product / E-commerce business-category card on step 1 of the Financial Reality Check wizard',
        },
    },

    foodAndBeverageCategoryOption: {
        selector: '[data-automation-test="auto-industry-2"]',
        metadata: {
            text:        'Food & Beverage',
            description: 'Food & Beverage business-category card on step 1 of the Financial Reality Check wizard',
        },
    },

    serviceBusinessCategoryOption: {
        selector: '[data-automation-test="auto-industry-3"]',
        metadata: {
            text:        'Service business',
            description: 'Service business category card on step 1 of the Financial Reality Check wizard',
        },
    },

    saasDigitalCategoryOption: {
        selector: '[data-automation-test="auto-industry-4"]',
        metadata: {
            text:        'SaaS / Digital',
            description: 'SaaS / Digital business-category card on step 1 of the Financial Reality Check wizard',
        },
    },

    educationCategoryOption: {
        selector: '[data-automation-test="auto-industry-5"]',
        metadata: {
            text:        'Education',
            description: 'Education business-category card on step 1 of the Financial Reality Check wizard',
        },
    },

    otherCategoryOption: {
        selector: '[data-automation-test="auto-industry-6"]',
        metadata: {
            text:        'Other',
            description: 'Other business-category card on step 1 of the Financial Reality Check wizard',
        },
    },

    // ── Country ──────────────────────────────────────────────────────────────
    // Options: [data-automation-test="auto-select-country-singleOption-<Country>"]

    countrySelectHead: {
        selector: '[data-automation-test="auto-select-country-selectHead"]',
        metadata: {
            description: 'Clickable head of the country select box on step 1 of the Financial Reality Check wizard, which opens the country list',
        },
    },

    countryInput: {
        // Transparent text input inside the head. Its placeholder becomes the chosen value,
        // so use it to assert the selection; NOT for opening the dropdown.
        selector: '[data-automation-test="auto-select-country-selectHead"] input',
        metadata: {
            role:        'textbox',
            placeholder: 'Select Country',
            description: 'Country select input on step 1 of the Financial Reality Check wizard',
        },
    },

    // ── Where are you right now? — auto-stage-0 … auto-stage-2 ──────────────

    testingAnIdeaStageOption: {
        selector: '[data-automation-test="auto-stage-0"]',
        metadata: {
            text:        'Testing an idea',
            description: 'Testing an idea stage card under "Where are you right now?" on step 1 of the Financial Reality Check wizard',
        },
    },

    preparingToLaunchStageOption: {
        selector: '[data-automation-test="auto-stage-1"]',
        metadata: {
            text:        'Preparing to launch',
            description: 'Preparing to launch stage card under "Where are you right now?" on step 1 of the Financial Reality Check wizard',
        },
    },

    alreadyRunningStageOption: {
        selector: '[data-automation-test="auto-stage-2"]',
        metadata: {
            text:        'Already running',
            description: 'Already running stage card under "Where are you right now?" on step 1 of the Financial Reality Check wizard',
        },
    },

    // ═══════════════════════════════════════════════════════════════════════════
    // Step 2 — Customer  ("Who's your customer?")
    // ═══════════════════════════════════════════════════════════════════════════

    // ── Currency ─────────────────────────────────────────────────────────────
    // Options: [data-automation-test="auto-select-currency-singleOption-<Code>"]
    // ⚠ pricePerUnitInput stays disabled until a currency is chosen.

    currencySelectHead: {
        selector: '[data-automation-test="auto-select-currency-selectHead"]',
        metadata: {
            description: 'Clickable head of the currency select box on step 2 of the Financial Reality Check wizard, which opens the currency list',
        },
    },

    currencyInput: {
        // Transparent text input inside the head; placeholder becomes the chosen code
        selector: '[data-automation-test="auto-select-currency-selectHead"] input',
        metadata: {
            role:        'textbox',
            placeholder: 'Select Currency',
            description: 'Currency select input on step 2 of the Financial Reality Check wizard',
        },
    },

    // ── Customer type ────────────────────────────────────────────────────────

    individualsB2cOption: {
        selector: '[data-automation-test="auto-customer-type-b2c"]',
        metadata: {
            text:        'Individuals (B2C)',
            description: 'Individuals (B2C) customer-type card on step 2 of the Financial Reality Check wizard',
        },
    },

    businessesB2bOption: {
        selector: '[data-automation-test="auto-customer-type-b2b"]',
        metadata: {
            text:        'Businesses (B2B)',
            description: 'Businesses (B2B) customer-type card on step 2 of the Financial Reality Check wizard',
        },
    },

    bothHybridOption: {
        selector: '[data-automation-test="auto-customer-type-hybrid"]',
        metadata: {
            text:        'Both (Hybrid)',
            description: 'Both (Hybrid) customer-type card on step 2 of the Financial Reality Check wizard',
        },
    },

    // ── Numeric inputs ───────────────────────────────────────────────────────
    // Each has ▲/▼ stepper buttons: auto-btn-<field>-increase / auto-btn-<field>-decrease

    expectedCustomersInput: {
        // "Expected paying customers — month one"
        selector: '[data-automation-test="auto-input-customersCountMonthOne"]',
        metadata: {
            role:        'spinbutton',
            placeholder: '0',
            description: 'Expected paying customers in month one — numeric input on step 2 of the Financial Reality Check wizard',
        },
    },

    expectedCustomersIncreaseButton: {
        selector: '[data-automation-test="auto-btn-customersCountMonthOne-increase"]',
        metadata: {
            role:        'button',
            description: 'Increase (▲) stepper button of the expected-customers input on step 2 of the Financial Reality Check wizard',
        },
    },

    expectedCustomersDecreaseButton: {
        selector: '[data-automation-test="auto-btn-customersCountMonthOne-decrease"]',
        metadata: {
            role:        'button',
            description: 'Decrease (▼) stepper button of the expected-customers input on step 2 of the Financial Reality Check wizard',
        },
    },

    pricePerUnitInput: {
        // "Price per product or service" — disabled until a currency is selected
        selector: '[data-automation-test="auto-input-pricePerProduct"]',
        metadata: {
            role:        'spinbutton',
            placeholder: '0',
            description: 'Price per product or service — numeric input on step 2 of the Financial Reality Check wizard',
        },
    },

    pricePerUnitCurrencyPrefix: {
        // <span> before the price input showing the selected currency code (e.g. "EGP").
        // No automation attribute on it, so it is reached through the input's wrapper.
        selector: 'div.number-field:has([data-automation-test="auto-input-pricePerProduct"]) > span',
        metadata: {
            description: 'Currency code prefix shown before the price input on step 2 of the Financial Reality Check wizard, matching the selected currency',
        },
    },

    pricePerUnitIncreaseButton: {
        selector: '[data-automation-test="auto-btn-pricePerProduct-increase"]',
        metadata: {
            role:        'button',
            description: 'Increase (▲) stepper button of the price input on step 2 of the Financial Reality Check wizard',
        },
    },

    pricePerUnitDecreaseButton: {
        selector: '[data-automation-test="auto-btn-pricePerProduct-decrease"]',
        metadata: {
            role:        'button',
            description: 'Decrease (▼) stepper button of the price input on step 2 of the Financial Reality Check wizard',
        },
    },

    requiredFieldError: {
        // Inline validation message shown under an empty required field — no automation attribute on it
        selector: 'span.field-error:has-text("This field is required")',
        metadata: {
            description: 'Inline "This field is required" validation error shown under an empty required input in the Financial Reality Check wizard',
        },
    },

    minValueFieldError: {
        // Inline validation message shown when a numeric field holds a negative value — no automation attribute on it
        selector: 'span.field-error:has-text("Enter a number greater than or equal 0")',
        metadata: {
            description: 'Inline "Enter a number greater than or equal 0" validation error shown under a numeric input holding a negative value in the Financial Reality Check wizard',
        },
    },

    wholeNumberFieldError: {
        // Inline validation message shown when an integer-only field (e.g. expected customers)
        // holds a negative or decimal value — no automation attribute on it
        selector: 'span.field-error:has-text("Enter a whole number greater than or equal 0")',
        metadata: {
            description: 'Inline "Enter a whole number greater than or equal 0" validation error shown under an integer-only input holding a negative or decimal value in the Financial Reality Check wizard',
        },
    },

    insightWarning: {
        // Insight warning card — no automation attribute on it, and its title/message text
        // varies, so it is matched by class only
        selector: 'div.insight-warning.warning',
        metadata: {
            description: 'Insight warning card in the Financial Reality Check wizard',
        },
    },

    insightSuccess: {
        // Insight success card — same component as insightWarning but with the "success"
        // modifier; its title/message text varies, so it is matched by class only
        selector: 'div.insight-warning.success',
        metadata: {
            description: 'Insight success card in the Financial Reality Check wizard',
        },
    },

} satisfies Record<string, LocatorDefinition>;
