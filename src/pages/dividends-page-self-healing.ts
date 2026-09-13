import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { dividendsLocators } from '../locators/dividends-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * DividendsPageSelfHealing — Page Object for the BznsBuilder "Dividends" financial chapter
 * and its Add/Edit Dividend wizard form.
 *
 * Scope: this class owns only what is specific to the Dividends chapter. Everything shared is
 * delegated to page objects that already exist — do not duplicate them here:
 *   - login                      → `LoginPageSelfHealing`
 *   - Forecast / Financial Plan  → `HomePageSelfHealing.openFinancialPlan()`
 *   - Financial Tables → Dividends → `FinancialDashboardSelfHealing.openFinancialTables()` +
 *                                    `.goToDividends()`
 *   - the "×" instructions modal → `FinancialDashboardSelfHealing.dismissInstructionsModal()`
 *
 * Built from a hand-recorded Playwright spec ("Dividends- Constant Amount - Yearly").
 *
 * ## Deliberate differences from the recording
 *   - `dblclick()` before filling the name is dropped: `AdvancedActionsHelper.fill()` clears the
 *     field before typing, so the select-all double-click is redundant.
 *   - `page.getByText('Dividend Created Successfully').click()` becomes a real visibility
 *     assertion. Clicking a toast only proves it exists as a side effect and leaves a stray
 *     click in the report; {@link assertCreatedMsg} states the intent and logs as an assertion.
 *   - Both changes are behaviour-preserving; every selector is byte-for-byte the recorded one.
 */
export class DividendsPageSelfHealing extends SelfHealingPageBase {
    // ─── Dividends chapter — toolbar ─────────────────────────────────────────
    readonly addDividendsBtn: SelfHealingLocator;

    // ─── Wizard form — fields ────────────────────────────────────────────────
    readonly nameField:    SelfHealingLocator;
    readonly amountField:  SelfHealingLocator;
    readonly periodSelect: SelfHealingLocator;

    // ─── Wizard form — buttons & toasts ──────────────────────────────────────
    readonly saveAndExitBtn: SelfHealingLocator;
    readonly createdMsg:     SelfHealingLocator;

    // --- Validation (negative-path) state ------------------------------------
    readonly amountFieldInvalid:     SelfHealingLocator;
    readonly invalidFormatMsg:       SelfHealingLocator;
    readonly saveAndExitBtnDisabled: SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`DividendsPageSelfHealing-${testName}`);
        const L      = dividendsLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        this.addDividendsBtn = make(L.addDividendsBtn);
        this.nameField       = make(L.nameField);
        this.amountField     = make(L.amountField);
        this.periodSelect    = make(L.periodSelect);
        this.saveAndExitBtn  = make(L.saveAndExitBtn);
        this.createdMsg      = make(L.createdMsg);

        this.amountFieldInvalid     = make(L.amountFieldInvalid);
        this.invalidFormatMsg       = make(L.invalidFormatMsg);
        this.saveAndExitBtnDisabled = make(L.saveAndExitBtnDisabled);
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Actions
    // ═════════════════════════════════════════════════════════════════════════

    /** Open the add-dividend wizard from the chapter toolbar. */
    async clickAddDividends(): Promise<void> {
        await test.step('Click "Add Dividends" to open the wizard', async () => {
            await this.actions.click(await this.addDividendsBtn.get(), 'Click Add Dividends button');
        });
    }

    /** Fill the dividend name on step 1 of the wizard. */
    async fillName(name: string): Promise<void> {
        await test.step(`Fill dividend name: "${name}"`, async () => {
            // fill() clears the field first, so the recording's dblclick select-all is not needed.
            await this.actions.fill(await this.nameField.get(), name, 'Fill dividend name field');
        });
    }

    /**
     * Change the dividend entry type, e.g. from "One time amount (E£)" to "Constant amount (E£)".
     *
     * ⚠ The closed selectbox has no stable attribute, so it is matched by the label it is
     * currently displaying. That means the caller must pass the *current* label as well as the
     * target one, and both must match the live app exactly (including the "E£" suffix).
     *
     * @param currentType - label shown on the closed dropdown before opening it
     * @param targetType  - label of the option to pick
     */
    async selectEntryType(currentType: string, targetType: string): Promise<void> {
        await test.step(`Change dividend type from "${currentType}" to "${targetType}"`, async () => {
            await this.actions.click(
                this.page.getByText(currentType),
                `Open dividend type dropdown (currently "${currentType}")`,
            );
            await this.actions.clickOption(
                this.page.getByText(targetType),
                `Select dividend type "${targetType}"`,
            );
        });
    }

    /** Fill the constant-amount value on the wizard's amount panel. */
    async fillConstantAmount(amount: string): Promise<void> {
        await test.step(`Fill constant amount: ${amount}`, async () => {
            await this.actions.fill(await this.amountField.get(), amount, 'Fill constant amount value');
        });
    }

    /**
     * Open the period selectbox and pick a period option ("Month" / "Year").
     *
     * The option is matched by exact text, so "Year" does not also match "Yearly".
     */
    async selectPeriod(period: string): Promise<void> {
        await test.step(`Select dividend period: "${period}"`, async () => {
            await this.actions.click(await this.periodSelect.get(), 'Open dividend period dropdown');
            await this.actions.clickOption(
                this.page.getByText(period, { exact: true }),
                `Select period "${period}"`,
            );
        });
    }

    /** Save the dividend and close the wizard. */
    async clickSaveAndExit(): Promise<void> {
        await test.step('Click "Save & Exit"', async () => {
            await this.actions.click(await this.saveAndExitBtn.get(), 'Click Save & Exit button');
        });
    }

    /**
     * Open the add-dividend wizard and name the dividend, stopping before any amount is entered.
     *
     * The entry point for the negative-path test, which then types one invalid amount after
     * another into the same open wizard. It deliberately leaves the entry type on
     * "One time amount (E£)" - the type the wizard already opens on - because the amount field
     * and its format rule are the same control on every entry type, so switching type would add
     * a dropdown interaction without adding coverage.
     */
    async openWizardAndFillName(name: string): Promise<void> {
        await test.step(`Open the dividend wizard and name it "${name}"`, async () => {
            await this.clickAddDividends();
            await this.fillName(name);
        });
    }

    /**
     * Create a constant-amount dividend end-to-end: open the wizard, name it, switch the entry
     * type, enter the amount, choose the period, then save and exit.
     *
     * This is the single call a spec makes — it keeps the whole form-filling sequence, and the
     * order the app requires, inside the page object.
     */
    async addConstantAmountDividend(input: DividendInput): Promise<void> {
        await test.step(`Add a constant-amount dividend: "${input.name}"`, async () => {
            await this.clickAddDividends();
            await this.fillName(input.name);
            await this.selectEntryType(input.currentType, input.entryType);
            await this.fillConstantAmount(input.amount);
            await this.selectPeriod(input.period);
            await this.clickSaveAndExit();
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    //  Assertions
    // ═════════════════════════════════════════════════════════════════════════

    /** Assert the "Dividend Created Successfully" toast is shown after saving. */
    async assertCreatedMsg(): Promise<void> {
        await test.step('Assert the dividend-created toast is shown', async () => {
            await this.assert.toBeVisible(
                await this.createdMsg.get(),
                '"Dividend Created Successfully" toast is visible',
            );
        });
    }

    /**
     * Assert the wizard rejected the amount that was just typed.
     *
     * Checks all three signals the app raises together, because each one alone is weak:
     *   1. the inline "Invalid format" message is shown under the field;
     *   2. the amount input itself carries Angular's `ng-invalid` class;
     *   3. Save & Exit is greyed out via the `not-activated` class.
     *
     * (3) is asserted through a dedicated locator rather than `toBeDisabled()`. The button never
     * receives the HTML `disabled` attribute, so `toBeDisabled()` would report a pass no matter
     * what the app did - a silently useless assertion.
     *
     * @param expectedError - the message expected under the field, e.g. "Invalid format"
     */
    async assertAmountRejected(expectedError: string): Promise<void> {
        await test.step(`Assert the amount was rejected with "${expectedError}"`, async () => {
            await this.assert.toContainText(
                await this.invalidFormatMsg.get(),
                expectedError,
                `Inline validation error "${expectedError}" is shown under the amount field`,
            );
            await this.assert.toBeVisible(
                await this.amountFieldInvalid.get(),
                'Amount input is flagged invalid (ng-invalid)',
            );
            await this.assert.toBeVisible(
                await this.saveAndExitBtnDisabled.get(),
                'Save & Exit is greyed out (not-activated) while the form is invalid',
            );
        });
    }

    /**
     * Assert the invalid dividend was not created: no success toast appeared, and the wizard is
     * still open on the amount field instead of returning to the chapter table.
     *
     * Run this after {@link attemptSaveWithInvalidAmount} - together they are what makes the test
     * a real rejection check rather than a check that an error label rendered.
     */
    async assertDividendNotCreated(): Promise<void> {
        await test.step('Assert the invalid dividend was not saved', async () => {
            // `.locator` (the raw primary selector), NOT `await .get()`. `get()` runs the full
            // heal chain when the element is missing, and here it is missing on purpose: the
            // toast is what must not exist. Healing it would burn the probe and AI timeouts on
            // every run and log the toast as a failed locator in the self-healing report, which
            // reads as a real defect when it is the expected outcome.
            await this.assert.toBeHidden(
                this.createdMsg.locator,
                'No "Dividend Created Successfully" toast appeared',
            );
            await this.assert.toBeVisible(
                await this.amountFieldInvalid.get(),
                'Wizard is still open with the amount field flagged invalid - the save was refused',
            );
        });
    }

    /**
     * Assert the rendered dividend row shows the expected value in every given year column.
     *
     * The row cell attribute is `auto-financial-row-<attributeName>-<year>`, where
     * `attributeName` is the dividend name lower-cased with spaces replaced by underscores
     * (name "dividends-constant amount-yearly" → "dividends-constant_amount-yearly").
     *
     * NOTE: `FinancialDashboardSelfHealing.newChek()` builds the same attribute, but restricts
     * the match to a `span` and filters to visible instances. The recorded test matched any
     * element and took `.first()`, which is what is reproduced here so the known-good behaviour
     * is preserved. Switch to `newChek()` once the cells are confirmed to be spans.
     *
     * @param attributeName - row key, e.g. "dividends-constant_amount-yearly"
     * @param years         - year columns to check, e.g. ["2026", …, "2030"]
     * @param expected      - substring expected in every one of those cells, e.g. "E£ 1,000"
     */
    async assertYearlyRowValues(attributeName: string, years: string[], expected: string): Promise<void> {
        await test.step(`Assert dividend row "${attributeName}" shows ${expected} in ${years.length} year columns`, async () => {
            for (const year of years) {
                const cell = this.page
                    .locator(`[data-automation-test="auto-financial-row-${attributeName}-${year}"]`)
                    .first();
                await this.assert.toContainText(
                    cell,
                    expected,
                    `Dividend row "${attributeName}" shows ${expected} for ${year}`,
                );
            }
        });
    }
}

/**
 * Input shape for {@link DividendsPageSelfHealing.addConstantAmountDividend}.
 * Mirrors one row of `test-data/DividendsInputs.json`.
 */
export interface DividendInput {
    /** Dividend name typed into the wizard, e.g. "dividends-constant amount-yearly" */
    name: string;
    /** Label the entry-type dropdown displays before it is opened, e.g. "One time amount (E£)" */
    currentType: string;
    /** Entry type to switch to, e.g. "Constant amount (E£)" */
    entryType: string;
    /** Constant amount value, e.g. "1000" */
    amount: string;
    /** Period option, e.g. "Year" */
    period: string;
}

/**
 * One happy-path row of `test-data/DividendsInputs.json`: adds a constant-amount dividend and
 * verifies the rendered yearly values.
 */
export interface ConstantAmountCase {
    test: string;
    mail: string;
    password: string;
    company: string;
    forecast: string;
    name: string;
    currentType: string;
    entryType: string;
    amount: string;
    period: string;
    attributeName: string;
    years: string[];
    expectedValue: string;
}

/**
 * The negative row of `test-data/DividendsInputs.json`: carries no period or expected row values,
 * only the amounts the field must refuse.
 */
export interface InvalidAmountCase {
    test: string;
    mail: string;
    password: string;
    company: string;
    forecast: string;
    name: string;
    currentType: string;
    /** Every value the amount field must refuse, checked one after another in the same wizard. */
    invalidAmounts: string[];
    /** Inline message expected under the field for each of them, e.g. "Invalid format". */
    expectedError: string;
}

/**
 * The rows of `DividendsInputs.json` are not all the same shape: the first three drive the
 * happy-path constant-amount tests, the fourth drives the negative invalid-amount test and
 * carries no period or expected row values. TypeScript infers one union element type for the
 * whole array, which makes every field optional and every use of it a compile error.
 *
 * Describing the file as a fixed tuple restores per-row types, so each test reads its own
 * row with no casts, no optional chaining and no non-null assertions.
 */
export type DividendsInputs = [
    ConstantAmountCase,
    ConstantAmountCase,
    ConstantAmountCase,
    InvalidAmountCase,
];