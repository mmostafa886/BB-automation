/**
 * @jira      BZNS-3850
 * @title     Verify monthly revenue calculations support decimal prices correctly
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-002: Verify monthly revenue calculations support decimal prices correctly @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.decimalPriceRevenue.mail,
                realityCheckInputs.decimalPriceRevenue.password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            realityCheckInputs.decimalPriceRevenue.businessIdea,
            realityCheckInputs.decimalPriceRevenue.businessCategory,
            realityCheckInputs.decimalPriceRevenue.country,
            realityCheckInputs.decimalPriceRevenue.stage,
        );
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        // Land on Step 2; customer type B2C.
        await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.decimalPriceRevenue.customerType[0]);
        
        // 1- Select currency USD; enter customers = 3, price = 19.99 → verify monthly revenue = USD 59.97 exactly (no floating-point artifacts like 59.969999).
        await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.decimalPriceRevenue.currency[0]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.decimalPriceRevenue.customers[0]);
        await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.decimalPriceRevenue.price![0]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(realityCheckInputs.decimalPriceRevenue.expectedRevenueDisplay![0]);

        // 2- Select currency EGP; enter customers = 100, price = 1499.99 → verify revenue = EGP 149,999 (confirm the display/rounding rule: 149,999.00 vs 149,999 — record actual).
        await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.decimalPriceRevenue.currency[1]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.decimalPriceRevenue.customers[1]);
        await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.decimalPriceRevenue.price![1]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(realityCheckInputs.decimalPriceRevenue.expectedRevenueDisplay![1]);

        // 3- Enter customers = 7, price = 0.99 → verify revenue = 6.93.
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.decimalPriceRevenue.customers[2]);
        await pomSelfHealing.realityCheckPage.fillPrice(realityCheckInputs.decimalPriceRevenue.price![2]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(realityCheckInputs.decimalPriceRevenue.expectedRevenueDisplay![2]);
});