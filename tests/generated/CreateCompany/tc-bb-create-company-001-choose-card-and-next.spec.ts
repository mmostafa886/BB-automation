import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-001
 * @title        Choose a describe card and move to the Company Stage step
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company,
 *     so the companies menu is shown in the side bar.
 *   - No company is created — the flow stops on step 2 of the wizard.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name in the side bar.
 *   3. Click "Create New Company".
 *   4. Assert the "Which of these best describe you?" step shows the 9 cards, none selected, Next disabled.
 *   5. Click one of the cards.
 *   6. Assert that card is selected and Next is enabled.
 *   7. Click Next.
 *   8. Assert the wizard is on step 2, "Company Stage".
 */
const input = createCompanyInputs.chooseCardAndGoNext;

test.describe('CreateCompany - Describe step', () => {
    test(`${input.test} @createcompany @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        // ── Sign in ──────────────────────────────────────────────────────────
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.openSignInModal();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(input.mail, input.password);
        await pomSelfHealing.homePage.waitForDashboardLoaded();

        // ── Open the Create New Company wizard ───────────────────────────────
        await pomSelfHealing.createCompanyPage.openCompaniesMenu();
        await pomSelfHealing.createCompanyPage.clickCreateNewCompany();
        await pomSelfHealing.createCompanyPage.assertDescribeStepLoaded(input.describeOptions);
        await pomSelfHealing.createCompanyPage.assertNoDescribeOptionSelected();
        await pomSelfHealing.createCompanyPage.assertNextDisabled();

        // ── Choose a card and move on ────────────────────────────────────────
        await pomSelfHealing.createCompanyPage.selectDescribeOption(input.selectedOption);
        await pomSelfHealing.createCompanyPage.assertDescribeOptionSelected(input.selectedOption);
        await pomSelfHealing.createCompanyPage.assertNextEnabled();
        await pomSelfHealing.createCompanyPage.clickNext();
        await pomSelfHealing.createCompanyPage.assertCurrentStep(input.nextStepNumber, input.nextStepTitle);
    });
});
