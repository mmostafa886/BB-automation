import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

/**
 * @jira   BZNS-3856
 * @title  Automation - Reality Check - Step1: Verify Live Preview Viability Ring Updates Based on the Idea Specificity Score 8,6,4
 */
const input = realityCheckInputs.viabilityScore8;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertNoLengthValidationMessages(input.failedMessage);
    await realityCheck.assertScore(input.score, input.failedMessage);
});
