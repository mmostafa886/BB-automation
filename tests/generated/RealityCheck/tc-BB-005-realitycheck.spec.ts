/**
 * @testcase  TC-BB-005-realitycheck
 * @title     Verify customer-type selection is required
 * @jira      BZNS-3952
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
 *   1. Fill the other Step 2 fields validly (currency EGP, customers = 100, price = 1500),
 *      leaving customer type unselected → Continue disabled.
 *   2. Select customer type B2C → Continue enabled.
 *
 * Expected Result:
 *   Customer type is mandatory: Continue is blocked without a selection and unblocks
 *   once one card is selected (AC16).
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-005: Verify customer-type selection is required @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[4].email,
                RealityCheckInputs[4].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[4].businessIdea,
            RealityCheckInputs[4].businessCategory,
            RealityCheckInputs[4].country,
            RealityCheckInputs[4].stage,
        );
        // Land on Step 2;.
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        
        // Fill all other Step 2 fields validly (currency = EGP, customers = 100, price = 1500) but leave customer type unselected.
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[4].currency[0]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[4].customers[0]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[4].price[0]);

        // Verify the Continue button remains disabled.
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

        // Select a customer type (B2C).
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[4].customerType[0]);

        // Verify Continue becomes enabled (all other inputs already valid).
        await pomSelfHealing.realityCheckPage.assertContinueButtonEnabled();
})