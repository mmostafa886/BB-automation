import { test } from '../../fixtures/self-healing-fixture';
import realityCheckInputs from '../../../test-data/RealityCheckStep1Inputs.json';

/**
 * @jira   BZNS-3860
 * @title  Automation - Reality Check - Step1: Verify Country Dropdown Displays All 42 Countries, "Other" as the Last Option, and "Select Country" as the Default Placeholder
 */
const input = realityCheckInputs.countryDropdownOptions;

test(`${input.jira}: ${input.test} @RealityCheck @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
    const realityCheck = pomSelfHealing.realityCheckPage;

    await pomSelfHealing.loginPage.navigateToLogin();
    await pomSelfHealing.loginPage.openSignInModal();
    await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
    await pomSelfHealing.homePage.waitForDashboardLoaded();

    await realityCheck.navigateToRealityCheck();
    await realityCheck.enterIdea(input.idea);

    await realityCheck.assertCountryPlaceholder(input.countryPlaceholder, input.failedMessage);
    await realityCheck.openCountrySelect();
    await realityCheck.assertCountryOptions(input.countryCount, input.lastCountryOption, input.failedMessage);
});
