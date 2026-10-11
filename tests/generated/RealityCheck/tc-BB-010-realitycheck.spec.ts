/**
 * @testcase  TC-BB-010-realitycheck
 * @title     Verify customer-count realism scoring for all benchmark scoring ranges  
 * @module    RealityCheck
 * @area      RealityCheck
 * @jira      BZNS-3852
 * @priority  1
 * @tags      @realitycheck @automation
 * Preconditions

Preconditions

Complete Step 1 with the standard fixed input (premium Egyptian cotton bedding idea / E-commerce / Egypt / Testing an idea).

Land on Step 2;.

Steps — for customer type B2C, enter counts hitting every band and verify the awarded points:

Within range ({floor} ≤ x ≤ {ceiling}) → 20 pts

Between 50% of floor and floor → 15 pts

Between ceiling and 2× ceiling → 15 pts

Between 2× and 5× ceiling → 10 pts

Below 50% of floor → 5 pts

Above 5× ceiling → 0 pts

Test Data: B2C benchmark range: 40–250; 

Steps:

use customer counts 

150 Customer → 20 pts

25 Customer → 15 pts

400 Customer → 15 pts

700 Customer → 10 pts

19 Customer → 5 pts

1500 Customer → 0 pts



Expected Result
Points match the lookup table for every customer type; 
*/

import { test } from '../../fixtures/self-healing-fixture';
import RealityCheckInputs  from '../../../test-data/RealityCheckInputs.json';

test('TC-BB-010: Verify customer-count realism scoring for all benchmark scoring ranges @realitycheck @automation', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // Login
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(RealityCheckInputs[9].email,
                RealityCheckInputs[9].password);
        await pomSelfHealing.homePage.assertPageLoaded();
        // Navigate to Reality Check Page
        await pomSelfHealing.realityCheckPage.navigateToRealityCheck();
        await pomSelfHealing.realityCheckPage.assertWizardLoaded();
        // Select "Other" from the country dropdown.
        await pomSelfHealing.realityCheckPage.fillStep1InputsAndSubmit(
            RealityCheckInputs[9].businessIdea,
            RealityCheckInputs[9].businessCategory,
            RealityCheckInputs[9].country,
            RealityCheckInputs[9].stage,
        );
        // Land on Step 2;
        await pomSelfHealing.realityCheckPage.assertStep2Loaded();
        const startingScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        // Select customer type B2C
        await pomSelfHealing.realityCheckPage.selectCustomerType(RealityCheckInputs[9].customerType[0]);

        // Enter customer count 150 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[9].customers[0]);
        
        // Assert score is increased by 20 points
        let updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[9].expectedScoreIncrease![0]);
        
        // Enter customer count 25 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[9].customers[1]);
        
        // Assert score is increased by 15 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[9].expectedScoreIncrease![1]);
        
        // Enter customer count 400 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[9].customers[2]);
        
        // Assert score is increased by 15 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[9].expectedScoreIncrease![2]);
        
        // Enter customer count 700 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[9].customers[3]);
        
        // Assert score is increased by 10 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[9].expectedScoreIncrease![3]);
        
        // Enter customer count 19 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[9].customers[4]);
        
        // Assert score is increased by 5 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[9].expectedScoreIncrease![4]);
        
        // Enter customer count 1500 customer
        await pomSelfHealing.realityCheckPage.fillCustomerCount(RealityCheckInputs[9].customers[5]);
        
        // Assert score is increased by 0 points
        updatedScore = await pomSelfHealing.realityCheckPage.getCurrentScore();
        await pomSelfHealing.realityCheckPage.assertScoreIncrease(startingScore, updatedScore, RealityCheckInputs[9].expectedScoreIncrease![5]);


})