import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for DividendsPageSelfHealing — BznsBuilder "Dividends" financial chapter
 * and its Add/Edit Dividend wizard form.
 *
 * Built from a hand-recorded Playwright spec ("Dividends- Constant Amount - Yearly"). Every
 * selector below is the one the recorded test actually clicked, so the primary (Phase 1)
 * selector is known-good against https://stgapp.bznsbuilder.com/.
 *
 * Conversion notes:
 *   - `page.getByRole(...)` / `page.getByText(...)` from the recording are kept as
 *     `(page) => Locator` factory selectors — `LocatorDefinition.selector` accepts a factory
 *     precisely so Playwright built-in locators can live in this file.
 *   - `metadata` repeats the role/name/text of each element. That is not duplication: it is the
 *     input to Phase 2 semantic healing, which rebuilds the locator from meaning when the
 *     primary selector stops matching.
 *   - The entry-type dropdown and the period dropdown are NOT static entries — the first is
 *     matched by the label it currently displays and the second by the option text, so both are
 *     built at runtime inside the page object. See the ⚠ notes below.
 *
 * ⚠ Quirks preserved verbatim (verify on the live app):
 *   - The currency suffix is the real Unicode "E£" here. `assets-page-locators.ts` carries the
 *     mojibake form "EÂ£" inherited from the legacy TestCafe sources — do not copy that here.
 *   - `amountField` — the constant-amount input has no `data-automation-test` attribute yet, so
 *     it is reached as "the textbox inside <bzns-wizard-form>". It breaks if the wizard step
 *     ever renders a second textbox.
 *   - `periodSelect` — a 5-level CSS child chain with no test id. This is the most brittle
 *     selector in the file; replace it as soon as the control gets an automation attribute.
 */
export const dividendsLocators = {

    // ─── Dividends chapter — toolbar ─────────────────────────────────────────

    addDividendsBtn: {
        // "Add Dividends" button on the Dividends chapter toolbar — opens the wizard form
        selector: (page) => page.getByRole('button', { name: 'Add Dividends' }),
        metadata: {
            role:        'button',
            name:        'Add Dividends',
            text:        'Add Dividends',
            description: 'Add Dividends button on the Dividends chapter toolbar that opens the add-dividend wizard',
        },
    },

    // ─── Wizard form — fields ────────────────────────────────────────────────

    nameField: {
        // Dividend name input on step 1 of the wizard, matched by its accessible name
        selector: (page) => page.getByRole('textbox', { name: 'Enter name' }),
        metadata: {
            role:        'textbox',
            name:        'Enter name',
            placeholder: 'Enter name',
            description: 'dividend name text input in the add/edit dividend wizard',
        },
    },

    amountField: {
        // ⚠ No data-automation-test on this input — reached as the only textbox inside the
        // wizard form host element. Breaks if the step ever renders a second textbox.
        selector: (page) => page.locator('bzns-wizard-form').getByRole('textbox'),
        metadata: {
            role:        'textbox',
            description: 'constant amount value input inside the add/edit dividend wizard form',
        },
    },

    amountFieldInvalid: {
        // The amount input in its rejected state. Angular stamps `ng-invalid` on the control as
        // soon as the typed value fails the numeric format rule, and swaps it for `ng-valid` the
        // moment a well-formed number is typed - so this selector matches ONLY while the field
        // holds bad data. Lets the negative test prove the field itself is flagged, not merely
        // that an error label appeared somewhere on the page.
        selector: '[data-automation-test="auto-input-oneTimeValue"].ng-invalid',
        metadata: {
            role:        'textbox',
            description: 'dividend amount input while it is flagged invalid (Angular ng-invalid state)',
        },
    },

    // --- Wizard form - validation ------------------------------------------

    invalidFormatMsg: {
        // No automation attribute on this element - it is a bare
        // <span class="err-msg ng-star-inserted">Invalid format</span> rendered directly under
        // the amount input, so it is matched by class. Verified live on stgapp against both a
        // non-numeric value ("dummydata") and a negative number ("-100"); both render the same
        // message, so one locator covers every invalid-format case.
        selector: 'span.err-msg',
        metadata: {
            text:        'Invalid format',
            description: 'inline validation error shown under the dividend amount input when the typed value is not a valid positive number',
        },
    },

    saveAndExitBtnDisabled: {
        // The Save & Exit button is NEVER given the HTML `disabled` attribute - it is only
        // greyed out with the `not-activated` CSS class while the form is invalid, and the class
        // is dropped once the form validates. A Playwright toBeDisabled() assertion would pass
        // vacuously here, so assert on this class instead.
        selector: '[data-automation-test="auto-button-formSaveOnly"].not-activated',
        metadata: {
            role:        'button',
            name:        'Save & Exit',
            description: 'Save & Exit button in its greyed-out not-activated state while the wizard form holds invalid data',
        },
    },

    periodSelect: {
        // ⚠ Most brittle selector in this file: a 5-level CSS child chain with no test id.
        // It is the closed "per month / per year" selectbox on the constant-amount panel.
        selector: '.financial-form-section > app-bzns-selectbox-field > div > .custom-selectbox > .selectbox-value-container',
        metadata: {
            description: 'period (per month / per year) selectbox on the constant-amount panel of the dividend wizard',
        },
    },

    // ─── Wizard form — buttons ───────────────────────────────────────────────

    saveAndExitBtn: {
        // "Save & Exit" button that saves the dividend and closes the wizard.
        // NOTE: the shared financial form exposes `auto-button-formSaveOnly` for "Save & Close";
        // the dividend wizard's button is labelled "Save & Exit" and is matched by role+name here.
        selector: (page) => page.getByRole('button', { name: 'Save & Exit' }),
        metadata: {
            role:        'button',
            name:        'Save & Exit',
            text:        'Save & Exit',
            description: 'Save & Exit button that saves the dividend and closes the wizard form',
        },
    },

    // ─── Toast messages ──────────────────────────────────────────────────────

    createdMsg: {
        // Toast shown after a dividend is saved successfully
        selector: (page) => page.getByText('Dividend Created Successfully'),
        metadata: {
            text:        'Dividend Created Successfully',
            description: 'success toast message shown after a new dividend is created',
        },
    },

} satisfies Record<string, LocatorDefinition>;
