/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 * 
 * @testcase TC-3874
 * @title Verify login page displays correctly when accessed directly
 * @module Login
 * @area Login
 * @priority 2
 * @tags @login; @P1
 * 
 * @generated 2026-03-08T12:47:38.422Z
 * @revision 3
 */

import { test, expect } from '../../fixtures/self-healing-fixture';

test.describe('Login - Verify login page displays correctly when accessed directly', () => {
  test('TC-3874: Verify login page displays correctly when accessed directly @login @P1', async ({ selfHealingFixture: { pomSelfHealing } }) => {

    // Step 1: Open a new browser window (incognito) and navigate to the application URL
    await pomSelfHealing.loginPage.navigateToLogin();

    // Step 2: Verify the Login screen is displayed successfully
    await pomSelfHealing.loginPage.assertLoginPageVisible();
  });
});