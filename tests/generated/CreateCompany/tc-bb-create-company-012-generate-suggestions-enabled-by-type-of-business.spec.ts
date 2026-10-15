import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3829
 * @title  Automation-Company Creation: Verify that the Generate Suggestion button is disabled when the "What type of business is this?" field is empty and becomes enabled when data is entered.
 */
const input = createCompanyInputs.generateSuggestionsGatedByTypeOfBusiness;

test.describe('CreateCompany - Business Information step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Reach the Business Information step ──────────────────────────────
        await wizard.openCompaniesMenu();
        await wizard.clickCreateNewCompany();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);

        // ── Empty field → button disabled ────────────────────────────────────
        await wizard.assertTypeOfBusiness('');
        await wizard.assertGenerateSuggestionsDisabled();

        // ── Data entered → button enabled ────────────────────────────────────
        await wizard.fillTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertGenerateSuggestionsEnabled();

        // ── Cleared again → button disabled again ────────────────────────────
        await wizard.clearTypeOfBusiness();
        await wizard.assertTypeOfBusiness('');
        await wizard.assertGenerateSuggestionsDisabled();
    });
});
