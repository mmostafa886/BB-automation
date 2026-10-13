import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3827
 * @title  Automation-Company Creation: Verify that navigating to an existing company displays an unsaved changes confirmation dialog when data has been entered, and redirects directly to the Home page when no data has been entered
 */
const input = createCompanyInputs.companySwitchWithoutData;

test.describe('CreateCompany - Leaving the wizard', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Start from a known company ───────────────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.startCompany);
        await pomSelfHealing.homePage.assertSelectedCompany(input.startCompany);

        // ── Open the wizard without entering data ────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.assertDescribeStepLoaded(input.describeOptions);
        await pomSelfHealing.createCompanyPage.assertNoDescribeOptionSelected();

        // ── Switch company, land on Home with no dialog ──────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.homePage.selectFromMenu(input.targetCompany);
        await pomSelfHealing.homePage.assertOnHomePage();
        await pomSelfHealing.createCompanyPage.assertUnsavedChangesDialogNotShown();
        await pomSelfHealing.homePage.assertSelectedCompany(input.targetCompany);
    });
});
