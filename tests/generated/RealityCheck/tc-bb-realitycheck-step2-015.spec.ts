/**
 * @jira      BZNS-3964
 * @title     Verify "Clear revenue assumption" appears when no warnings apply and displays the calculated revenue and currency
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-015: Verify "Clear revenue assumption" appears when no warnings apply and displays the calculated revenue and currency @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.conservativeCustomerProjection.mail,
            realityCheckInputs.conservativeCustomerProjection.password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        realityCheckInputs.conservativeCustomerProjection.businessIdea,
        realityCheckInputs.conservativeCustomerProjection.businessCategory,
        realityCheckInputs.conservativeCustomerProjection.country,
        realityCheckInputs.conservativeCustomerProjection.stage,
    );
    
    // Land on Step 2; 
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    // Step 2: currency EGP; customer type B2C.
    await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.clearRevenueAssumption.currency[0]);
    await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.clearRevenueAssumption.customerType[0]);

    // Enter customers = 100 a value within the B2C benchmark range, price = 1500 .
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.clearRevenueAssumption.customers[0]);
    await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.clearRevenueAssumption.price![0]);

    // Verify the green insight appears: title "Clear revenue assumption".
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();

    // Verify the insight displays the calculated revenue and currency
    await pomSelfHealing.realityCheckPage.assertInsightSuccessContains(realityCheckInputs.clearRevenueAssumption.expectedRevenueDisplay![0]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccessContains(realityCheckInputs.clearRevenueAssumption.currency[0]);    
    
    // Change the price → verify the dynamic revenue value inside the subtitle updates immediately.
    await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.clearRevenueAssumption.price![1]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccessContains(realityCheckInputs.clearRevenueAssumption.expectedRevenueDisplay![1]);
    
   })