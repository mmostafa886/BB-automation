import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3781
 * @title  Automation-Company Creation: Verify that a new account displays 6 steps with "Start Free Trial" as the primary CTA in the last step
 */
const input = createCompanyInputs.newAccountSixStepWizard;

test.describe('CreateCompany - New account wizard', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        const wizard = pomSelfHealing.createCompanyPage;

        // ── Sign in — a new account lands on the wizard by itself ────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await wizard.waitForWizardLoaded();

        // ── Step 1 ───────────────────────────────────────────────────────────
        await wizard.assertDescribeStepLoaded(input.describeOptions);
        await wizard.assertPrevHidden();
        await wizard.selectDescribeOption(input.describeOption);
        await wizard.clickNext();

        // ── Step 2: the stepper shows 6 steps, not 8 ─────────────────────────
        await wizard.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.selectCompanyStage(input.selectedStage);
        await wizard.clickNext();

        // ── Step 3 ───────────────────────────────────────────────────────────
        await wizard.assertCurrentStep(input.businessInfoStepNumber, input.businessInfoStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.selectIndustry(input.industry);
        await wizard.clickNext();

        // ── Step 4 ───────────────────────────────────────────────────────────
        await wizard.assertCurrentStep(input.companyDetailsStepNumber, input.companyDetailsStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.fillCompanyName(input.companyName);
        await wizard.clickNext();

        // ── Step 5 ───────────────────────────────────────────────────────────
        await wizard.assertCurrentStep(input.financialStepNumber, input.financialStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.pickFirstYearOfForecast(input.forecastStartDay);
        await wizard.selectDuration(input.durationYears);
        await wizard.selectMonthlyDetail(input.monthlyDetail);
        await wizard.selectNumberFormat(input.numberFormat);
        await wizard.clickNext();

        // ── Step 6: the last step, with the Start Free Trial call to action ──
        await wizard.assertCurrentStep(input.lastStepNumber, input.lastStepTitle);
        await wizard.assertStepCount(input.expectedStepCount);
        await wizard.assertPrimaryCtaLabel(input.primaryCtaLabel);
        await wizard.assertNextEnabled();
    });
});
