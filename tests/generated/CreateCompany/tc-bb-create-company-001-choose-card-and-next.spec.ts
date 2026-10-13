import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3822
 * @title  Automation-Company Creation: Allow to create a new company from the + icon and go to step 1
 */
const input = createCompanyInputs.chooseCardAndGoNext;

test.describe('CreateCompany - Describe step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
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
        await pomSelfHealing.createCompanyPage.assertNextDisabled();

        // ── Choose a card and move on ────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.selectedOption);
        await pomSelfHealing.createCompanyPage.assertDescribeOptionSelected(input.selectedOption);
        await pomSelfHealing.createCompanyPage.assertNextEnabled();
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
