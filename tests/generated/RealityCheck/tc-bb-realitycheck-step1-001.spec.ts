import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckStep1Inputs.json';

/**
 * @jira   BZNS-3854
 * @title  Automation - Reality Check - Step1: Verify Minimum Length Validation Message Appears When Business Idea Contains Fewer Than 20 Characters
 */
const input = realityCheckInputs.minimumLengthMessage;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertMinimumMsgVisible(input.failedMessage);
    await realityCheck.assertScore(input.score, input.failedMessage);
    await realityCheck.assertHint(input.hint, input.failedMessage);
    await realityCheck.assertContinueButtonDisabled(input.failedMessage);
});
