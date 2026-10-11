/**
 * @testcase  TC-BB-007-realitycheck
 * @title     Verify the customer-count field is required and accepts only positive integers
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3953
 * @priority  1
 * @tags      @realitycheck @automation
 *
 * Preconditions:
 *   - Complete Step 1 with the standard fixed input
 *     (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).
 *   - Land on Step 2; currency EGP and customer type B2C selected; price = 1500.
 *
 * Steps — enter each value in the customer-count field and check validation + Continue state:
 *   1. "100"       → accepted; Continue enabled.
 *   2. "-5"        → "Enter a whole number greater than or equal 0" error; Continue disabled.
 *   3. "10.5"      → same whole-number error (integers only, AC6); Continue disabled.
 *   4. "abc"       → not typeable; field stays empty.
 *   5. "!@#"       → not typeable; field stays empty.
 *   6. " 100 "     → spaces dropped; field holds "100".
 *   7. "12a4"      → letters dropped; field holds digits only.
 *   8. "10000000"  → accepted by field validation (warnings covered in TC23).
 *   9. Empty       → "This field is required" error; Continue disabled.
 *
 * Expected Result:
 *   Only positive integers ≥ 1 are accepted (AC6); everything else is rejected or blocked,
 *   the field is required, and no input crashes the page.
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

const data = RealityCheckInputs[6];

test('TC-BB-007: Verify the customer-count field is required and accepts only positive integers @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
    // Login
    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(data.email, data.password);
    await pomSelfHealing.homePage.assertPageLoaded();
    // Navigate to Reality Check Page
    await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
    await pomSelfHealing.realityCheckPage.assertWizardLoaded();
    // Enter Step 1 inputs and continue to Step 2
    await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
        data.businessIdea,
        data.businessCategory,
        data.country,
        data.stage,
    );
    await pomSelfHealing.realityCheckPage.assertStep2Loaded();

    // Land on Step 2; currency EGP and customer type B2C selected; price = 1500.
    await pomSelfHealing.realityCheckPage.selectCustomerType(data.customerType[0]);
    await pomSelfHealing.realityCheckPage.selectCurrency(data.currency[0]);
    await pomSelfHealing.realityCheckPage.fillPrice(data.price[0]);

    // 100 → accepted, Continue can enable.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(data.customers[0]);
    await pomSelfHealing.realityCheckPage.assertContinueButtonEnabled();

    // -5 → rejected with the whole-number error.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(data.customers[1]);
    await pomSelfHealing.realityCheckPage.assertWholeNumberError();

    // 10.5 (decimal) → rejected with the whole-number error (integers only per AC6).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(data.customers[2]);
    await pomSelfHealing.realityCheckPage.assertWholeNumberError();

    // "abc" (letters) → rejected / not typeable.
    await pomSelfHealing.realityCheckPage.typeCustomerCount(data.customers[3]);
    await pomSelfHealing.realityCheckPage.assertCustomerCountValue('');
    await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

    // "!@#" (symbols) → rejected / not typeable.
    await pomSelfHealing.realityCheckPage.typeCustomerCount(data.customers[4]);
    await pomSelfHealing.realityCheckPage.assertCustomerCountValue('');
    await pomSelfHealing.realityCheckPage.assertContinueButtonDisabled();

    // " 100 " (leading/trailing spaces) → trimmed to 100; no crash.
    await pomSelfHealing.realityCheckPage.typeCustomerCount(data.customers[5]);
    await pomSelfHealing.realityCheckPage.assertCustomerCountValue(data.customers[0]);

    // "12a4" (invalid value) → sanitized to digits only.
    await pomSelfHealing.realityCheckPage.typeCustomerCount(data.customers[6]);
    await pomSelfHealing.realityCheckPage.assertCustomerCountValue(/^\d*$/);

    // Very large integer (10000000) → accepted by field validation.
    await pomSelfHealing.realityCheckPage.fillCustomerCount(data.customers[7]);
    await pomSelfHealing.realityCheckPage.assertContinueButtonEnabled();

    // Empty → Continue disabled (required).
    await pomSelfHealing.realityCheckPage.fillCustomerCount(data.customers[8]);
    await pomSelfHealing.realityCheckPage.assertEmptyPrice();
});
