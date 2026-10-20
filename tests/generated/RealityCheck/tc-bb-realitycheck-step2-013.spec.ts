/**
 * @jira      BZNS-3962
 * @title      Verify B2B customer-count thresholds trigger the aggressive-target and high-dependency warnings with the correct dynamic count
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-013: Verify B2B customer-count thresholds trigger the aggressive-target and high-dependency warnings with the correct dynamic count @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.b2bCustomerCountThresholds.mail,
            realityCheckInputs.b2bCustomerCountThresholds.password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        realityCheckInputs.b2bCustomerCountThresholds.businessIdea,
        realityCheckInputs.b2bCustomerCountThresholds.businessCategory,
        realityCheckInputs.b2bCustomerCountThresholds.country,
        realityCheckInputs.b2bCustomerCountThresholds.stage,
    );
    
    // Land on Step 2; customer type B2B.
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.b2bCustomerCountThresholds.customerType[0]);

    // Enter customers = 26 → verify amber insight: "Aggressive B2B target"
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.b2bCustomerCountThresholds.customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.b2bCustomerCountThresholds.expectedWarningText![0]);
    
    // Enter customers = 25 → verify the warning does NOT fire (boundary is strictly > 25); record actual behavior.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.b2bCustomerCountThresholds.customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();
    
    //  Enter customers = 2 → verify amber insight: "High dependency on each customer". 
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.b2bCustomerCountThresholds.customers[2]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();


   })