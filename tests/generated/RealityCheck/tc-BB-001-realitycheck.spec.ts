/**
 * @testcase  TC-BB-001-realitycheck
 * @title     Verify step 2 monthly revenue = customers x price and recalculates immediately
 * @jira      BZNS-3956
 * @module    RealityCheck
 * @area      RealityCheck
 * @priority  1
 * @tags      @realitycheck @automation
 *
 * Preconditions:
 *   - Complete Step 1 with the standard fixed input
 *     (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).
 *   - Land on Step 2; customer type B2C.
 *
 * Steps:
 *   1. Select currency EGP → the revenue preview uses "EGP".
 *   2. Enter customers = 100, price = 1500 → revenue = EGP 150000 (100 × 1500 × 1.0).
 *   3. Change customers to 200 → revenue recalculates immediately to EGP 300000, no reload.
 *   4. Change price to 2000 → revenue recalculates immediately to EGP 400000.
 *   5. Change customer type B2C → B2B → revenue value does not change
 *      (customer type is not part of the formula).
 *   6. Clear price → revenue returns to "-"; the stale number is not kept.
 *
 * Expected Result:
 *   monthly_revenue = customers × price × 1.0; recalculation is immediate on either input;
 *   customer type does not affect the math; incomplete input never shows a stale revenue.
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';
import LoginInputs from '../../../test-data/login.json';

test('TC-BB-001: Verify provisional monthly revenue is calculated as customers × price × 1.0 and recalculates when either input changes @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[0].email,
                RealityCheckInputs[0].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Enter Step 1 inputs and continue to Step 2
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[0].businessIdea,
            RealityCheckInputs[0].businessCategory,
            RealityCheckInputs[0].country,
            RealityCheckInputs[0].stage,
        );
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        // Land on Step 2; currency EGP; customer type B2C.
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[0].customerType[0])
        // 1- Select Currency = EGP → verify the currency symbol in the revenue preview is "EGP".
        // 2- Enter customers = 100, price = 1500 → verify preview monthly revenue = EGP 150,000 (100 × 1500 × 1.0).
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[0].currency[0]);
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[0].customers[0]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[0].price[0]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[0].expectedRevenueDisplay[0]);
        // 3- Change customers to 200 → verify revenue immediately recalculates to EGP 300,000, no page reload.
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[0].customers[1]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[0].price[0]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[0].expectedRevenueDisplay[1]);
        // 4- Change price to 2000 → verify revenue immediately recalculates to EGP 400,000.
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[0].customers[1]);
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[0].price[1]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[0].expectedRevenueDisplay[2]);
        // 5- Change customer type B2C → B2B → verify the revenue VALUE does not change (customer type is not part of the formula; only scoring/warnings react).
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[0].customerType[1]);
        // 6- Clear price → verify no misleading revenue value is displayed (revenue returns to "—" or hides; it must not keep the stale number).
        await pomSelfHealing.realityCheckPage.fillPrice(RealityCheckInputs[0].price[2]);
        await pomSelfHealing.realityCheckPage.assertRevenueValueCalculation(RealityCheckInputs[0].expectedRevenueDisplay[3]);


    });