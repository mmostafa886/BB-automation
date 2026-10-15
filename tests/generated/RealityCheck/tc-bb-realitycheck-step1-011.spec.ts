import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckStep1Inputs.json';

/**
 * @jira   BZNS-3861
 * @title  Automation - Reality Check - Step 1: Verify the Continue Button Is Enabled When Idea, Business Category, Country, and Founder Situation Are Validly Selected, and Disabled When Any Required Field Is Not Selected
 */
const input = realityCheckInputs.completeStepOne;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertNoLengthValidationMessages(input.failedMessage);

    // The score only rises once a category is chosen, so fill the step before reading it.
    await realityCheck.selectCategory(input.category);
    await realityCheck.selectCountry(input.country);
    await realityCheck.selectStage(input.stage);
    await realityCheck.assertHint(input.hint, input.failedMessage);

    await realityCheck.assertContinueButtonEnabled(input.failedMessage);
    await realityCheck.clickContinueButton();
    await realityCheck.assertCurrentStep(input.nextStep, input.failedMessage);
});
