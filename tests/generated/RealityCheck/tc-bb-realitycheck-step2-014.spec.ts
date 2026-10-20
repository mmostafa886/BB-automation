/**
 * @jira      BZNS-3963
 * @title      Verify customer count below the benchmark floor triggers "Conservative customer projection" with the selected category
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-014:  Verify customer count below the benchmark floor triggers "Conservative customer projection" with the selected category @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
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
    // customer type B2C;
    await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.conservativeCustomerProjection.customerType[0]);

    // Enter customers = 35 < floor
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.conservativeCustomerProjection.customers[0]);

    // Verify amber insight: "Conservative customer projection".
    await pomSelfHealing.realityCheckPage.assertInsightWarning();

    // Enter customers = 40 exactly {floor} → verify the warning does NOT fire (within range).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.conservativeCustomerProjection.customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();

    // Enter customers = 39 {floor} − 1 → verify the warning fires (boundary check).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.conservativeCustomerProjection.customers[2]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();

   })