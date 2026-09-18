import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { createCompanyLocators } from '../locators/create-company-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * CreateCompanyPageSelfHealing — Page Object for the "Create New Company" wizard (URL: /create-company).
 *
 * Scope: the side-bar entry point (companies menu "+" → Create New Company) and the wizard steps.
 * Login and the post-login dashboard wait are delegated to `LoginPageSelfHealing` /
 * `HomePageSelfHealing` — do not duplicate them here.
 *
 * Steps 1–4 have methods so far (step 3: type of business + industry, step 4: company name only);
 * the locators for the rest of steps 3–7 already exist in `create-company-page-locators.ts`.
 */
export class CreateCompanyPageSelfHealing extends SelfHealingPageBase {
    // ─── Entry point (side bar) ─────────────────────────────────────────────
    readonly companiesMenuPlusIcon: SelfHealingLocator;
    readonly createNewCompanyLink:  SelfHealingLocator;
    /** Matches every company row — read it through `.locator`, since `get()` probes a single element. */
    readonly companiesMenuItems:    SelfHealingLocator;

    // ─── Wizard shell ───────────────────────────────────────────────────────
    readonly stepTitle:        SelfHealingLocator;
    /** Matches every stepper number — read it through `.locator`, since `get()` probes a single element. */
    readonly stepNumbers:      SelfHealingLocator;
    readonly activeStepNumber: SelfHealingLocator;
    readonly nextButton:       SelfHealingLocator;
    readonly prevButton:       SelfHealingLocator;
    /** Options of whichever dropdown is open — read it through `.locator`, since `get()` probes a single element. */
    readonly dropdownOptions:  SelfHealingLocator;

    // ─── "Are You Sure ?" unsaved-changes dialog ────────────────────────────
    readonly unsavedChangesDialog:            SelfHealingLocator;
    readonly unsavedChangesDialogTitle:       SelfHealingLocator;
    readonly unsavedChangesDialogMessage:     SelfHealingLocator;
    readonly unsavedChangesDialogCloseButton:   SelfHealingLocator;
    readonly unsavedChangesDialogConfirmButton: SelfHealingLocator;

    // ─── Step 1: Which of these best describe you? ──────────────────────────
    readonly describeHeading: SelfHealingLocator;
    /** Matches all 9 cards — read it through `.locator`, since `get()` probes a single element. */
    readonly describeOptions: SelfHealingLocator;

    // ─── Step 2: Company Stage ──────────────────────────────────────────────
    /** Matches all 3 cards — read it through `.locator`, since `get()` probes a single element. */
    readonly stageCards: SelfHealingLocator;

    // ─── Step 3: Business Information ───────────────────────────────────────
    readonly typeOfBusinessInput:   SelfHealingLocator;
    readonly industrySelect:        SelfHealingLocator;
    readonly industrySelectedValue: SelfHealingLocator;
    readonly industryGenerateSuggestionsButton: SelfHealingLocator;

    // ─── Step 4: Company Details ────────────────────────────────────────────
    readonly companyNameInput: SelfHealingLocator;
    readonly taglineInput:     SelfHealingLocator;

    // ─── Step 5: Financial ──────────────────────────────────────────────────
    readonly firstYearOfForecastInput: SelfHealingLocator;
    readonly datePickerDays:           SelfHealingLocator;
    readonly datePickerOkButton:       SelfHealingLocator;
    /** Matches all 6 duration labels — read it through `.locator`, since `get()` probes a single element. */
    readonly durationOptions:          SelfHealingLocator;
    readonly monthlyDetailSelect:        SelfHealingLocator;
    readonly monthlyDetailSelectedValue: SelfHealingLocator;
    readonly numberFormatSelect:         SelfHealingLocator;
    readonly numberFormatSelectedValue:  SelfHealingLocator;
    readonly currencySelectedValue:      SelfHealingLocator;
    readonly intentSelectedValue:        SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`CreateCompanyPageSelfHealing-${testName}`);
        const L      = createCompanyLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        this.companiesMenuPlusIcon = make(L.companiesMenuPlusIcon);
        this.createNewCompanyLink  = make(L.createNewCompanyLink);
        this.companiesMenuItems    = make(L.companiesMenuItems);

        this.stepTitle        = make(L.stepTitle);
        this.stepNumbers      = make(L.stepNumbers);
        this.activeStepNumber = make(L.activeStepNumber);
        this.nextButton       = make(L.nextButton);
        this.prevButton       = make(L.prevButton);
        this.dropdownOptions  = make(L.dropdownOptions);

        this.unsavedChangesDialog            = make(L.unsavedChangesDialog);
        this.unsavedChangesDialogTitle       = make(L.unsavedChangesDialogTitle);
        this.unsavedChangesDialogMessage     = make(L.unsavedChangesDialogMessage);
        this.unsavedChangesDialogCloseButton   = make(L.unsavedChangesDialogCloseButton);
        this.unsavedChangesDialogConfirmButton = make(L.unsavedChangesDialogConfirmButton);

        this.describeHeading = make(L.describeHeading);
        this.describeOptions = make(L.describeOptions);

        this.stageCards = make(L.stageCards);

        this.typeOfBusinessInput   = make(L.typeOfBusinessInput);
        this.industrySelect        = make(L.industrySelect);
        this.industrySelectedValue = make(L.industrySelectedValue);
        this.industryGenerateSuggestionsButton = make(L.industryGenerateSuggestionsButton);

        this.companyNameInput = make(L.companyNameInput);
        this.taglineInput     = make(L.taglineInput);

        this.firstYearOfForecastInput = make(L.firstYearOfForecastInput);
        this.datePickerDays           = make(L.datePickerDays);
        this.datePickerOkButton       = make(L.datePickerOkButton);
        this.durationOptions          = make(L.durationOptions);
        this.monthlyDetailSelect        = make(L.monthlyDetailSelect);
        this.monthlyDetailSelectedValue = make(L.monthlyDetailSelectedValue);
        this.numberFormatSelect         = make(L.numberFormatSelect);
        this.numberFormatSelectedValue  = make(L.numberFormatSelectedValue);
        this.currencySelectedValue      = make(L.currencySelectedValue);
        this.intentSelectedValue        = make(L.intentSelectedValue);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Actions
    // ═══════════════════════════════════════════════════════════════════════

    /** Click the "+" icon next to the company name in the side bar to open the companies menu. */
    async openCompaniesMenu(): Promise<void> {
        await test.step('Open the companies menu from the "+" icon', async () => {
            // The side bar renders a few seconds after a navigation, so give the probe longer than its
            // 2 s default — otherwise a slow load is misreported as a broken selector and triggers healing.
            await this.actions.click(await this.companiesMenuPlusIcon.get(15000), 'Click companies menu "+" icon');
        });
    }

    /** Click "Create New Company" in the already-open companies menu. */
    async clickCreateNewCompany(): Promise<void> {
        await test.step('Click "Create New Company"', async () => {
            await this.actions.click(await this.createNewCompanyLink.get(), 'Click Create New Company link');
        });
    }

    /** Pick one of the 9 cards on step 1, matched by its exact label, e.g. "I'm a student". */
    async selectDescribeOption(option: string): Promise<void> {
        await test.step(`Select describe card "${option}"`, async () => {
            await this.actions.click(this.describeOptionCard(option), `Click describe card "${option}"`);
        });
    }

    /** Pick one of the 3 cards on step 2, matched by its exact title: "Idea", "Startup" or "Growth". */
    async selectCompanyStage(stage: string): Promise<void> {
        await test.step(`Select company stage "${stage}"`, async () => {
            await this.actions.click(this.stageCard(stage), `Click company stage card "${stage}"`);
        });
    }

    /** Click Close on the "Are You Sure ?" unsaved-changes dialog and wait for it to go away. */
    async closeUnsavedChangesDialog(): Promise<void> {
        await test.step('Close the "Are You Sure ?" unsaved changes dialog', async () => {
            await this.actions.click(await this.unsavedChangesDialogCloseButton.get(), 'Click Close on the unsaved changes dialog');
            await this.assert.toBeHidden(this.unsavedChangesDialog.locator, 'Unsaved changes dialog is closed');
        });
    }

    /** Fill "What type of business is this" on step 3. */
    async fillTypeOfBusiness(typeOfBusiness: string): Promise<void> {
        await test.step(`Fill type of business: "${typeOfBusiness}"`, async () => {
            await this.actions.fill(await this.typeOfBusinessInput.get(), typeOfBusiness, 'Fill type of business');
        });
    }

    /** Clear "What type of business is this" on step 3. */
    async clearTypeOfBusiness(): Promise<void> {
        await test.step('Clear the type of business field', async () => {
            await this.actions.clear(await this.typeOfBusinessInput.get(), 'Clear type of business');
        });
    }

    /** Open the industry dropdown on step 3 and pick `industry` by its exact label, e.g. "Animation". */
    async selectIndustry(industry: string): Promise<void> {
        await test.step(`Select industry "${industry}"`, async () => {
            await this.actions.click(await this.industrySelect.get(), 'Open industry dropdown');
            await this.actions.clickOption(this.dropdownOption(industry), `Select industry "${industry}"`);
        });
    }

    /** Fill "Company Name" on step 4. */
    async fillCompanyName(companyName: string): Promise<void> {
        await test.step(`Fill company name: "${companyName}"`, async () => {
            await this.actions.fill(await this.companyNameInput.get(), companyName, 'Fill company name');
        });
    }

    /** Clear "Company Name" on step 4. */
    async clearCompanyName(): Promise<void> {
        await test.step('Clear the company name field', async () => {
            await this.actions.clear(await this.companyNameInput.get(), 'Clear company name');
        });
    }

    /** Fill "Company tagline" on step 4. */
    async fillTagline(tagline: string): Promise<void> {
        await test.step(`Fill company tagline: "${tagline}"`, async () => {
            await this.actions.fill(await this.taglineInput.get(), tagline, 'Fill company tagline');
        });
    }

    /**
     * Set "1st year of forecast" on step 5: open the date picker, click `day` in the month it opens
     * on, and confirm with Ok. The field then reads dd/mm/yyyy.
     *
     * The picker opens on today's month, which is not clicked through here — the step only needs a
     * valid date, and navigating months would tie the test to the day it runs.
     */
    async pickFirstYearOfForecast(day: string): Promise<void> {
        await test.step(`Pick day ${day} as the 1st year of forecast`, async () => {
            await this.actions.click(await this.firstYearOfForecastInput.get(), 'Open the 1st year of forecast date picker');
            await this.actions.click(this.datePickerDay(day), `Click day ${day} in the date picker`);
            await this.actions.click(await this.datePickerOkButton.get(), 'Confirm the date with Ok');
        });
    }

    /** Pick the financial plan duration on step 5 by its exact label: "1", "2", "3", "5", "7" or "10". */
    async selectDuration(years: string): Promise<void> {
        await test.step(`Select a duration of ${years} years`, async () => {
            await this.actions.click(this.durationOption(years), `Click duration "${years}"`);
        });
    }

    /** Pick "Monthly detail" on step 5, e.g. "1 year of monthly detail". */
    async selectMonthlyDetail(monthlyDetail: string): Promise<void> {
        await test.step(`Select monthly detail "${monthlyDetail}"`, async () => {
            await this.actions.click(await this.monthlyDetailSelect.get(), 'Open monthly detail dropdown');
            await this.actions.clickOption(this.dropdownOption(monthlyDetail), `Select monthly detail "${monthlyDetail}"`);
        });
    }

    /** Pick "Number format" on step 5: "1,000.00" or "1.000,00". */
    async selectNumberFormat(numberFormat: string): Promise<void> {
        await test.step(`Select number format "${numberFormat}"`, async () => {
            await this.actions.click(await this.numberFormatSelect.get(), 'Open number format dropdown');
            await this.actions.clickOption(this.dropdownOption(numberFormat), `Select number format "${numberFormat}"`);
        });
    }

    /** Click Prev to go back one step. Not available on step 1. */
    async clickPrev(): Promise<void> {
        await test.step('Click Prev', async () => {
            await this.actions.click(await this.prevButton.get(), 'Click Prev button');
        });
    }

    /**
     * Click Confirm on the "Are You Sure ?" unsaved-changes dialog and wait for it to go away.
     * The app then leaves the wizard for the page of the company/forecast that was clicked.
     */
    async confirmUnsavedChangesDialog(): Promise<void> {
        await test.step('Confirm the "Are You Sure ?" unsaved changes dialog', async () => {
            await this.actions.click(await this.unsavedChangesDialogConfirmButton.get(), 'Click Confirm on the unsaved changes dialog');
            await this.assert.toBeHidden(this.unsavedChangesDialog.locator, 'Unsaved changes dialog is closed');
        });
    }

    /** Click Next. Waits for the button to be enabled, so only call it once the step is complete. */
    async clickNext(): Promise<void> {
        await test.step('Click Next', async () => {
            await this.actions.click(await this.nextButton.get(), 'Click Next button');
        });
    }

    /**
     * Try to click Next while it is disabled, to prove the wizard does not move on.
     *
     * A normal click waits for the button to become enabled and would time out, so this forces
     * the click. The browser does not fire click events on a disabled <button>, which is the
     * behaviour under test.
     */
    async attemptNextWhileDisabled(): Promise<void> {
        await test.step('Attempt to click the disabled Next button', async () => {
            await (await this.nextButton.get()).click({ force: true });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Assertions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Assert the open companies menu lists more than one company, i.e. the account is not creating
     * its first company. Call after {@link openCompaniesMenu}.
     */
    async assertAccountHasMultipleCompanies(): Promise<void> {
        await test.step('Assert the companies menu lists more than one company', async () => {
            const items = this.companiesMenuItems.locator;
            await this.actions.waitForVisible(items.first(), 'Wait for the company rows in the companies menu');
            await this.assert.toBeGreaterThan(await items.count(), 1, 'Companies menu lists more than one company');
        });
    }

    /** Assert the wizard stepper shows exactly `stepCount` steps numbered 1..stepCount. Only rendered from step 2. */
    async assertStepCount(stepCount: number): Promise<void> {
        await test.step(`Assert the wizard stepper has ${stepCount} steps`, async () => {
            const expectedNumbers = Array.from({ length: stepCount }, (_, i) => String(i + 1));
            await this.assert.toHaveCount(this.stepNumbers.locator, stepCount, `Stepper shows ${stepCount} steps`);
            await this.assert.toHaveText(this.stepNumbers.locator, expectedNumbers, `Stepper is numbered 1 to ${stepCount}`);
        });
    }

    /** Assert the "Are You Sure ?" unsaved-changes dialog is open with the expected title and message. */
    async assertUnsavedChangesDialogShown(title: string, message: string): Promise<void> {
        await test.step('Assert the "Are You Sure ?" unsaved changes dialog is shown', async () => {
            await this.assert.toBeVisible(await this.unsavedChangesDialog.get(5000), 'Unsaved changes dialog is shown');
            await this.assert.toHaveText(await this.unsavedChangesDialogTitle.get(), title, `Dialog title is "${title}"`);
            await this.assert.toHaveText(await this.unsavedChangesDialogMessage.get(), message, `Dialog message is "${message}"`);
        });
    }

    /**
     * Assert the unsaved-changes dialog is not open. Call it only after asserting where the app
     * landed, so it cannot pass just because the dialog has not had time to appear yet.
     */
    async assertUnsavedChangesDialogNotShown(): Promise<void> {
        await test.step('Assert the "Are You Sure ?" unsaved changes dialog is not shown', async () => {
            await this.assert.toBeHidden(this.unsavedChangesDialog.locator, 'Unsaved changes dialog is not shown');
        });
    }

    /**
     * Wait for the wizard's first step to render, then assert it.
     *
     * For an account with no company yet, signing in lands on /create-company by itself. That redirect
     * regularly takes longer than the default `expect` timeout, so the heading is waited for with an
     * explicit budget instead of asserted straight away.
     */
    async waitForWizardLoaded(timeout: number = 60000): Promise<void> {
        await test.step('Wait for the create company wizard to load', async () => {
            await this.actions.waitForVisible(this.describeHeading.locator, 'Wait for the "Which of these best describe you?" heading', timeout);
            await this.assert.toHaveURL(/\/create-company/, 'URL contains /create-company');
        });
    }

    /** Assert the primary button reads `label`, e.g. "Next" or "Start Free Trial" on the last step. */
    async assertPrimaryCtaLabel(label: string): Promise<void> {
        await test.step(`Assert the primary button reads "${label}"`, async () => {
            await this.assert.toHaveText(await this.nextButton.get(), label, `Primary button reads "${label}"`);
        });
    }

    /** Assert the wizard is on step 1: /create-company URL, heading, and all describe cards shown. */
    async assertDescribeStepLoaded(expectedOptions: string[]): Promise<void> {
        await test.step('Assert the "Which of these best describe you?" step is shown', async () => {
            await this.assert.toHaveURL(/\/create-company/, 'URL contains /create-company');
            await this.assert.toBeVisible(await this.describeHeading.get(), '"Which of these best describe you?" heading is visible');
            await this.assert.toHaveCount(this.describeOptions.locator, expectedOptions.length, `${expectedOptions.length} describe cards are shown`);
            await this.assert.toContainText(this.describeOptions.locator, expectedOptions, 'Describe cards show the expected labels in order');
        });
    }

    /** Assert the wizard is still on step 1 — the step heading is shown and no step title has appeared. */
    async assertStillOnDescribeStep(): Promise<void> {
        await test.step('Assert the wizard is still on the describe step', async () => {
            await this.assert.toBeVisible(await this.describeHeading.get(), '"Which of these best describe you?" heading is still visible');
            await this.assert.toBeHidden(this.stepTitle.locator, 'No step title is shown, so the wizard did not move to step 2');
        });
    }

    async assertNoDescribeOptionSelected(): Promise<void> {
        await test.step('Assert no describe card is selected', async () => {
            await this.assert.toHaveCount(this.describeOptions.locator.and(this.page.locator('.selected')), 0, 'No describe card has the selected state');
        });
    }

    async assertDescribeOptionSelected(option: string): Promise<void> {
        await test.step(`Assert describe card "${option}" is selected`, async () => {
            await this.assert.toHaveClass(this.describeOptionCard(option), /\bselected\b/, `Describe card "${option}" is selected`);
        });
    }

    /** Assert the wizard is on step 2 and shows the expected stage cards, e.g. ["Idea", "Startup", "Growth"]. */
    async assertCompanyStageStepLoaded(stepNumber: number, title: string, expectedStages: string[]): Promise<void> {
        await test.step('Assert the "Company Stage" step is shown', async () => {
            await this.assertCurrentStep(stepNumber, title);
            await this.assert.toHaveCount(this.stageCards.locator, expectedStages.length, `${expectedStages.length} company stage cards are shown`);
            await this.assert.toHaveText(this.stageCards.locator.locator('h4'), expectedStages, 'Company stage cards show the expected titles in order');
        });
    }

    async assertNoCompanyStageSelected(): Promise<void> {
        await test.step('Assert no company stage card is selected', async () => {
            await this.assert.toHaveCount(this.stageCards.locator.and(this.page.locator('.active')), 0, 'No company stage card has the active state');
        });
    }

    async assertCompanyStageSelected(stage: string): Promise<void> {
        await test.step(`Assert company stage "${stage}" is selected`, async () => {
            await this.assert.toHaveClass(this.stageCard(stage), /\bactive\b/, `Company stage card "${stage}" is selected`);
        });
    }

    /** Assert Prev is not shown — the case on step 1. */
    async assertPrevHidden(): Promise<void> {
        await test.step('Assert Prev is not shown', async () => {
            await this.assert.toBeHidden(this.prevButton.locator, 'Prev button is not shown');
        });
    }

    async assertPrevVisible(): Promise<void> {
        await test.step('Assert Prev is shown', async () => {
            await this.assert.toBeVisible(await this.prevButton.get(), 'Prev button is shown');
            await this.assert.toBeEnabled(await this.prevButton.get(), 'Prev button is enabled');
        });
    }

    async assertTypeOfBusiness(typeOfBusiness: string): Promise<void> {
        await test.step(`Assert type of business is "${typeOfBusiness}"`, async () => {
            await this.assert.toHaveValue(await this.typeOfBusinessInput.get(), typeOfBusiness, `Type of business is "${typeOfBusiness}"`);
        });
    }

    /** Assert the step-3 "Generate Suggestions" button (industry column) is disabled. */
    async assertGenerateSuggestionsDisabled(): Promise<void> {
        await test.step('Assert "Generate Suggestions" is disabled', async () => {
            await this.assert.toBeVisible(await this.industryGenerateSuggestionsButton.get(), '"Generate Suggestions" button is visible');
            await this.assert.toBeDisabled(await this.industryGenerateSuggestionsButton.get(), '"Generate Suggestions" button is disabled');
        });
    }

    /** Assert the step-3 "Generate Suggestions" button (industry column) is enabled. */
    async assertGenerateSuggestionsEnabled(): Promise<void> {
        await test.step('Assert "Generate Suggestions" is enabled', async () => {
            await this.assert.toBeVisible(await this.industryGenerateSuggestionsButton.get(), '"Generate Suggestions" button is visible');
            await this.assert.toBeEnabled(await this.industryGenerateSuggestionsButton.get(), '"Generate Suggestions" button is enabled');
        });
    }

    /** Assert the industry dropdown has no value chosen yet. */
    async assertNoIndustrySelected(): Promise<void> {
        await test.step('Assert no industry is selected', async () => {
            await this.assert.toBeHidden(this.industrySelectedValue.locator, 'Industry dropdown shows no selected value');
        });
    }

    async assertSelectedIndustry(industry: string): Promise<void> {
        await test.step(`Assert selected industry is "${industry}"`, async () => {
            await this.assert.toHaveText(await this.industrySelectedValue.get(), industry, `Selected industry is "${industry}"`);
        });
    }

    async assertCompanyName(companyName: string): Promise<void> {
        await test.step(`Assert company name is "${companyName}"`, async () => {
            await this.assert.toHaveValue(await this.companyNameInput.get(), companyName, `Company name is "${companyName}"`);
        });
    }

    async assertTagline(tagline: string): Promise<void> {
        await test.step(`Assert company tagline is "${tagline}"`, async () => {
            await this.assert.toHaveValue(await this.taglineInput.get(), tagline, `Company tagline is "${tagline}"`);
        });
    }

    /** Assert the "1st year of forecast" field is still empty. */
    async assertFirstYearOfForecastEmpty(): Promise<void> {
        await test.step('Assert the 1st year of forecast is empty', async () => {
            await this.assert.toHaveValue(await this.firstYearOfForecastInput.get(), '', '1st year of forecast is empty');
        });
    }

    /** Assert the "1st year of forecast" field holds a dd/mm/yyyy date. */
    async assertFirstYearOfForecastSet(): Promise<void> {
        await test.step('Assert the 1st year of forecast holds a date', async () => {
            await this.assert.toHaveValue(await this.firstYearOfForecastInput.get(), /^\d{2}\/\d{2}\/\d{4}$/, '1st year of forecast holds a dd/mm/yyyy date');
        });
    }

    async assertSelectedDuration(years: string): Promise<void> {
        await test.step(`Assert the selected duration is ${years} years`, async () => {
            await this.assert.toBeChecked(this.durationRadio(years), `Duration "${years}" is selected`);
        });
    }

    /**
     * Assert the monthly detail dropdown offers exactly `expectedOptions`, in order.
     * Opens the dropdown (its options only exist in the DOM while open) and closes it again.
     */
    async assertMonthlyDetailOptions(expectedOptions: string[]): Promise<void> {
        await test.step(`Assert monthly detail offers ${expectedOptions.length} option(s)`, async () => {
            await this.actions.click(await this.monthlyDetailSelect.get(), 'Open monthly detail dropdown');
            await this.assert.toHaveCount(this.dropdownOptions.locator, expectedOptions.length, `Monthly detail offers ${expectedOptions.length} option(s)`);
            await this.assert.toHaveText(this.dropdownOptions.locator, expectedOptions, 'Monthly detail options are the expected ones, in order');
            await this.page.keyboard.press('Escape');
            await this.assert.toBeHidden(this.dropdownOptions.locator, 'Monthly detail dropdown is closed again');
        });
    }

    async assertSelectedMonthlyDetail(monthlyDetail: string): Promise<void> {
        await test.step(`Assert monthly detail is "${monthlyDetail}"`, async () => {
            await this.assert.toHaveText(await this.monthlyDetailSelectedValue.get(), monthlyDetail, `Monthly detail is "${monthlyDetail}"`);
        });
    }

    async assertSelectedNumberFormat(numberFormat: string): Promise<void> {
        await test.step(`Assert number format is "${numberFormat}"`, async () => {
            await this.assert.toHaveText(await this.numberFormatSelectedValue.get(), numberFormat, `Number format is "${numberFormat}"`);
        });
    }

    /** Assert the currency and intent dropdowns arrive pre-filled, e.g. "Dollar($)" and "before". */
    async assertFinancialDefaults(currency: string, intent: string): Promise<void> {
        await test.step(`Assert currency "${currency}" and intent "${intent}" are pre-filled`, async () => {
            await this.assert.toHaveText(await this.currencySelectedValue.get(), currency, `Currency is "${currency}"`);
            await this.assert.toHaveText(await this.intentSelectedValue.get(), intent, `Intent is "${intent}"`);
        });
    }

    async assertNextDisabled(): Promise<void> {
        await test.step('Assert Next is disabled', async () => {
            await this.assert.toBeDisabled(await this.nextButton.get(), 'Next button is disabled');
        });
    }

    async assertNextEnabled(): Promise<void> {
        await test.step('Assert Next is enabled', async () => {
            await this.assert.toBeEnabled(await this.nextButton.get(), 'Next button is enabled');
        });
    }

    /** Assert the stepper highlights `stepNumber` and the step title reads `title`, e.g. 2 / "Company Stage". */
    async assertCurrentStep(stepNumber: number, title: string): Promise<void> {
        await test.step(`Assert wizard is on step ${stepNumber}: "${title}"`, async () => {
            await this.assert.toHaveText(await this.stepTitle.get(), title, `Step title is "${title}"`);
            await this.assert.toHaveText(await this.activeStepNumber.get(), String(stepNumber), `Stepper highlights step ${stepNumber}`);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════════

    /** The card whose label is exactly `option` (its text also carries a "01".."09" number). */
    private describeOptionCard(option: string) {
        return this.describeOptions.locator.filter({ has: this.page.getByText(option, { exact: true }) });
    }

    /** The option in the open dropdown panel whose label is exactly `label`. */
    private dropdownOption(label: string) {
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.dropdownOptions.locator.filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) });
    }

    /** The day cell for `day` in the open date picker (each day sits in <td data-date="<day>">). */
    private datePickerDay(day: string) {
        return this.datePickerDays.locator.and(this.page.locator(`td[data-date="${day}"] a`));
    }

    /** The duration label whose text is exactly `years`. */
    private durationOption(years: string) {
        return this.durationOptions.locator.filter({ hasText: new RegExp(`^\\s*${years}\\s*$`) });
    }

    /** The radio input behind the `years` duration label (id is "custom-radio-<years>-<instance>"). */
    private durationRadio(years: string) {
        return this.page.locator(`app-create-company app-custom-radio input[id^="custom-radio-${years}-"]`);
    }

    /** The stage card whose <h4> title is exactly `stage`. */
    private stageCard(stage: string) {
        return this.stageCards.locator.filter({ has: this.page.getByRole('heading', { name: stage, exact: true }) });
    }
}
