import { test, expect, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { realityCheckLocators} from "../locators/reality-check-locators";

export class RealityCheckPageSelfHealing extends SelfHealingPageBase {
    readonly page: Page;
    
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;
    private readonly realityCheckSidebarLink: SelfHealingLocator;
    private readonly stepTitle: SelfHealingLocator;
    private readonly wizardHeading: SelfHealingLocator;
    private readonly businessIdeaTextarea: SelfHealingLocator;
    private readonly continueButton: SelfHealingLocator;
    private readonly currencySelectBoxHead: SelfHealingLocator;
    private readonly currencyInput: SelfHealingLocator;
    private readonly priceCurrencyPrefix: SelfHealingLocator;
    private readonly selectBoxOptionsContainer: SelfHealingLocator;
    private readonly customerCountInput: SelfHealingLocator;
    private readonly priceInput: SelfHealingLocator;
    private readonly monthlyRevenueValue: SelfHealingLocator;
    private readonly individualsB2cOption: SelfHealingLocator;
    private readonly businessesB2bOption: SelfHealingLocator;
    private readonly bothHybridOption: SelfHealingLocator;
    private readonly countrySelectHead: SelfHealingLocator;
    private readonly otherCategoryOption: SelfHealingLocator;
    /** Step-1 business-category cards, keyed by their visible title (as used in test data) */
    private readonly categoryOptions: Record<string, SelfHealingLocator>;
    /** Step-1 "Where are you right now?" cards, keyed by their visible title (as used in test data) */
    private readonly stageOptions: Record<string, SelfHealingLocator>;
    private readonly requiredFieldError: SelfHealingLocator;
    private readonly minValueFieldError: SelfHealingLocator;
    private readonly wholeNumberFieldError: SelfHealingLocator;
    private readonly viabilityScore:        SelfHealingLocator;
    private readonly insightWarning:        SelfHealingLocator;
    private readonly insightSuccess:        SelfHealingLocator;
constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);
        const logger = Logger.getLogger(`RealityCheckSelfHealing-${testName}`);

        this.realityCheckSidebarLink = SelfHealingLocator.from(page, realityCheckLocators.realityCheckSidebarLink, logger, aiProvider);
        this.wizardHeading           = SelfHealingLocator.from(page, realityCheckLocators.wizardHeading,           logger, aiProvider);
        this.stepTitle               = SelfHealingLocator.from(page, realityCheckLocators.stepTitle,               logger, aiProvider);
        this.businessIdeaTextarea    = SelfHealingLocator.from(page, realityCheckLocators.businessIdeaTextarea,    logger, aiProvider);
        this.continueButton          = SelfHealingLocator.from(page, realityCheckLocators.continueButton,          logger, aiProvider);
        this.currencySelectBoxHead   = SelfHealingLocator.from(page, realityCheckLocators.currencySelectHead,      logger, aiProvider);
        this.currencyInput           = SelfHealingLocator.from(page, realityCheckLocators.currencyInput,           logger, aiProvider);
        this.priceCurrencyPrefix     = SelfHealingLocator.from(page, realityCheckLocators.pricePerUnitCurrencyPrefix, logger, aiProvider);
        this.selectBoxOptionsContainer = SelfHealingLocator.from(page, realityCheckLocators.selectBoxOptionsContainer, logger, aiProvider);
        this.customerCountInput      = SelfHealingLocator.from(page, realityCheckLocators.expectedCustomersInput,      logger, aiProvider);
        this.priceInput              = SelfHealingLocator.from(page, realityCheckLocators.pricePerUnitInput,              logger, aiProvider);
        this.monthlyRevenueValue      = SelfHealingLocator.from(page, realityCheckLocators.monthlyRevenueValue,      logger, aiProvider);
        this.individualsB2cOption             = SelfHealingLocator.from(page,realityCheckLocators.individualsB2cOption,               logger,aiProvider);
        this.businessesB2bOption             = SelfHealingLocator.from(page,realityCheckLocators.businessesB2bOption,               logger,aiProvider);
        this.bothHybridOption             = SelfHealingLocator.from(page,realityCheckLocators.bothHybridOption,               logger,aiProvider);
        this.countrySelectHead       = SelfHealingLocator.from(page, realityCheckLocators.countrySelectHead,       logger, aiProvider);
        this.otherCategoryOption     = SelfHealingLocator.from(page, realityCheckLocators.otherCategoryOption,     logger, aiProvider);
        this.requiredFieldError      = SelfHealingLocator.from(page, realityCheckLocators.requiredFieldError,     logger, aiProvider);
        this.minValueFieldError      = SelfHealingLocator.from(page, realityCheckLocators.minValueFieldError,     logger, aiProvider);
        this.wholeNumberFieldError   = SelfHealingLocator.from(page, realityCheckLocators.wholeNumberFieldError,  logger, aiProvider);
        this.viabilityScore          = SelfHealingLocator.from(page, realityCheckLocators.viabilityScore,         logger, aiProvider);
        this.insightWarning          = SelfHealingLocator.from(page, realityCheckLocators.insightWarning,   logger, aiProvider);
        this.insightSuccess          = SelfHealingLocator.from(page, realityCheckLocators.insightSuccess,   logger, aiProvider);

        this.categoryOptions = {
            'Product / E-commerce': SelfHealingLocator.from(page, realityCheckLocators.productEcommerceCategoryOption, logger, aiProvider),
            'Food & Beverage':      SelfHealingLocator.from(page, realityCheckLocators.foodAndBeverageCategoryOption,  logger, aiProvider),
            'Service business':     SelfHealingLocator.from(page, realityCheckLocators.serviceBusinessCategoryOption,  logger, aiProvider),
            'SaaS / Digital':       SelfHealingLocator.from(page, realityCheckLocators.saasDigitalCategoryOption,      logger, aiProvider),
            'Education':            SelfHealingLocator.from(page, realityCheckLocators.educationCategoryOption,        logger, aiProvider),
            'Other':                this.otherCategoryOption,
        };
        this.stageOptions = {
            'Testing an idea':     SelfHealingLocator.from(page, realityCheckLocators.testingAnIdeaStageOption,     logger, aiProvider),
            'Preparing to launch': SelfHealingLocator.from(page, realityCheckLocators.preparingToLaunchStageOption, logger, aiProvider),
            'Already running':     SelfHealingLocator.from(page, realityCheckLocators.alreadyRunningStageOption,    logger, aiProvider),
        };
    }
    // Actions

    /**
     * Opens the wizard from the left sidebar and waits until step 1 has rendered.
     * The wizard is slow to paint, and its category cards arrive seconds after the step title,
     * so callers that touch a card right away rely on auto-waiting.
     */
    async navigateToRealityCheck(): Promise<void> {
        await test.step('Navigate to the Financial Reality Check wizard', async () => {
            // A click landing right after the home dashboard renders is swallowed (the link
            // gets focus but the router never navigates), so retry until the route changes.
            await expect(async () => {
                await this.actions.click(await this.realityCheckSidebarLink.get(), 'Click Reality Check in the left sidebar');
                await this.page.waitForURL('**/reality-check-dashboard/reality-check', { timeout: 5000 });
            }).toPass({ timeout: 45000 });
            await this.actions.waitForVisible(await this.stepTitle.get(), 'Wait for the wizard step to render', 60000);
        });
    }
    /**
     * Picks a country on step 1 (e.g. "Egypt").
     * Same custom select widget as the currency box: open the head, then click the option.
     */
    async selectCountry(country: string): Promise<void> {
        await test.step(`Select the "${country}" country`, async () => {
            await this.actions.click(await this.countrySelectHead.get(), 'Open the country select box');
            const optionsPanel = await this.selectBoxOptionsContainer.get();
            await this.actions.click(
                optionsPanel.locator(`[data-automation-test="auto-select-country-singleOption-${country}"]`),
                `Select "${country}" from the country select box`,
            );
        });
    }

    /**
     * Picks a currency on step 2 (e.g. "EGP", "USD").
     * Custom Angular widget, not a native `<select>`: open the head, then click the option.
     */
    async selectCurrency(currency: string): Promise<void> {
        await test.step(`Select the "${currency}" currency`, async () => {
            await this.actions.click(await this.currencySelectBoxHead.get(), 'Open the currency select box');
            const optionsPanel = await this.selectBoxOptionsContainer.get();
            // The option attribute is value-dependent, so it is resolved inside the options panel
            // rather than declared in the locator repository.
            await this.actions.click(
                optionsPanel.locator(`[data-automation-test="auto-select-currency-singleOption-${currency}"]`),
                `Select "${currency}" from the currency select box`,
            );
        });
    }

    /**
     * Fills every step-1 field: idea, business category, country and current stage.
     * @param category - card's visible title as written in test data (e.g. "Product / E-commerce")
     * @param stage - card's visible title as written in test data (e.g. "Testing an idea")
     */
    async fillStep1Inputs(idea: string, category: string, country: string, stage: string): Promise<void> {
        await test.step('Fill in Step 1 inputs', async () => {
            await this.actions.fill(await this.businessIdeaTextarea.get(), idea, 'Fill in the business idea');

            // The category cards are fetched separately and land seconds after the textarea;
            // wait for the last one ("Other") before touching any.
            await this.actions.waitForVisible(await this.otherCategoryOption.get(), 'Wait for the business-category cards to load', 30000);

            await this.actions.click(await this.optionByTitle(this.categoryOptions, category, 'business category').get(), `Select the "${category}" business category`);
            await this.selectCountry(country);
            await this.actions.click(await this.optionByTitle(this.stageOptions, stage, 'stage').get(), `Select the "${stage}" stage`);
        });
    }

    async fillStep1InputsAndSubmit(idea: string, category: string, country: string, stage: string): Promise<void> {
        await test.step('Fill in Step 1 inputs and submit', async () => {
            await this.fillStep1Inputs(idea, category, country, stage);
            await this.actions.click(await this.continueButton.get(), 'Click Continue to submit Step 1');
        });
    }
    async fillCustomerCount(count: string): Promise<void>{
                await test.step('Fill in Step 2 inputs', async () => {
            await this.actions.fill(await this.customerCountInput.get(), count, 'Fill in the expected customers');  
        });
    }
    async fillPrice(price: string): Promise<void> {
        await test.step('Fill in Step 2 inputs', async () => {
            await this.actions.fill(await this.priceInput.get(), price, 'Fill in the price per unit');  
        });
    }

    /**
     * Types the value key-by-key like a real user. Use this for invalid text instead of fillPrice():
     * fill() throws "Cannot type text into input[type=number]" for non-numeric strings.
     */
    async typePrice(price: string): Promise<void> {
        await test.step(`Type "${price}" into the price per unit`, async () => {
            const input = await this.priceInput.get();
            await input.clear();
            await input.pressSequentially(price);
        });
    }

    /**
     * Types the value key-by-key into the expected-customers input. Use this for invalid text
     * instead of fillCustomerCount(): fill() throws on non-numeric strings for input[type=number].
     */
    async typeCustomerCount(count: string): Promise<void> {
        await test.step(`Type "${count}" into the expected customers`, async () => {
            const input = await this.customerCountInput.get();
            await input.clear();
            await input.pressSequentially(count);
        });
    }

    /** Look up a card locator by its visible title, failing loudly on a typo in test data. */
    private optionByTitle(options: Record<string, SelfHealingLocator>, title: string, kind: string): SelfHealingLocator {
        const option = options[title];
        if (!option) {
            throw new Error(`Unknown ${kind} "${title}". Expected one of: ${Object.keys(options).join(', ')}`);
        }
        return option;
    }

    /** Click the step-2 customer-type card for the given visible title. */
    async selectCustomerType(customerType: string): Promise<void> {
        const options: Record<string, SelfHealingLocator> = {
            'Individuals (B2C)': this.individualsB2cOption,
            'Businesses (B2B)':  this.businessesB2bOption,
            'Hybrid':            this.bothHybridOption,
        };
        await test.step(`Select the "${customerType}" customer type`, async () => {
            await this.actions.click(await this.optionByTitle(options, customerType, 'customer type').get(), `Select the "${customerType}" customer type`);
        });
    }
    async getCurrentScore(): Promise<number> {
    const text = await this.actions.getText(await this.viabilityScore.get(), 'Get result value');
    return parseFloat(text.replace(/[^\d.-]/g, ''));
    }


    /** Assert the wizard landed on step 1 with its heading and step title visible. */
    async assertWizardLoaded(): Promise<void> {
        await test.step('Assert the Financial Reality Check wizard loaded', async () => {
            await this.assert.toBeVisible(await this.wizardHeading.get(), 'Wizard heading "Is your idea worth your money?" is visible');
            await this.assert.toHaveText(await this.stepTitle.get(), 'Start with the idea', 'Step 1 title reads "Start with the idea"');
        });
    }

/** Assert the wizard advanced to step 2 — "Who's your customer?" */
async assertStep2Loaded(): Promise<void> {
    await test.step('Assert step 2 loaded', async () => {await this.assert.toHaveText(
            await this.stepTitle.get(),
            /Who.s your customer\?/,
            'Step title reads "Who\'s your customer?"',
        );
    });
}

async assertRevenueValueCalculation(expectedRevenue: string): Promise<void> {
    await test.step('Assert the monthly revenue value is calculated correctly', async () => {
        await this.assert.toHaveText(
            await this.monthlyRevenueValue.get(),
            expectedRevenue,
            `Monthly revenue value is calculated correctly as "${expectedRevenue}"`,
    );

    });
}
/**
 * Assert the currency field shows the selected code. The widget renders the chosen value
 * as the inner input's placeholder ("Select Currency" -> "EGP"), not as its value.
 */
async assertSelectedCurrency(currency: string): Promise<void> {
    await test.step(`Assert the currency field displays "${currency}"`, async () => {
        await this.assert.toHaveAttribute(
            await this.currencyInput.get(),
            'placeholder',
            currency,
            `Currency field displays "${currency}"`,
        );
    });
}

/** Assert the price input's prefix shows the selected currency code. */
async assertPriceCurrencyPrefix(currency: string): Promise<void> {
    await test.step(`Assert the price prefix displays "${currency}"`, async () => {
        await this.assert.toHaveText(
            await this.priceCurrencyPrefix.get(),
            currency,
            `Price prefix displays "${currency}"`,
        );
    });
}

/**
 * Assert the Live Preview monthly revenue is shown in the selected currency
 * (e.g. "AUD 10000"). Only the currency code is checked, not the amount.
 */
async assertRevenueCurrency(currency: string): Promise<void> {
    await test.step(`Assert the monthly revenue is displayed in "${currency}"`, async () => {
        await this.assert.toHaveText(
            await this.monthlyRevenueValue.get(),
            new RegExp(`^${currency}\\s`),
            `Monthly revenue is displayed in "${currency}"`,
        );
    });
}

/** Assert the expected-customers input holds the given value (exact string or pattern). */
async assertCustomerCountValue(expected: string | RegExp): Promise<void> {
    await test.step(`Assert the expected customers field holds ${expected}`, async () => {
        await this.assert.toHaveValue(await this.customerCountInput.get(), expected, `Expected customers field holds ${expected}`);
    });
}

/** Assert a negative or decimal customer count is rejected with the whole-number error. */
async assertWholeNumberError(): Promise<void> {
    await test.step('Assert the value is rejected with a whole-number error', async () => {
        await this.assertContinueButtonDisabled();
        await this.assert.toBeVisible(await this.wholeNumberFieldError.get(), '"Enter a whole number greater than or equal 0" error is visible');
    });
}

async assertContinueButtonEnabled(): Promise<void> {
    await test.step('Assert Continue button is enabled', async () => {
        await this.assert.toBeEnabled(await this.continueButton.get(), 'Continue button is enabled');
    });
}

async assertContinueButtonDisabled(): Promise<void> {
    await test.step('Assert Continue button is disabled', async () => {
        await this.assert.toBeDisabled(await this.continueButton.get(), 'Continue button is disabled');
    });
}

async assertPriceFieldsDisabled(): Promise<void> {
    await test.step('Assert Continue button is disabled', async () => {
        await this.assert.toBeDisabled(await this.priceInput.get(), 'Price input field  is disabled');
    });
}

async assertPriceFieldEnabled(): Promise<void> {
    await test.step('Assert Continue button is enabled', async () => {
        await this.assert.toBeEnabled(await this.priceInput.get(), 'Price input field is enabled');
    });
}


async assertValidPrice(): Promise<void> {
    await test.step('Assert Revenue is calculated and displayed', async () => {
        const revenue = await this.monthlyRevenueValue.get();
        await this.assert.toBeVisible(revenue, 'Monthly revenue figure is visible');
        // Value is irrelevant — only require a non-zero amount (e.g. "EGP 150000", "USD 1,250.50")
        await this.assert.toHaveText(revenue, /[1-9]/, 'Monthly revenue is calculated (non-zero amount)');
    });
}
async assertEmptyPrice(): Promise<void> {
    await test.step('Assert Continue Button is disabled when', async () => {
        await this.assertContinueButtonDisabled();
        await this.actions.click(await this.wizardHeading.get(), 'Click on the heading to move focus out of the price input');
        await this.assert.toBeVisible(await this.requiredFieldError.get(), 'This Field is required error is visible');
    })
}
async assertNegativePrice(): Promise<void> {
    await test.step('Assert negative price is rejected with a min-value error', async () => {
        await this.assertContinueButtonDisabled();
        await this.assert.toBeVisible(await this.minValueFieldError.get(), '"Enter a number greater than or equal 0" error is visible');
    });
}
async assertPriceNotTypeable(): Promise<void> {
    await test.step('Assert letters cannot be typed into the price field', async () => {
        await this.assert.toHaveValue(await this.priceInput.get(), '', 'Price field stays empty after typing letters');
        await this.assertContinueButtonDisabled();
    });
}

async assertExpectedPrice(expectedPrice: string): Promise<void> {
    await test.step('Assert only one decimal separator is accepted', async () => {
        await this.assert.toHaveValue(await this.priceInput.get(),expectedPrice,'Only one decimal separator is accepted');
    })
}
async assertScoreIncrease(previousScore: number, currentScore: number, expectedIncrease: number): Promise<void> {
    await test.step('Assert expected score increase', async () => {
        expect(currentScore - previousScore, `Score should increase by ${expectedIncrease}`).toBeCloseTo(expectedIncrease, 2);
    });
}
async assertInsightWarning():Promise<void>{
    await test.step('Assert warning insight is visible', async () => {
        await this.assert.toBeVisible(await this.insightWarning.get(),'Warning is visible');
    })
}
async assertInsightWarningContains(expected: string): Promise<void> {
    await test.step(`Assert the insight warning contains "${expected}"`, async () => {
        await this.assert.toContainText(
            await this.insightWarning.get(),
            expected,
            `Insight warning contains "${expected}"`,
        );
    });

}
async assertInsightSuccess():Promise<void>{
    await test.step('Assert success insight is visible', async () =>{
        await this.assert.toBeVisible(await this.insightSuccess.get(),'success is visible');
    })
}
async assertInsightSuccessContains(expected: string): Promise<void> {
    await test.step(`Assert the insight success contains "${expected}"`, async () => {
        const digits  = expected.replace(/,/g, '');                  // "15,000" or "15000" -> "15000"
        const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',?'); // "15000" -> "15,?000"
        const pattern = new RegExp(`(?<![\\d,])${grouped}(?![\\d,]*\\d)`);
        await this.assert.toContainText(
            await this.insightSuccess.get(),
            pattern,
            `Insight success contains "${expected}" (with or without thousands separators)`,
        );
    });
}

}
