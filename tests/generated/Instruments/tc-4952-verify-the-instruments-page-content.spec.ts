/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 * 
 * @testcase TC-4952
 * @title Verify the instruments page content
 * @module Instruments
 * @area Instruments
 * @priority 2
 * @tags @Instruments; @P1
 * 
 * @generated 2026-03-08T11:11:24.457Z
 * @revision 3
 */

import { test, expect } from '../../fixtures/self-healing-fixture';

test.describe('Instruments - Verify the instruments page content', () => {
  test('TC-4952: Verify the instruments page content @Instruments @P1', async ({ selfHealingFixture: { pomSelfHealing } }) => {

    // Step 1: From the side menu, click on the "Instruments" tab and verify redirection to the instruments page
    await pomSelfHealing.instrumentsPage.clickInstrumentsTabFromSideMenu();

    // Step 2: Observe the content of the page - verify title, subtitle, table, status filter, search field, paging, create button and table columns
    await pomSelfHealing.instrumentsPage.verifyInstrumentsPageContent();
  });
});