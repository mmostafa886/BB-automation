/**
 * @jira      BZNS-3846
 * @title     Verify the price field is required and rejects negative values, letters, and unsupported characters
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-003: Verify the price field is required and rejects negative values, letters, and unsupported characters @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.priceFieldValidation.mail,
                realityCheckInputs.priceFieldValidation.password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            realityCheckInputs.priceFieldValidation.businessIdea,
            realityCheckInputs.priceFieldValidation.businessCategory,
            realityCheckInputs.priceFieldValidation.country,
            realityCheckInputs.priceFieldValidation.stage,
        );
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        
        // Land on Step 2; currency EGP selected; customer type B2C; customers = 100.
        await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.priceFieldValidation.customerType[0]);
        await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.priceFieldValidation.currency[0]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.priceFieldValidation.customers[0]);
        
        // Steps — try each input in the price field and check field validation + Continue state:
        // Valid price input -> revenue is calculated and visible
        await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.priceFieldValidation.price![0]);
        await pomSelfHealing.realityCheckPage.assertValidPrice();
        
        // Empty → Continue disabled (required).
    await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.priceFieldValidation.price![1]);
    await pomSelfHealing.realityCheckPage.assertEmptyPrice();
         
    //-100 → rejected.
    await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.priceFieldValidation.price![2]);
    await pomSelfHealing.realityCheckPage.assertNegativePrice();

    // "abc" → rejected / not typeable.
    await pomSelfHealing.realityCheckPage.typePrice(realityCheckInputs.priceFieldValidation.price![3]);
    await pomSelfHealing.realityCheckPage.assertPriceNotTypeable();

    // "10.5.5" (multiple decimal separators) → rejected / sanitized.
    await pomSelfHealing.realityCheckPage.typePrice(realityCheckInputs.priceFieldValidation.price![4])
    await pomSelfHealing.realityCheckPage.assertExpectedPrice(realityCheckInputs.priceFieldValidation.ExpectedPrice![0]);

    // " 1500 " (leading/trailing spaces) → trimmed or rejected; no crash.
    await pomSelfHealing.realityCheckPage.typePrice(realityCheckInputs.priceFieldValidation.price![5])
    await pomSelfHealing.realityCheckPage.assertExpectedPrice(realityCheckInputs.priceFieldValidation.ExpectedPrice![1]);
    
    // Symbols e.g. "1,500" or "1'500" → record accepted/sanitized behavior; must not silently compute a wrong number.
    await pomSelfHealing.realityCheckPage.typePrice(realityCheckInputs.priceFieldValidation.price![6])
    await pomSelfHealing.realityCheckPage.assertExpectedPrice(realityCheckInputs.priceFieldValidation.ExpectedPrice![1]);
    await pomSelfHealing.realityCheckPage.typePrice(realityCheckInputs.priceFieldValidation.price![7])
    await pomSelfHealing.realityCheckPage.assertExpectedPrice(realityCheckInputs.priceFieldValidation.ExpectedPrice![1]);
    
    // large values 99999999 -> accepted by field validation; no overflow/crash in display or preview.
    await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.priceFieldValidation.price![8]);
    await pomSelfHealing.realityCheckPage.assertValidPrice();
});