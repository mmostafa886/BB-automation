/**
 * @jira      BZNS-3849
 * @title     Verify customer count 0 or 1, or price 0, triggers the "Some inputs look like placeholders" warning  
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-011: Verify customer count 0 or 1, or price 0, triggers the "Some inputs look like placeholders" warning @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.placeholderInputsWarning.mail,
            realityCheckInputs.placeholderInputsWarning.password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        realityCheckInputs.placeholderInputsWarning.businessIdea,
        realityCheckInputs.placeholderInputsWarning.businessCategory,
        realityCheckInputs.placeholderInputsWarning.country,
        realityCheckInputs.placeholderInputsWarning.stage,
    );
    
    // Land on Step 2; currency EGP; customer type B2C.
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.placeholderInputsWarning.currency[0]);
    await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.placeholderInputsWarning.customerType[0]);

    // Customers = 0 → verify amber insight: title "Some inputs look like placeholders", subtitle "Add real estimates to get useful insights. Even rough numbers help the math."
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.placeholderInputsWarning.customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    // Customers = 1 → verify the same warning.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.placeholderInputsWarning.customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    
    // Customers = 100, price = 0 → verify the same warning.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.placeholderInputsWarning.customers[2]);
    await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.placeholderInputsWarning.price![0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
})