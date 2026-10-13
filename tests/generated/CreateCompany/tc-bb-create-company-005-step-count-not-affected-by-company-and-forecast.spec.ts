import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3826
 * @title  Automation-Company Creation: Verify that navigating to any page, company, or forecast from the sidebar during company creation displays an unsaved changes confirmation dialog without increasing the number of steps
 */
const input = createCompanyInputs.stepCountNotAffectedByCompanyAndForecast;

test.describe('CreateCompany - Wizard steps', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Open the wizard on a step that shows the stepper (step 2) ────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.assertAccountHasMultipleCompanies();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);

        // ── Click a company name from the companies menu ─────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.selectCompanyFromMenu(input.company);
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogShown(input.unsavedChangesTitle, input.unsavedChangesMessage);
        await pomSelfHealing.createCompanyPage.closeUnsavedChangesDialog();
        await pomSelfHealing.homePage.assertSelectedCompany(input.company);
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);

        // ── Click a forecast name from the forecasts menu ────────────────────
        await pomSelfHealing.homePage.openFoecastsMenu();
        await pomSelfHealing.createCompanyPage.selectForecastFromMenu(input.forecast);
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogShown(input.unsavedChangesTitle, input.unsavedChangesMessage);
        await pomSelfHealing.createCompanyPage.closeUnsavedChangesDialog();
        await pomSelfHealing.homePage.assertSelectedForecast(input.forecast);
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);

        // ── The wizard carries on with the same 8 steps ──────────────────────
        await pomSelfHealing.createCompanyPage.selectCompanyStage(input.selectedStage);
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
        await pomSelfHealing.createCompanyPage.assertStepCount(input.expectedStepCount);
    });
});
