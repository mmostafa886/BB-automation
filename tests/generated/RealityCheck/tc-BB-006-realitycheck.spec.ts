/**
 * @jira      BZNS-3951
 * @title     Verify the user can select a currency and the selected value is displayed in the field and as price prefix
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-006: Verify the user can select a currency and the selected value is displayed in the field and as price prefix @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[5].email,
                RealityCheckInputs[5].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[5].businessIdea,
            RealityCheckInputs[5].businessCategory,
            RealityCheckInputs[5].country,
            RealityCheckInputs[5].stage,
        );
        // Land on Step 2;.
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        
        // Open the currency dropdown and select EGP.
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[5].currency[0]);

        // Verify the field displays the selected value (EGP / Egyptian Pound per design).
        // Verify the dropdown is closed and the placeholder is replaced.
        await pomSelfHealing.realityCheckPage.assertSelectedCurrency(RealityCheckInputs[5].currency[0]);
        // Verify the currency is displayed as currency prefix
        await pomSelfHealing.realityCheckPage.assertPriceCurrencyPrefix(RealityCheckInputs[5].currency[0]);

        // Fill customers and price so the monthly revenue renders, then verify it uses the selected currency
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[5].customers[0]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[5].price![0]);
        await pomSelfHealing.realityCheckPage.assertRevenueCurrency(RealityCheckInputs[5].currency[0]);


        // Select a different currency (e.g., USD) and verify the displayed value updates.
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[5].currency[1]);
        await pomSelfHealing.realityCheckPage.assertSelectedCurrency(RealityCheckInputs[5].currency[1]);
        await pomSelfHealing.realityCheckPage.assertPriceCurrencyPrefix(RealityCheckInputs[5].currency[1]);
        await pomSelfHealing.realityCheckPage.assertRevenueCurrency(RealityCheckInputs[5].currency[1]);


        
})