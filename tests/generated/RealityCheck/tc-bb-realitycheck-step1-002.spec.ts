import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckStep1Inputs.json';

/**
 * @jira   BZNS-3855
 * @title  Automation - Reality Check - Step1: Verify Maximum Length Validation Message Appears When Business Idea Exceeds 300 Characters
 */
const input = realityCheckInputs.maximumLengthMessage;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertMaximumMsgVisible(input.failedMessage);
    await realityCheck.assertScore(input.score, input.failedMessage);
    await realityCheck.assertHint(input.hint, input.failedMessage);
    await realityCheck.assertContinueButtonDisabled(input.failedMessage);
});
