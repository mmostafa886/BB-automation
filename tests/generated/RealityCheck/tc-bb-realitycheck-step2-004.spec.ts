/**
 * @jira      BZNS-3847
 * @title     Step 2 Continue button: disabled per missing input, enabled when all valid
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-004: Automate Step 2 Continue button: disabled per missing, enabled when all valid @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.continueButtonGate.mail,
                realityCheckInputs.continueButtonGate.password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            realityCheckInputs.continueButtonGate.businessIdea,
            realityCheckInputs.continueButtonGate.businessCategory,
            realityCheckInputs.continueButtonGate.country,
            realityCheckInputs.continueButtonGate.stage,
        );
        // Land on Step 2;.
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        
        // Select Currency EGP then assert the button is disabled
        await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.continueButtonGate.currency[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();
        // Choose the customer type -> B2C then assert again
        await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.continueButtonGate.customerType[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

        // Enter the customer count 100 then assert again
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.continueButtonGate.customers[0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

        // Enter the price 100 then         // 
        // Assert the button is enabled
        await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.continueButtonGate.price![0]);
        await pomSelfHealing.realityCheckPage.assertContinueButtonEnabled();
})