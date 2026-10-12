/**
 * @jira      BZNS-3963
 * @title      Verify customer count below the benchmark floor triggers "Conservative customer projection" with the selected category
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-014:  Verify customer count below the benchmark floor triggers "Conservative customer projection" with the selected category @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
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