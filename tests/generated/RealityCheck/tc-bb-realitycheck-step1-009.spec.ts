import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckStep1Inputs.json';

/**
 * @jira   BZNS-3859
 * @title  Automation - Reality Check - Step1: Verify Selected Business Category Is Reflected in the Live Preview Industry Lens
 */
const input = realityCheckInputs.industryLensReflectsCategory;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertIndustryLensPlaceholder(input.lensPlaceholder, input.failedMessage);

    await realityCheck.selectCategory(input.category);
    await realityCheck.assertIndustryLens(input.category, input.failedMessage);
    await realityCheck.assertIndustryLens(input.lensText, input.failedMessage);

    // Changing the category replaces the block rather than adding to it.
    await realityCheck.selectCategory(input.switchCategory);
    await realityCheck.assertIndustryLens(input.switchCategory, input.failedMessage);
    await realityCheck.assertIndustryLens(input.switchLensText, input.failedMessage);
    await realityCheck.assertIndustryLensDoesNotShow(input.category, input.failedMessage);
    await realityCheck.assertIndustryLensDoesNotShow(input.lensText, input.failedMessage);
});
