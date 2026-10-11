/**
 * @testcase  TC-BB-004-realitycheck
 * @title     Step 2 Continue button: disabled per missing input, enabled when all valid
 * @jira      BZNS-3847
 * @module    RealityCheck
 * @area      RealityCheck
 * @priority  1
 * @tags      @realitycheck @automation
 *
 * Preconditions:
 *   - Complete Step 1 with the standard fixed input
 *     (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).
 *   - Land on Step 2.
 *
 * Steps:
 *   1. Select currency EGP → Continue disabled.
 *   2. Select customer type B2C → Continue still disabled.
 *   3. Enter customers = 100 → Continue still disabled.
 *   4. Enter price = 100 → Continue enabled.
 *
 * Expected Result:
 *   Continue is enabled only when every Step 2 input holds a valid value.
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-004: Automate Step 2 Continue button: disabled per missing, enabled when all valid @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[3].email,
                RealityCheckInputs[3].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[3].businessIdea,
            RealityCheckInputs[3].businessCategory,
            RealityCheckInputs[3].country,
            RealityCheckInputs[3].stage,
        );
        // Land on Step 2;.
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        
        // Select Currency EGP then assert the button is disabled
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[3].currency[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();
        // Choose the customer type -> B2C then assert again
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[3].customerType[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

        // Enter the customer count 100 then assert again
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[3].customers[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

        // Enter the price 100 then         // 
        // Assert the button is enabled
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[3].price[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonEnabled();
})