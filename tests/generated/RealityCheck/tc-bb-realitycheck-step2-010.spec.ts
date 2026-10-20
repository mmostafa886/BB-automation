/**
 * @jira      BZNS-3852
 * @title     Verify customer-count realism scoring for all benchmark scoring ranges  
 */

import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-010: Verify customer-count realism scoring for all benchmark scoring ranges @RealityCheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(realityCheckInputs.customerCountRealismScoring.mail,
                realityCheckInputs.customerCountRealismScoring.password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Select "Other" from the country dropdown.
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            realityCheckInputs.customerCountRealismScoring.businessIdea,
            realityCheckInputs.customerCountRealismScoring.businessCategory,
            realityCheckInputs.customerCountRealismScoring.country,
            realityCheckInputs.customerCountRealismScoring.stage,
        );
        // Land on Step 2;
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        const startingScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        // Select customer type B2C
        await pomSelfHealing.realityCheckPage.selectCustomerType(realityCheckInputs.customerCountRealismScoring.customerType[0]);

        // Enter customer count 150 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerCountRealismScoring.customers[0]);
        
        // Assert score is increased by 20 points
        let updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.customerCountRealismScoring.expectedScoreIncrease![0]);
        
        // Enter customer count 25 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerCountRealismScoring.customers[1]);
        
        // Assert score is increased by 15 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.customerCountRealismScoring.expectedScoreIncrease![1]);
        
        // Enter customer count 400 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerCountRealismScoring.customers[2]);
        
        // Assert score is increased by 15 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.customerCountRealismScoring.expectedScoreIncrease![2]);
        
        // Enter customer count 700 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerCountRealismScoring.customers[3]);
        
        // Assert score is increased by 10 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.customerCountRealismScoring.expectedScoreIncrease![3]);
        
        // Enter customer count 19 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerCountRealismScoring.customers[4]);
        
        // Assert score is increased by 5 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.customerCountRealismScoring.expectedScoreIncrease![4]);
        
        // Enter customer count 1500 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(realityCheckInputs.customerCountRealismScoring.customers[5]);
        
        // Assert score is increased by 0 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, realityCheckInputs.customerCountRealismScoring.expectedScoreIncrease![5]);


})