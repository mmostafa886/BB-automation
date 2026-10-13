import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3825
 * @title  Automation-Company Creation: Can't go to the next step until choosing a stage
 */
const input = createCompanyInputs.nextDisabledWithoutStage;

test.describe('CreateCompany - Company Stage step', () => {
    test(`${input.test} @createcompany @automation @negative`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
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

        // ── Company Stage step: Next cannot be used without a stage ──────────
        await pomSelfHealing.createCompanyPage.assertCompanyStageStepLoaded(input.stageStepNumber, input.stageStepTitle, input.stages);
        await pomSelfHealing.createCompanyPage.assertNoCompanyStageSelected();
        await pomSelfHealing.createCompanyPage.assertNextDisabled();
        await pomSelfHealing.createCompanyPage.attemptNextWhileDisabled();
        await pomSelfHealing.createCompanyPage.assertCompanyStageStepLoaded(input.stageStepNumber, input.stageStepTitle, input.stages);
        await pomSelfHealing.createCompanyPage.assertNextDisabled();
    });
});
