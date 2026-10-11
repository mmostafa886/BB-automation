/**
 * @testcase  TC-BB-013-realitycheck
 * @title      Verify B2B customer-count thresholds trigger the aggressive-target and high-dependency warnings with the correct dynamic count
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3962
 * @priority  2
 * @tags      @realitycheck @automation

Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Step 2:  customer type B2B;

Steps
Aggressive B2B target (Priority 3 — B2B AND customers > 25):

Enter customers = 26 → verify amber insight: "Aggressive B2B target" / "25+ B2B clients in month one may be too optimistic. B2B sales cycles are usually longer."

Enter customers = 25 → verify the warning does NOT fire (boundary is strictly > 25); record actual behavior.

High dependency on each customer (Priority 4 — B2B AND customers = 1 or 2): 

Enter customers = 2 → verify amber insight: "High dependency on each customer" / "With only 2 B2B customers projected, each customer is a major event for the business. Worth planning for that risk." — dynamic {customers} = 2. 

Expected Result
Both B2B warnings fire at their exact thresholds with correct dynamic counts, only for B2B; the placeholder trigger outranks high-dependency at customers = 1.


*/

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-013: Verify B2B customer-count thresholds trigger the aggressive-target and high-dependency warnings with the correct dynamic count @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[12].email,
            RealityCheckInputs[12].password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        RealityCheckInputs[12].businessIdea,
        RealityCheckInputs[12].businessCategory,
        RealityCheckInputs[12].country,
        RealityCheckInputs[12].stage,
    );
    
    // Land on Step 2; customer type B2B.
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[12].customerType[0]);

    // Enter customers = 26 → verify amber insight: "Aggressive B2B target"
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[12].customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(RealityCheckInputs[12].expectedWarningText![0]);
    
    // Enter customers = 25 → verify the warning does NOT fire (boundary is strictly > 25); record actual behavior.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[12].customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();
    
    //  Enter customers = 2 → verify amber insight: "High dependency on each customer". 
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[12].customers[2]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();


   })