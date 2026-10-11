/**
 * @testcase  TC-BB-015-realitycheck
 * @title     Verify "Clear revenue assumption" appears when no warnings apply and displays the calculated revenue and currency
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3964
 * @priority  2
 * @tags      @realitycheck @automation

Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Step 2: currency EGP; customer type B2C.

Steps

Enter customers = 100 a value within the B2C benchmark range, price = 1500 .

Verify the green insight appears: title "Clear revenue assumption", subtitle "Estimated monthly revenue of {monthly_revenue} {currency}. Costs come next."

Change the price → verify the dynamic revenue value inside the subtitle updates immediately.

Expected Result Default insight shows if and only if no warning matches, with green styling and correct dynamic revenue + currency + "Costs come next.".

*/

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-015: Verify "Clear revenue assumption" appears when no warnings apply and displays the calculated revenue and currency @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[13].email,
            RealityCheckInputs[13].password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        RealityCheckInputs[13].businessIdea,
        RealityCheckInputs[13].businessCategory,
        RealityCheckInputs[13].country,
        RealityCheckInputs[13].stage,
    );
    
    // Land on Step 2; 
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    // Step 2: currency EGP; customer type B2C.
    await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[14].currency[0]);
    await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[14].customerType[0]);

    // Enter customers = 100 a value within the B2C benchmark range, price = 1500 .
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[14].customers[0]);
    await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[14].price![0]);

    // Verify the green insight appears: title "Clear revenue assumption".
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();

    // Verify the insight displays the calculated revenue and currency
    await pomSelfHealing.realityCheckPage.assertInsightSuccessContains(RealityCheckInputs[14].expectedRevenueDisplay![0]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccessContains(RealityCheckInputs[14].currency[0]);    
    
    // Change the price → verify the dynamic revenue value inside the subtitle updates immediately.
    await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[14].price![1]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccessContains(RealityCheckInputs[14].expectedRevenueDisplay![1]);
    
   })