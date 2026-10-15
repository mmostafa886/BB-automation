/**
 * @jira      BZNS-3848
 * @title     Verify selecting Other routes benchmark comparisons using global benchmark  
 */

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-008: Verify selecting Other routes benchmark comparisons using global benchmark @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[7].email,
                RealityCheckInputs[7].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Select "Other" from the country dropdown.
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[7].businessIdea,
            RealityCheckInputs[7].businessCategory,
            RealityCheckInputs[7].country,
            RealityCheckInputs[7].stage,
        );
        // Land on Step 2;
        const startingScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        await pomSelfHealing.realityCheckPage.selectCurrency(RealityCheckInputs[7].currency[0]);

        // Enter customer type B2C, customers = 100.
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[7].customers[0]);
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[7].customerType[0]);
        
        // Verify the score is increased by 20 points.
        const updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[7].expectedScoreIncrease![0])


})