/**
 * @jira      BZNS-3967
 * @title     Verify that when multiple non-placeholder warnings match simultaneously, only the highest-priority warning is displayed
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-016: Verify that when multiple non-placeholder warnings match simultaneously, only the highest-priority warning is displayed @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
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
    // Step 2: customer type B2B.
    await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.highestPriorityWarning.customerType[0]);
    // P2 vs P3 collision:  customers = 76 a value that is BOTH > 25 (P3) AND > 5 × B2B {ceiling} (P2) 
    // verify it displays the ceiling of the benchmark, with the correct dynamic count.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.highestPriorityWarning.customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.highestPriorityWarning.customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.highestPriorityWarning.benchmarkCeiling![0]);

    // Reduce customers to the value 30 > 25 but ≤ 5× ceiling (P3 only) 
    // verify the block switches to "Aggressive B2B target".
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.highestPriorityWarning.customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.highestPriorityWarning.expectedWarningText![0]);
    
   })