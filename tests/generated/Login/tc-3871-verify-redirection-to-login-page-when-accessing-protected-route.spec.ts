/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 * 
 * @testcase TC-3871
 * @title Verify redirection to login page when accessing protected route
 * @module Login
 * @area Login
 * @priority 2
 * @tags @login; @P1
 * 
 * @generated 2026-03-08T12:47:46.098Z
 * @revision 3
 */

import { test, expect } from '../../fixtures/self-healing-fixture';

test.describe('Login - Verify redirection to login page when accessing protected route', () => {
  test('TC-3871: Verify redirection to login page when accessing protected route @login @P1', async ({ selfHealingFixture: { pomSelfHealing } }) => {

    // Step 1: Navigate directly to a protected route without authentication
    await pomSelfHealing.loginPage.navigateToProtectedRoute();

    // Step 2: Assert that the user is redirected to the login page with SSO button and UI elements visible
    await pomSelfHealing.loginPage.assertLoginPageVisible();
  });
});