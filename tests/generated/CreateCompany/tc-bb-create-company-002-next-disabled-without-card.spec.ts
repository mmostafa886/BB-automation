import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-002
 * @title        Next stays disabled until a describe card is chosen
 * @module       CreateCompany
 * @priority     P1
 * @tags         @createcompany @automation @negative
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` can sign in and has at least one company,
 *     so the companies menu is shown in the side bar.
 *   - No company is created — the flow never leaves step 1 of the wizard.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. Click the "+" icon next to the company name in the side bar.
 *   3. Click "Create New Company".
 *   4. Assert the "Which of these best describe you?" step shows the 9 cards and none is selected.
 *   5. Assert Next is disabled.
 *   6. Try to click Next without choosing a card.
 *   7. Assert the wizard is still on the describe step and Next is still disabled.
 */
const input = createCompanyInputs.nextDisabledWithoutCard;

test.describe('CreateCompany - Describe step', () => {
    test(`${input.test} @createcompany @automation @negative`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
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

        // ── Next cannot be used without a card ───────────────────────────────
        await pomSelfHealing.createCompanyPage.assertNextDisabled();
        await pomSelfHealing.createCompanyPage.attemptNextWhileDisabled();
        await pomSelfHealing.createCompanyPage.assertStillOnDescribeStep();
        await pomSelfHealing.createCompanyPage.assertNextDisabled();
    });
});
