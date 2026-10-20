/**
 * @jira      BZNS-3848
 * @title     Verify selecting Other routes benchmark comparisons using global benchmark  
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-008: Verify selecting Other routes benchmark comparisons using global benchmark @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.otherCategoryGlobalBenchmark.mail,
                realityCheckInputs.otherCategoryGlobalBenchmark.password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Select "Other" from the country dropdown.
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            realityCheckInputs.otherCategoryGlobalBenchmark.businessIdea,
            realityCheckInputs.otherCategoryGlobalBenchmark.businessCategory,
            realityCheckInputs.otherCategoryGlobalBenchmark.country,
            realityCheckInputs.otherCategoryGlobalBenchmark.stage,
        );
        // Land on Step 2;
        const startingScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        await pomSelfHealing.realityCheckPage.selectCurrency(realityCheckInputs.otherCategoryGlobalBenchmark.currency[0]);

        // Enter customer type B2C, customers = 100.
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.otherCategoryGlobalBenchmark.customers[0]);
        await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.otherCategoryGlobalBenchmark.customerType[0]);
        
        // Verify the score is increased by 20 points.
        const updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.otherCategoryGlobalBenchmark.expectedScoreIncrease![0])


})