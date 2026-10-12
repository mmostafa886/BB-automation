/**
 * @jira      BZNS-3953
 * @title     Verify the customer-count field is required and accepts only positive integers
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
    await pomSelfHealing.realityCheckPage.fillPrice(data.price![0]);

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
