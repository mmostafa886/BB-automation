/**
 * @testcase  TC-BB-011-realitycheck
 * @title     Verify customer count 0 or 1, or price 0, triggers the "Some inputs look like placeholders" warning  
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3849
 * @priority  2
 * @tags      @realitycheck @automation
 * Preconditions

Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Land on Step 2; currency EGP; customer type B2C.

Steps — each independently triggers Priority-1:

Customers = 0, price = 1500 → verify amber insight: title "Some inputs look like placeholders", subtitle "Add real estimates to get useful insights. Even rough numbers help the math."

Customers = 1, price = 1500 → verify the same warning.

Customers = 100, price = 0 → verify the same warning.

Fix the trigger (e.g., customers = 100, price = 1500) → verify the warning clears and the default green insight replaces it.

Expected Result Placeholder warning (Priority 1) fires for count = 0, count = 1, or price = 0 with exact copy and amber styling; clears immediately when the trigger resolves.
*/

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-011: Verify customer count 0 or 1, or price 0, triggers the "Some inputs look like placeholders" warning @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[10].email,
            RealityCheckInputs[10].password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        RealityCheckInputs[10].businessIdea,
        RealityCheckInputs[10].businessCategory,
        RealityCheckInputs[10].country,
        RealityCheckInputs[10].stage,
    );
    
    // Land on Step 2; currency EGP; customer type B2C.
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[10].currency[0]);
    await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[10].customerType[0]);

    // Customers = 0 → verify amber insight: title "Some inputs look like placeholders", subtitle "Add real estimates to get useful insights. Even rough numbers help the math."
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[10].customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    // Customers = 1 → verify the same warning.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[10].customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    
    // Customers = 100, price = 0 → verify the same warning.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[10].customers[2]);
    await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[10].price[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
})