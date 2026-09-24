import { test } from '../../fixtures/self-healing-fixture';
import createCompanyInputs from '../../../test-data/CreateCompanyInputs.json';

/**
 * @testcase     TC-BB-Create-Company-007
 * @title        Switching to an existing company before entering any data opens the Home page directly
 * @module       CreateCompany
 * @priority     P2
 * @tags         @createcompany @automation
 *
 * @preconditions
 *   - App reachable at BASE_URL; the auth landing page is shown.
 *   - The account in `test-data/CreateCompanyInputs.json` has both `startCompany` and `targetCompany`.
 *   - No company is created.
 *
 * @steps
 *   1. Navigate to the BznsBuilder auth page, sign in, and wait for the dashboard.
 *   2. From the home page, select `startCompany` so the company clicked later is a different one.
 *   3. Open "Create New Company"; assert step 1 is shown with no card selected (no data entered).
 *   4. Open the companies menu and click `targetCompany`.
 *   5. Assert the Home page is shown, no unsaved changes dialog appeared, and `targetCompany` is selected.
 *
 * Notes:
 *   - `startCompany` is selected first because clicking the company that is ALREADY selected does not
 *     open the Home page: it opens /financial/overview instead (seen on UAT).
 *     `targetCompany` must therefore differ from `startCompany`.
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
