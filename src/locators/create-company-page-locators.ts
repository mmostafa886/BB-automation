import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for CreateCompanyPageSelfHealing — the "Create New Company" wizard.
 *
 * URL: /create-company (Angular component `app-create-company`).
 * Reached from the side bar: companies menu → "Create New Company".
 *
 * The whole wizard lives on ONE URL; the steps swap in place:
 *   Step 1  Which of these best describe you?   (describe cards)
 *   Step 2  Company Stage                        (Idea / Startup / Growth)
 *   Step 3  Business Information                 (type of business, industry)
 *   Step 4  Company Details                      (logo, name, tagline, legal formation, employees)
 *   Step 5  Financial                            (1st year, duration, monthly detail, format, currency, intent)
 *   Step 6  Funding                              (funding type, funds raised, additional funds, purpose)
 *   Step 7  Subscription Details                 (package cards with Subscribe)
 *   Step 8  not mapped yet — reached only after subscribing, which was not triggered while mapping.
 *
 * That 8-step shape is what an account that ALREADY has a company sees. An account creating its first
 * company lands on /create-company straight after login (no side-bar companies menu) and gets a
 * 6-step wizard: steps 1–6 as above, ending on Funding, whose primary button reads "Start Free Trial"
 * instead of "Next" — there is no Subscription Details step.
 *
 * All selectors verified live against https://uat-app.bznsbuilder.com/create-company.
 * `data-automation-test` is used wherever the app provides it (it is NOT Playwright's
 * `data-testid`, so no `testId` metadata is set).
 *
 * Dropdowns are `ng-select`: click the select to open it, then pick from `dropdownOptions`
 * (the options only exist in the DOM while the panel is open).
 */
export const createCompanyLocators = {

    // ── Entry point (side bar) ───────────────────────────────────────────────

    companiesMenuPlusIcon: {
        // Font Awesome "+" icon at the right of the company name in the side bar; opens the
        // companies menu (the company list plus Create New Company / Manage Company).
        selector: 'app-bzns-company-select svg[data-icon="plus"]',
        metadata: {
            description: 'Plus (+) icon next to the company name at the top of the side bar that opens the companies menu',
        },
    },

    companiesMenuItems: {
        // One row per company in the open companies menu (above Create New Company / Manage Company).
        selector: 'app-bzns-company-select .sidebar-submenu-item',
        metadata: {
            description: 'Company name rows listed in the open companies menu in the side bar',
        },
    },

    createNewCompanyLink: {
        // Inside the open companies menu. `a.add-new` alone also matches the sibling
        // "Manage Company" link, so narrow by text.
        selector: 'app-bzns-company-select a.add-new:has-text("Create New Company")',
        metadata: {
            text:        'Create New Company',
            description: 'Create New Company link inside the open companies menu in the side bar, opens the /create-company wizard',
        },
    },

    // ── Wizard shell (shared by every step) ──────────────────────────────────

    stepTitle: {
        // Title of the current step, e.g. "Company Stage", "Financial". Not rendered on step 1
        // (neither is the stepper) — step 1 is identified by describeHeading instead.
        selector: 'app-create-company .step-title',
        metadata: {
            description: 'Title of the current step in the create company wizard, e.g. Company Stage or Financial',
        },
    },

    stepNumbers: {
        // Every number in the stepper (1..8 for an account that already has a company).
        // Rendered from step 2 onwards — step 1 has no stepper.
        selector: 'app-create-company .steps-nums span',
        metadata: {
            description: 'All step numbers in the create company wizard stepper',
        },
    },

    activeStepNumber: {
        // Numbered stepper 1..8; the current step's span carries the `active` class.
        selector: 'app-create-company .steps-nums span.active',
        metadata: {
            description: 'Highlighted step number in the create company wizard stepper',
        },
    },

    nextButton: {
        // Disabled until the current step's required fields are filled.
        // Same element carries the final call to action: on the last step of a first-company wizard it
        // reads "Start Free Trial" instead of "Next" (verified on UAT with an account that has no company).
        selector: '[data-automation-test="auto-btn-next"]',
        metadata: {
            role:        'button',
            name:        'Next',
            text:        'Next',
            description: 'Next button that moves the create company wizard to the following step',
        },
    },

    prevButton: {
        // Not rendered on step 1. Goes back exactly one step and keeps what was entered on every step
        // (verified steps 1–4; going back to step 5 hits the date-field quirk noted on firstYearOfForecastInput).
        selector: '[data-automation-test="auto-btn-prev"]',
        metadata: {
            role:        'button',
            name:        'Prev',
            text:        'Prev',
            description: 'Prev button that moves the create company wizard back one step',
        },
    },

    dropdownOptions: {
        // Options of whichever ng-select is currently open. Filter by text in the page object.
        selector: 'ng-dropdown-panel .ng-option',
        metadata: {
            role:        'option',
            description: 'Options listed in the currently open dropdown panel of the create company wizard',
        },
    },

    // ── "Are You Sure ?" unsaved-changes dialog ──────────────────────────────
    // Opens when a company or forecast name is clicked in the side bar menus while the wizard is
    // open — even for the one already selected. The company/forecast is switched immediately
    // behind it; Close keeps the wizard on its current step.

    unsavedChangesDialog: {
        selector: 'mat-dialog-container:has(app-bzns-modal-confirm-delete)',
        metadata: {
            role:        'dialog',
            description: '"Are You Sure ?" unsaved changes dialog shown when switching company or forecast during the create company wizard',
        },
    },

    unsavedChangesDialogTitle: {
        selector: 'mat-dialog-container h5.bzns-modal-title',
        metadata: {
            text:        'Are You Sure ?',
            description: 'Title of the "Are You Sure ?" unsaved changes dialog',
        },
    },

    unsavedChangesDialogMessage: {
        // "You have unsaved changes. Do you want to save them before proceeding?"
        selector: 'mat-dialog-container app-modal-body',
        metadata: {
            description: 'Message text of the "Are You Sure ?" unsaved changes dialog',
        },
    },

    unsavedChangesDialogCloseButton: {
        selector: 'mat-dialog-container [data-automation-test="auto-btn-modalCancel"] button',
        metadata: {
            role:        'button',
            name:        'Close',
            text:        'Close',
            description: 'Close button of the "Are You Sure ?" unsaved changes dialog, keeps the wizard on its current step',
        },
    },

    unsavedChangesDialogConfirmButton: {
        // Leaves the wizard for the clicked item: a company → home page (/), a forecast → /financial/overview.
        // No company is created.
        selector: 'mat-dialog-container [data-automation-test="auto-btn-modalConfirm"] button',
        metadata: {
            role:        'button',
            name:        'Confirm',
            text:        'Confirm',
            description: 'Confirm button of the "Are You Sure ?" unsaved changes dialog',
        },
    },

    // ── Step 1: Which of these best describe you? ────────────────────────────

    describeHeading: {
        selector: 'app-create-company .describe-head h1',
        metadata: {
            role:        'heading',
            name:        'Which of these best describe you?',
            description: 'Heading "Which of these best describe you?" on the first step of the create company wizard',
        },
    },

    describeOptions: {
        // 9 cards, auto-describ-btn-1 .. auto-describ-btn-9 ("I have a business idea" .. "Other").
        // The chosen card gets the `selected` class and Next becomes enabled.
        selector: '[data-automation-test^="auto-describ-btn-"]',
        metadata: {
            description: 'Option cards on the "Which of these best describe you?" step, e.g. I have a business idea, I\'m a student, Other',
        },
    },

    // ── Step 2: Company Stage ────────────────────────────────────────────────

    stageCards: {
        // 3 cards: auto-stage-btn-idea / -startup / -growth, each titled by an <h4> ("Idea",
        // "Startup", "Growth"). None is chosen on arrival and Next is disabled; the chosen card
        // gets the `active` class and Next becomes enabled.
        selector: '[data-automation-test^="auto-stage-btn-"]',
        metadata: {
            description: 'Company stage cards (Idea, Startup, Growth) on the Company Stage step of the create company wizard',
        },
    },

    // ── Step 3: Business Information ─────────────────────────────────────────

    typeOfBusinessInput: {
        // A textarea despite the "select" in its automation id.
        selector: '[data-automation-test="auto-select-typeOfBusiness"]',
        metadata: {
            role:        'textbox',
            label:       'What type of business is this',
            description: 'What type of business is this text area on the Business Information step',
        },
    },

    industrySelect: {
        // Searchable ng-select with ~147 industries (Accounting, Airlines/Aviation, …).
        // This field alone gates Next on this step: Next stays disabled until an industry is chosen and
        // is enabled by it even when "What type of business is this" is empty (verified on UAT).
        selector: '[data-automation-test="auto-select-industry"]',
        metadata: {
            label:       'Select your business industry',
            description: 'Select your business industry dropdown on the Business Information step',
        },
    },

    industrySelectedValue: {
        // Label of the chosen industry inside the closed ng-select, e.g. "Animation".
        selector: '[data-automation-test="auto-select-industry"] .ng-value-label',
        metadata: {
            description: 'Currently selected industry shown in the industry dropdown on the Business Information step',
        },
    },

    industryGenerateSuggestionsButton: {
        // AI button in the industry column, gated by the "What type of business is this" field:
        // disabled while that field is empty, enabled once it has a value, disabled again when cleared.
        // NOTE: whitespace counts as a value — "  " enables it (seen on UAT).
        selector: 'app-create-company div.col-md-6:has([data-automation-test="auto-select-industry"]) button.ai-btn',
        metadata: {
            role:        'button',
            name:        'Generate Suggestions',
            description: 'Generate Suggestions AI button under the industry dropdown on the Business Information step',
        },
    },

    // ── Step 4: Company Details ──────────────────────────────────────────────

    companyLogoInput: {
        // Hidden file input behind the logo drop area; accepts image/x-png, image/jpeg.
        selector: 'app-create-company app-bzns-droparea input[type="file"]',
        metadata: {
            description: 'Company logo image upload input on the Company Details step',
        },
    },

    companyNameInput: {
        // The only required field on this step — Next enables once it has a value and goes back to
        // disabled when it is cleared. Whitespace does NOT count: "   " leaves Next disabled
        // (unlike the step-3 Generate Suggestions button). Verified on UAT.
        selector: '[data-automation-test="auto-input-name"]',
        metadata: {
            role:        'textbox',
            label:       'Company Name',
            description: 'Company Name input on the Company Details step',
        },
    },

    companyNameGenerateSuggestionsButton: {
        selector: 'app-create-company div.mb-3:has([data-automation-test="auto-input-name"]) button.ai-btn',
        metadata: {
            role:        'button',
            name:        'Generate Suggestions',
            description: 'Generate Suggestions AI button under the Company Name input on the Company Details step',
        },
    },

    taglineInput: {
        selector: '[data-automation-test="auto-input-tagline"]',
        metadata: {
            role:        'textbox',
            label:       'What is your business Tagline?',
            description: 'Company tagline input on the Company Details step',
        },
    },

    taglineGenerateSuggestionsButton: {
        selector: 'app-create-company div.mb-3:has([data-automation-test="auto-input-tagline"]) button.ai-btn',
        metadata: {
            role:        'button',
            name:        'Generate Suggestions',
            description: 'Generate Suggestions AI button under the Company tagline input on the Company Details step',
        },
    },

    legalFormationSelect: {
        // Options: Public limited company (plc), Private company limited by shares (LTD),
        // General partnership, Limited partnership, Limited liability partnership, …
        selector: '[data-automation-test="auto-input-legalFormation"]',
        metadata: {
            label:       'Legal formation',
            description: 'Legal formation dropdown on the Company Details step',
        },
    },

    numOfEmployeesSelect: {
        // Options: 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10001+
        selector: '[data-automation-test="auto-input-numOfEmployees"]',
        metadata: {
            label:       'No. of employees',
            description: 'No. of employees dropdown on the Company Details step',
        },
    },

    // ── Step 5: Financial ────────────────────────────────────────────────────
    // Next is gated by FOUR fields — 1st year of forecast, duration, monthly detail and number
    // format — in any order. Currency ("Dollar($)") and intent ("before") arrive pre-filled.

    firstYearOfForecastInput: {
        // Opens the material datetime picker below; value format is dd/mm/yyyy.
        // App quirk (seen on UAT): after Prev back to this step the value re-renders as a raw JS
        // Date string and the picker opens on "Invalid date" with no day cells.
        selector: 'app-create-company input[id^="date_picker"]',
        metadata: {
            role:        'textbox',
            label:       '1st year of forecast',
            description: '1st year of forecast date input on the Financial step',
        },
    },

    datePicker: {
        // The picker is appended to <body>, outside app-create-company; only the open one is visible.
        selector: '.dtp:visible',
        metadata: {
            description: 'Open date picker popup for the 1st year of forecast field',
        },
    },

    datePickerMonth: {
        // Three-letter upper-case month, e.g. "SEP".
        selector: '.dtp:visible .dtp-actual-month',
        metadata: {
            description: 'Currently shown month in the open date picker',
        },
    },

    datePickerYear: {
        selector: '.dtp:visible .dtp-actual-year',
        metadata: {
            description: 'Currently shown year in the open date picker',
        },
    },

    datePickerPrevMonthButton: {
        selector: '.dtp:visible a.dtp-select-month-before',
        metadata: {
            description: 'Previous month arrow in the open date picker',
        },
    },

    datePickerNextMonthButton: {
        selector: '.dtp:visible a.dtp-select-month-after',
        metadata: {
            description: 'Next month arrow in the open date picker',
        },
    },

    datePickerPrevYearButton: {
        selector: '.dtp:visible a.dtp-select-year-before',
        metadata: {
            description: 'Previous year arrow in the open date picker',
        },
    },

    datePickerNextYearButton: {
        selector: '.dtp:visible a.dtp-select-year-after',
        metadata: {
            description: 'Next year arrow in the open date picker',
        },
    },

    datePickerDays: {
        // Each day link sits in <td data-date="<day>">; filter by data-date in the page object.
        selector: '.dtp:visible td[data-date] a.dtp-select-day',
        metadata: {
            description: 'Day cells of the month shown in the open date picker',
        },
    },

    datePickerOkButton: {
        selector: '.dtp:visible .dtp-btn-ok',
        metadata: {
            role:        'button',
            name:        'Ok',
            text:        'Ok',
            description: 'Ok button that confirms the chosen date in the open date picker',
        },
    },

    datePickerCancelButton: {
        selector: '.dtp:visible .dtp-btn-cancel',
        metadata: {
            role:        'button',
            name:        'Cancel',
            text:        'Cancel',
            description: 'Cancel button that closes the open date picker without choosing a date',
        },
    },

    durationOptions: {
        // Custom radios 1, 2, 3, 5, 7, 10 — click the <label>; filter by exact text in the page object.
        // Each label's `for` points at an input with id "custom-radio-<years>-<instance>".
        selector: 'app-create-company app-custom-radio label',
        metadata: {
            label:       'Duration of financial plan / Years',
            description: 'Duration of financial plan in years radio options (1, 2, 3, 5, 7, 10) on the Financial step',
        },
    },

    monthlyDetailSelect: {
        // Options run "1 year of monthly detail" .. min(duration, 5) years — so the monthly detail can
        // equal the duration but never exceed it, and 5 years is the highest offered even for a 7 or
        // 10 year plan. Lowering the duration re-clamps an already-chosen value (5 → duration 2 becomes
        // "2 years of monthly detail"). Verified on UAT.
        selector: '[data-automation-test="auto-select-monthlyDetail"]',
        metadata: {
            label:       'Monthly detail',
            description: 'Monthly detail dropdown on the Financial step',
        },
    },

    monthlyDetailSelectedValue: {
        selector: '[data-automation-test="auto-select-monthlyDetail"] .ng-value-label',
        metadata: {
            description: 'Currently selected monthly detail shown in its dropdown on the Financial step',
        },
    },

    numberFormatSelectedValue: {
        selector: '[data-automation-test="auto-select-numberFormat"] .ng-value-label',
        metadata: {
            description: 'Currently selected number format shown in its dropdown on the Financial step',
        },
    },

    currencySelectedValue: {
        selector: '[data-automation-test="auto-select-currency"] .ng-value-label',
        metadata: {
            description: 'Currently selected currency shown in its dropdown on the Financial step',
        },
    },

    intentSelectedValue: {
        selector: '[data-automation-test="auto-select-intent"] .ng-value-label',
        metadata: {
            description: 'Currently selected intent shown in its dropdown on the Financial step',
        },
    },

    numberFormatSelect: {
        // Options: "1,000.00", "1.000,00"
        selector: '[data-automation-test="auto-select-numberFormat"]',
        metadata: {
            label:       'Number format',
            description: 'Number format dropdown on the Financial step',
        },
    },

    currencySelect: {
        // Defaults to Dollar($). Options: EGP(E£), Dollar($), Pound(£), Euro(€), Yen(¥), Rand(R), Rupee(Rs), Other
        selector: '[data-automation-test="auto-select-currency"]',
        metadata: {
            label:       'Currency',
            description: 'Currency dropdown on the Financial step',
        },
    },

    intentSelect: {
        // Defaults to "before". Options: before, after
        selector: '[data-automation-test="auto-select-intent"]',
        metadata: {
            label:       'Intent',
            description: 'Intent dropdown (currency symbol before or after the number) on the Financial step',
        },
    },

    // ── Step 6: Funding ──────────────────────────────────────────────────────
    // Choice chips get the `selected` class. Defaults: Bootstrapped + No.

    fundingTypeBootstrapped: {
        selector: '[data-automation-test="auto-select-fundingType-bootstrapped"]',
        metadata: {
            text:        'Bootstrapped',
            description: 'Bootstrapped choice for current funding situation on the Funding step',
        },
    },

    fundingTypeFunded: {
        // Selecting it reveals lastFundingRoundSelect and totalFundsRaisedInput.
        selector: '[data-automation-test="auto-select-fundingType-funded"]',
        metadata: {
            text:        'Funded',
            description: 'Funded choice for current funding situation on the Funding step',
        },
    },

    lastFundingRoundSelect: {
        // Visible only when Funded. Options: Bootstrapped, Pre-Seed, Seed, Series A, Series B+, Acquired / Public, Other
        selector: '[data-automation-test="auto-select-lastFundingRound"]',
        metadata: {
            label:       'Last funding round',
            description: 'Last funding round dropdown on the Funding step, shown when Funded is selected',
        },
    },

    totalFundsRaisedInput: {
        // Visible only when Funded.
        selector: '[data-automation-test="auto-input-totalFundingRaised"]',
        metadata: {
            role:        'textbox',
            label:       'Total funds raised',
            description: 'Total funds raised input on the Funding step, shown when Funded is selected',
        },
    },

    needAdditionalFundsNo: {
        selector: '[data-automation-test="auto-select-needAdditionalFund-no"]',
        metadata: {
            text:        'No',
            description: 'No choice for "Looking for additional funds?" on the Funding step',
        },
    },

    needAdditionalFundsYes: {
        // Selecting it reveals fundsSoughtInput.
        selector: '[data-automation-test="auto-select-needAdditionalFund-yes"]',
        metadata: {
            text:        'Yes',
            description: 'Yes choice for "Looking for additional funds?" on the Funding step',
        },
    },

    fundsSoughtInput: {
        // Visible only when looking for additional funds = Yes.
        selector: '[data-automation-test="auto-input-additionalFundsNum"]',
        metadata: {
            role:        'textbox',
            label:       'How much fund are you seeking?',
            description: 'How much fund are you seeking input on the Funding step, shown when Yes is selected',
        },
    },

    businessPlanningPurposeInput: {
        selector: '[data-automation-test="auto-input-fundPurpose"]',
        metadata: {
            role:        'textbox',
            label:       'What is your purpose of business planning?',
            description: 'What is your purpose of business planning input on the Funding step',
        },
    },

    // ── Step 7: Subscription Details ─────────────────────────────────────────

    billingPeriodTabs: {
        // "Monthly" | "Annually Save more!" | "Offers" — the row also holds "See Compare Features"
        // links (.text-right), which are excluded here so only the three tabs match.
        selector: 'app-payment-package-select .layers-btns > div:not(.text-right)',
        metadata: {
            description: 'Monthly / Annually / Offers billing period tabs on the Subscription Details step',
        },
    },

    activeBillingPeriodTab: {
        // Monthly is active when the step opens.
        selector: 'app-payment-package-select .layers-btns > div.active',
        metadata: {
            description: 'Currently selected billing period tab on the Subscription Details step',
        },
    },

    packageCards: {
        // ALL package cards live in the DOM at once — the monthly set (packId 9/11/12), the annual set
        // (packId 10/13/14) and the Offers card (packId136) — and the chosen tab decides which are
        // visible, so always filter by visibility. Next stays disabled on this step; the flow continues
        // through a card's Subscribe button, whose automation id embeds a backend package id, so the
        // page object scopes by package name instead.
        //
        // Card anatomy: .pack-name (Launch / Build / Decide), .pack-desc, .pack-price (monthly shows
        // one price + "paid monthly"; annual shows the original price, the discounted one and
        // "paid annually"), .pack-best ("Best for:"), .pack-action (Subscribe) and .pack-features li.
        //
        // The AMOUNT in .pack-price is regional — "EGP449" from Egypt, "$19" from the CI runner — so
        // specs assert that a price is shown, never a particular figure.
        selector: 'app-create-company .pack-card',
        metadata: {
            description: 'Subscription package cards (Launch, Build, Decide) on the Subscription Details step',
        },
    },

    selectedPackageCard: {
        // A plan is chosen with its Subscribe button, NOT by clicking the card body (that does
        // nothing). The chosen card then gains the `selected` class, its button reads "Selected"
        // instead of "Subscribe", and Next becomes enabled and leads to step 8, Payment Method.
        selector: 'app-create-company .pack-card.selected',
        metadata: {
            description: 'The subscription package card currently selected on the Subscription Details step',
        },
    },

    packageName: {
        selector: '.pack-name',
        metadata: {
            description: 'Package name inside a subscription package card',
        },
    },

    packagePrice: {
        selector: '.pack-price',
        metadata: {
            description: 'Price block of a subscription package card, holding the price and the billing period text',
        },
    },

    packageFeatures: {
        selector: '.pack-features li',
        metadata: {
            description: 'Feature rows listed on a subscription package card',
        },
    },

    packageFeatureLabels: {
        selector: '.pack-features li .text',
        metadata: {
            description: 'Feature names listed on a subscription package card',
        },
    },

    packageSubscribeButton: {
        // Selects the plan — it does NOT charge anything; payment happens on step 8. Its label flips
        // from "Subscribe" to "Selected" once its card is the chosen one.
        selector: '.pack-action app-our-button button',
        metadata: {
            role:        'button',
            name:        'Subscribe',
            text:        'Subscribe',
            description: 'Subscribe button inside a subscription package card, selects that package',
        },
    },

    // ── Step 8: Payment Method ───────────────────────────────────────────────
    // Reached from step 7 once a package is selected. Holds the saved payment methods (one radio per
    // card, the first pre-selected), an "Add new card" button and the order summary (package price,
    // promo code, VAT and total). Its primary button reads "Proceed to checkout" and CHARGES the card.

    paymentMethodPanel: {
        selector: 'app-payment-method-select',
        metadata: {
            description: 'Payment Method step panel holding the saved cards and the order summary',
        },
    },

    paymentMethodRadios: {
        // One per saved card; the first is already selected when the step opens.
        selector: 'app-payment-method-select input[type="radio"]',
        metadata: {
            description: 'Saved payment method radio buttons on the Payment Method step',
        },
    },

    addNewCardButton: {
        selector: 'app-payment-method-select app-our-button button',
        metadata: {
            role:        'button',
            name:        'Add new card',
            text:        'Add new card',
            description: 'Add new card button on the Payment Method step',
        },
    },

    orderSummary: {
        // "Order Summary <package> <price> … [VAT …] Total …". Both the amounts and the VAT line are
        // regional: an Egyptian account shows "EGP 449" plus "VAT 14%", the CI runner shows "$ 19"
        // and no VAT row at all — so specs assert the package name and that an amount is present.
        selector: 'app-payment-method-select .col-md-4',
        metadata: {
            description: 'Order summary column on the Payment Method step',
        },
    },

} satisfies Record<string, LocatorDefinition>;
