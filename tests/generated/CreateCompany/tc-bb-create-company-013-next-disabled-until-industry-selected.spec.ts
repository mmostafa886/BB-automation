import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3830
 * @title  Automation-Company Creation: Verify that the Next button remains disabled until an industry is selected and becomes enabled after selecting an industry.
 */
const input = createCompanyInputs.industryGatesNext;

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

        // ── No industry → Next disabled ──────────────────────────────────────
        await wizard.assertNoIndustrySelected();
        await wizard.assertNextDisabled();

        // ── Type of business alone does not enable Next ──────────────────────
        await wizard.fillTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertNoIndustrySelected();
        await wizard.assertNextDisabled();

        // ── Industry selected → Next enabled and usable ──────────────────────
        await wizard.selectIndustry(input.industry);
        await wizard.assertSelectedIndustry(input.industry);
        await wizard.assertNextEnabled();
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
