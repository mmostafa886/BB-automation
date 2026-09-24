import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-011
 * @title        Prev goes back one step at a time and keeps the data entered in each step
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company.
 *   - No company is created — the flow never goes past step 4.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name, then "Create New Company".
 *   3. Fill steps 1–4: describe card → Next, company stage → Next, type of business + industry → Next,
 *      company name.
 *   4. Click Prev; assert step 3 is shown with the type of business and industry kept.
 *   5. Click Prev; assert step 2 is shown with the company stage still selected and Next enabled.
 *   6. Click Prev; assert step 1 is shown with the describe card still selected, Next enabled, no Prev.
 *   7. Click Next three times; assert each step still shows its data, ending on step 4 with the
 *      company name kept.
 *
 * Notes:
 *   - Stops at step 4 on purpose: going back to step 5 (Financial) re-renders the date field as a raw
 *     JS date and opens the picker on "Invalid date" (seen on UAT), which would need its own test.
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
