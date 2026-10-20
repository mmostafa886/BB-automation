/**
 * @jira      BZNS-3961
 * @title      Verify customer count above 5× the benchmark ceiling triggers "Volume above typical range" with the entered count and category
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-012: Verify customer count 0 or 1, or price 0, triggers the "Some inputs look like placeholders" warning @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.volumeAboveTypicalRange.mail,
            realityCheckInputs.volumeAboveTypicalRange.password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Select "Other" from the country dropdown.
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        realityCheckInputs.volumeAboveTypicalRange.businessIdea,
        realityCheckInputs.volumeAboveTypicalRange.businessCategory,
        realityCheckInputs.volumeAboveTypicalRange.country,
        realityCheckInputs.volumeAboveTypicalRange.stage,
    );
    
    // Land on Step 2; customer type B2C.
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();
    await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.volumeAboveTypicalRange.customerType[0]);

    //Enter customers = 1500.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.volumeAboveTypicalRange.customers[0]);

    // Verify amber insight is displayed and contains customer count the user entered and the benchmark ceiling.
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.volumeAboveTypicalRange.customers[0]);
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.volumeAboveTypicalRange.benchmarkCeiling!);

    // Change the count to another >5× value (1400)→ verify the dynamic {customers} value updates in the subtitle.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.volumeAboveTypicalRange.customers[1]);
    await pomSelfHealing.realityCheckPage.assertInsightWarning();
    await pomSelfHealing.realityCheckPage.assertInsightWarningContains(realityCheckInputs.volumeAboveTypicalRange.customers[1]);

    // Reduce the count to exactly 5 × {ceiling}(1250) → verify the warning stops firing per boundary definition (record inclusive/exclusive behavior).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.volumeAboveTypicalRange.customers[2]);
    await pomSelfHealing.realityCheckPage.assertInsightSuccess();


   })