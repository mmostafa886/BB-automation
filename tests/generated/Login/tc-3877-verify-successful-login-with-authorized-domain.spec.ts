/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 * 
 * @testcase TC-3877
 * @title Verify successful login with authorized domain
 * @module Login
 * @area Login
 * @priority 2
 * @tags @login; @P1
 * 
 * @generated 2026-03-08T12:47:33.816Z
 * @revision 3
 */

import { test, expect } from '../../fixtures/self-healing-fixture';

test.describe('Login - Verify successful login with authorized domain', () => {
  test('TC-3877: Verify successful login with authorized domain @login @P1', async ({ selfHealingFixture: { pomSelfHealing } }) => {

    // Step 1: Open a new browser window (incognito) - handled by the test runner context
    // Step 2: Navigate to the application URL and verify the Login screen is displayed
    await pomSelfHealing.loginPage.navigateToLogin();

    // Step 3: Verify the Login page is visible before interacting with SSO
    await pomSelfHealing.loginPage.assertLoginPageVisible();

    // Step 4: Click on 'Sign in using SSO' button and enter valid Azure AD credentials with the authorized domain
    await pomSelfHealing.loginPage.login();

    // Step 5: Verify login succeeds and user is redirected to the welcome/dashboard screen
    await pomSelfHealing.loginPage.assertDashboardVisible();
  });
});