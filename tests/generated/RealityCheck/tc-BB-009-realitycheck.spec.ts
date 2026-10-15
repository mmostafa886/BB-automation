/**
 * @jira      BZNS-3954
 * @title     Verify the price field is disabled before currency selection and enabled after selection  
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-009: Verify the price field is disabled before currency selection and enabled after selection @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[8].email,
                RealityCheckInputs[8].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Select "Other" from the country dropdown.
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[8].businessIdea,
            RealityCheckInputs[8].businessCategory,
            RealityCheckInputs[8].country,
            RealityCheckInputs[8].stage,
        );
        // Land on Step 2;
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        // Verify the "Price per product or service" field is disabled (not focusable, no typing possible) while no currency is selected.
        await pomSelfHealing.realityCheckPage.assertPriceFieldsDisabled();
        
        // Select currency EGP.
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[8].currency[0]);

        // Verify the price field becomes enabled and accepts input.
        await pomSelfHealing.realityCheckPage.assertPriceFieldEnabled();


})