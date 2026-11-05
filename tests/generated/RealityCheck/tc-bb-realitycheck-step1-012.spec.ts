import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckInputs.json';

/**
 * @jira   BZNS-3861
 * @title  Automation - Reality Check - Step 1: Verify the Continue Button Is Enabled When Idea, Business Category, Country, and Founder Situation Are Validly Selected, and Disabled When Any Required Field Is Not Selected
 */
const input = realityCheckInputs.continueEnabledWhenAllSelected;

test(`Step 1 - TC 012: Verify Continue is enabled once the idea, category, country and founder situation are all selected @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertContinueButtonDisabled(input.failedMessage);

    await realityCheck.selectCategory(input.category);
    await realityCheck.assertContinueButtonDisabled(input.failedMessage);

    await realityCheck.selectCountry(input.country);
    await realityCheck.assertContinueButtonDisabled(input.failedMessage);

    await realityCheck.selectStage(input.stage);
    await realityCheck.assertContinueButtonEnabled(input.failedMessage);
});
