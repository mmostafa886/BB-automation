import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

/**
 * @jira   BZNS-3858
 * @title  Automation - Reality Check - Step1: Verify Live Preview Displays "Not Enough Information Yet" for a Valid Idea Between 20 and 300 Characters
 */
const input = realityCheckInputs.notEnoughInformationHint;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertNoLengthValidationMessages(input.failedMessage);
    await realityCheck.assertHint(input.hint, input.failedMessage);
});
