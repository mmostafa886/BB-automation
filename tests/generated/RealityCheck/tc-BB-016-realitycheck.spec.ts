/**
 * @testcase  TC-BB-016-realitycheck
 * @title     Verify that when multiple non-placeholder warnings match simultaneously, only the highest-priority warning is displayed
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3967
 * @priority  2
 * @tags      @realitycheck @automation

Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Step 2: currency EGP; price = 1500.

Steps

P2 vs P3 collision: customer type B2B, customers = 76 a value that is BOTH > 25 (P3) AND > 5 × B2B {ceiling} (P2) → verify ONLY "Volume above typical range" (P2) displays, with the correct dynamic count.

Reduce customers to the value 30 > 25 but ≤ 5× ceiling (P3 only) → verify the block switches to "Aggressive B2B target".

Expected Result When multiple non-placeholder conditions match, the highest-priority one always displays alone; transitions to the next warning happen correctly as conditions change.
*/

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-016: Verify that when multiple non-placeholder warnings match simultaneously, only the highest-priority warning is displayed @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
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
    // Step 2: customer type B2B.
    await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[15].customerType[0]);
    // P2 vs P3 collision:  customers = 76 a value that is BOTH > 25 (P3) AND > 5 × B2B {ceiling} (P2) 
    // verify it displays the ceiling of the benchmark, with the correct dynamic count.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[15].customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(RealityCheckInputs[15].customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(RealityCheckInputs[15].benchmarkCeiling![0]);

    // Reduce customers to the value 30 > 25 but ≤ 5× ceiling (P3 only) 
    // verify the block switches to "Aggressive B2B target".
    await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[15].customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(RealityCheckInputs[15].expectedWarningText![0]);
    
   })