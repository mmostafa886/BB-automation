/**
 * @jira      BZNS-3952
 * @title     Verify customer-type selection is required
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-005: Verify customer-type selection is required @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.customerTypeRequired.mail,
                realityCheckInputs.customerTypeRequired.password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            realityCheckInputs.customerTypeRequired.businessIdea,
            realityCheckInputs.customerTypeRequired.businessCategory,
            realityCheckInputs.customerTypeRequired.country,
            realityCheckInputs.customerTypeRequired.stage,
        );
        // Land on Step 2;.
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        
        // Fill all other Step 2 fields validly (currency = EGP, customers = 100, price = 1500) but leave customer type unselected.
        await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.customerTypeRequired.currency[0]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerTypeRequired.customers[0]);
        await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.customerTypeRequired.price![0]);

        // Verify the Continue button remains disabled.
        await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

        // Select a customer type (B2C).
        await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.customerTypeRequired.customerType[0]);

        // Verify Continue becomes enabled (all other inputs already valid).
        await pomSelfHealing.realityCheckPage.assertContinueButtonEnabled();
})