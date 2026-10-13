import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3823
 * @title  Automation-Company Creation: Can't go to step 1 without choose a card
 */
const input = createCompanyInputs.nextDisabledWithoutCard;

test.describe('CreateCompany - Describe step', () => {
    test(`${input.test} @createcompany @automation @negative`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Open the Create New Company wizard ───────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.assertDescribeStepLoaded(input.describeOptions);
        await pomSelfHealing.createCompanyPage.assertNoDescribeOptionSelected();

        // ── Next cannot be used without a card ───────────────────────────────
        await pomSelfHealing.createCompanyPage.assertNextDisabled();
        await pomSelfHealing.createCompanyPage.attemptNextWhileDisabled();
        await pomSelfHealing.createCompanyPage.assertStillOnDescribeStep();
        await pomSelfHealing.createCompanyPage.assertNextDisabled();
    });
});
