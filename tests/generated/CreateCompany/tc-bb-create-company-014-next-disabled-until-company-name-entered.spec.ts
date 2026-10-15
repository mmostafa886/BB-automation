import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3831
 * @title  Automation-Company Creation: Verify that the Next button in Step 4 remains disabled until a company name is entered and becomes enabled after entering a company name.
 */
const input = createCompanyInputs.companyNameGatesNext;

test.describe('CreateCompany - Company Details step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Reach the Company Details step ───────────────────────────────────
        await wizard.openCompaniesMenu();
        await wizard.clickCreateNewCompany();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.selectIndustry(input.industry);
        await wizard.clickNext();
        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);

        // ── Empty company name → Next disabled ───────────────────────────────
        await wizard.assertCompanyName('');
        await wizard.assertNextDisabled();

        // ── Another field filled → Next still disabled ───────────────────────
        await wizard.fillTagline(input.tagline);
        await wizard.assertTagline(input.tagline);
        await wizard.assertNextDisabled();

        // ── Whitespace only → Next still disabled ────────────────────────────
        await wizard.fillCompanyName(input.whitespaceName);
        await wizard.assertCompanyName(input.whitespaceName);
        await wizard.assertNextDisabled();

        // ── Company name entered → Next enabled ──────────────────────────────
        await wizard.fillCompanyName(input.companyName);
        await wizard.assertCompanyName(input.companyName);
        await wizard.assertNextEnabled();

        // ── Company name cleared → Next disabled again ───────────────────────
        await wizard.clearCompanyName();
        await wizard.assertCompanyName('');
        await wizard.assertNextDisabled();
    });
});
