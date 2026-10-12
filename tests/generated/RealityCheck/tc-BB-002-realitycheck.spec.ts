/**
 * @jira      BZNS-3850
 * @title     Verify monthly revenue calculations support decimal prices correctly
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-002: Verify monthly revenue calculations support decimal prices correctly @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[1].email,
                RealityCheckInputs[1].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[1].businessIdea,
            RealityCheckInputs[1].businessCategory,
            RealityCheckInputs[1].country,
            RealityCheckInputs[1].stage,
        );
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        // Land on Step 2; customer type B2C.
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[1].customerType[0]);
        
        // 1- Select currency USD; enter customers = 3, price = 19.99 → verify monthly revenue = USD 59.97 exactly (no floating-point artifacts like 59.969999).
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[1].currency[0]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[1].customers[0]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[1].price![0]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[1].expectedRevenueDisplay![0]);

        // 2- Select currency EGP; enter customers = 100, price = 1499.99 → verify revenue = EGP 149,999 (confirm the display/rounding rule: 149,999.00 vs 149,999 — record actual).
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[1].currency[1]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[1].customers[1]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[1].price![1]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[1].expectedRevenueDisplay![1]);

        // 3- Enter customers = 7, price = 0.99 → verify revenue = 6.93.
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[1].customers[2]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[1].price![2]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[1].expectedRevenueDisplay![2]);
});