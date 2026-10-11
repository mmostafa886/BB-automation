/**
 * @testcase  TC-BB-014-realitycheck
 * @title      Verify customer count below the benchmark floor triggers "Conservative customer projection" with the selected category
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3963
 * @priority  2
 * @tags      @realitycheck @automation

Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Step 2:  customer type B2C; .

Test Data:

Benchmarks values for Egypt

Month-one volume — B2C: 40 – 250

Steps

Enter customers = 35

Verify amber insight: "Conservative customer projection".
Enter customers = exactly {floor} → verify the warning does NOT fire (within range).

Enter customers = {floor} − 1 → verify the warning fires (boundary check).

Expected Result Priority-5 warning fires only below the category floor, shows the correct category name, and respects the exact boundary .
*/

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-014:  Verify customer count below the benchmark floor triggers "Conservative customer projection" with the selected category @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
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
    // customer type B2C;
    await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[13].customerType[0]);

    // Enter customers = 35 < floor
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[13].customers[0]);

    // Verify amber insight: "Conservative customer projection".
    await pomSelfHealing.realityCheckPage.assertInsightWarning();

    // Enter customers = 40 exactly {floor} → verify the warning does NOT fire (within range).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[13].customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();

    // Enter customers = 39 {floor} − 1 → verify the warning fires (boundary check).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[13].customers[2]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();

   })