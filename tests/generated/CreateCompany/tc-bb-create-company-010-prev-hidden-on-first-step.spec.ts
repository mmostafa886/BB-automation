import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @jira   BZNS-3972
 * @title  Automation - Company Creation: Verify Previous Button Is Hidden on the First Step and Appears from the Second Step
 */
const input = createCompanyInputs.prevHiddenOnFirstStep;

test.describe('CreateCompany - Prev button', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Step 1: no Prev ──────────────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.assertDescribeStepLoaded(input.describeOptions);
        await pomSelfHealing.createCompanyPage.assertPrevHidden();
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.describeOption);
        await pomSelfHealing.createCompanyPage.assertPrevHidden();

        // ── Step 2: Prev appears ─────────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.stageStepNumber, input.stageStepTitle);
        await pomSelfHealing.createCompanyPage.assertPrevVisible();

        // ── Back on step 1: Prev is gone again ───────────────────────────────
        await pomSelfHealing.createCompanyPage.clickPrev();
        await pomSelfHealing.createCompanyPage.assertStillOnDescribeStep();
        await pomSelfHealing.createCompanyPage.assertPrevHidden();
    });
});
