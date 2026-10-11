/**
 * @testcase  TC-BB-009-realitycheck
 * @title     Verify the price field is disabled before currency selection and enabled after selection  
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3848
 * @priority  3
 * @tags      @realitycheck @automation
 * Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Land on Step 2 with no currency selected.

Steps

Verify the "Price per product or service" field is disabled (not focusable, no typing possible) while no currency is selected.

Attempt to click/type into the price field — verify no input is accepted.

Select currency EGP.

Verify the price field becomes enabled and accepts input.

Expected Result Price field is strictly disabled before currency selection and becomes active immediately after a currency is selected (AC2).
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-009: Verify the price field is disabled before currency selection and enabled after selection @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
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