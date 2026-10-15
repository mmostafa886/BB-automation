import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3973
 * @title  Automation - Company Creation: Verify Previous Button Navigates Back One Step at a Time and Preserves Previously Entered Data
 */
const input = createCompanyInputs.prevKeepsEnteredData;

test.describe('CreateCompany - Prev button', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Fill steps 1–4 ───────────────────────────────────────────────────
        await wizard.openCompaniesMenu();
        await wizard.clickCreateNewCompany();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();

        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();

        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.fillTypeOfBusiness(input.typeOfBusiness);
        await wizard.selectIndustry(input.industry);
        await wizard.clickNext();

        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);
        await wizard.fillCompanyName(input.companyName);

        // ── Prev: 4 → 3 ──────────────────────────────────────────────────────
        await wizard.clickPrev();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.assertTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertSelectedIndustry(input.industry);
        await wizard.assertNextEnabled();

        // ── Prev: 3 → 2 ──────────────────────────────────────────────────────
        await wizard.clickPrev();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.assertCompanyStageSelected(input.selectedStage);
        await wizard.assertNextEnabled();

        // ── Prev: 2 → 1 ──────────────────────────────────────────────────────
        await wizard.clickPrev();
        await wizard.assertStillOnDescribeStep();
        await wizard.assertDescribeOptionSelected(input.describeOption);
        await wizard.assertNextEnabled();
        await wizard.assertPrevHidden();

        // ── Next again: the data is still there on every step ────────────────
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.assertCompanyStageSelected(input.selectedStage);

        await wizard.clickNext();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.assertTypeOfBusiness(input.typeOfBusiness);
        await wizard.assertSelectedIndustry(input.industry);

        await wizard.clickNext();
        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);
        await wizard.assertCompanyName(input.companyName);
    });
});
