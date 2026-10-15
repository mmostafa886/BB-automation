import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3824
 * @title  Automation-Company Creation: Select a company stage and go to the next step
 */
const input = createCompanyInputs.chooseStageAndGoNext;

test.describe('CreateCompany - Company Stage step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Open the Create New Company wizard and pass the describe step ────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.clickNext();

        // ── Company Stage step ───────────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.assertCompanyStageStepLoaded(input.stageStepNumber, input.stageStepTitle, input.stages);
        await pomSelfHealing.createCompanyPage.assertNoCompanyStageSelected();
        await pomSelfHealing.createCompanyPage.assertNextDisabled();

        await pomSelfHealing.createCompanyPage.selectCompanyStage(input.selectedStage);
        await pomSelfHealing.createCompanyPage.assertCompanyStageSelected(input.selectedStage);
        await pomSelfHealing.createCompanyPage.assertNextEnabled();
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
