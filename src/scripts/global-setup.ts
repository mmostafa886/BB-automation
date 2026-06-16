/**
 * global-setup.ts
 *
 * Runs once before the entire test suite (configured via `globalSetup` in
 * playwright.config.ts).
 *
 * Why launchPersistentContext instead of chromium.launch():
 *   - chromium.launch() creates an isolated (incognito-like) session.
 *     Microsoft Azure AD / MSAL stores auth tokens in sessionStorage,
 *     which Playwright's storageState() does NOT capture — causing tests
 *     to appear unauthenticated even after a successful login.
 *   - launchPersistentContext writes a real Chrome profile to disk
 *     (.playwright-profile/). This persists cookies, localStorage,
 *     sessionStorage, and IndexedDB across runs, exactly like a normal
 *     browser. Microsoft's "Stay signed in" and device-trust features
 *     also work correctly with this profile.
 *
 * Why session-storage.json:
 *   - Playwright's storageState() only captures cookies + localStorage.
 *   - MSAL tokens in sessionStorage are captured separately via page.evaluate()
 *     and saved to session-storage.json.
 *   - The self-healing fixture reads this file and injects the data via
 *     page.addInitScript() so every test starts with a full auth state.
 *
 * Login flow (3 steps):
 *   1. Enter credentials
 *   2. Complete OTP verification
 *   3. Select Azure account
 *   + Email approval (post-redirect, inside the app) — browser stays open
 *     until you press Enter in this terminal to confirm everything is done.
 *
 * Environment variables (optional, set in .env):
 *   BASE_URL – the app URL (default: https://az-chem-synth.vercel.app/)
 */

import { chromium, type FullConfig, type Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const AUTH_FILE            = path.resolve('playwright-auth.json');
const SESSION_STORAGE_FILE = path.resolve('session-storage.json');
const USER_DATA_DIR        = path.resolve('.playwright-profile');
const BASE_URL = process.env.BASE_URL || 'https://az-chem-synth.vercel.app/';

// ---------------------------------------------------------------------------
// Wait for the user to press Enter in the terminal
// ---------------------------------------------------------------------------

function waitForEnterKey(): Promise<void> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('', () => {
      rl.close();
      resolve();
    });
  });
}

// ---------------------------------------------------------------------------
// Capture sessionStorage from the current page (MSAL tokens live here)
// ---------------------------------------------------------------------------

async function captureSessionStorage(page: Page): Promise<Record<string, string>> {
  return page.evaluate<Record<string, string>>(() => {
    const data: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key !== null) {
        const value = sessionStorage.getItem(key);
        if (value !== null) data[key] = value;
      }
    }
    return data;
  });
}

// ---------------------------------------------------------------------------
// Save both storageState (cookies + localStorage) and sessionStorage
// ---------------------------------------------------------------------------

async function saveAuthSnapshots(page: Page): Promise<void> {
  // Wait until the page is fully settled before reading sessionStorage.
  // networkidle waits until there are no pending network requests for 500ms,
  // which covers both OAuth callbacks and MSAL's async token writes.
  // If networkidle times out (e.g. app uses long-polling), fall back to 'load'.
  try {
    await page.waitForLoadState('networkidle', { timeout: 15_000 });
  } catch {
    await page.waitForLoadState('load');
  }

  await page.context().storageState({ path: AUTH_FILE });

  const sessionData = await captureSessionStorage(page);
  fs.writeFileSync(SESSION_STORAGE_FILE, JSON.stringify(sessionData, null, 2));

  console.log('[Auth] Snapshots saved:');
  console.log('[Auth]   playwright-auth.json  — cookies + localStorage');
  console.log(`[Auth]   session-storage.json  — ${Object.keys(sessionData).length} sessionStorage key(s) (MSAL tokens)`);
}

// ---------------------------------------------------------------------------
// Global setup entry point
// ---------------------------------------------------------------------------

export default async function globalSetup(_config: FullConfig): Promise<void> {
  // Fast-path: if both auth snapshots already exist on disk, skip the browser
  // navigation entirely. This avoids a 30-second timeout when the app URL is
  // unreachable from the current network (e.g. VPN not connected).
  if (fs.existsSync(AUTH_FILE) && fs.existsSync(SESSION_STORAGE_FILE)) {
    console.log('[Auth] Auth snapshots found on disk — skipping navigation.');
    console.log('[Auth]   playwright-auth.json  ✓');
    console.log('[Auth]   session-storage.json  ✓');
    console.log('[Auth] Tests will run with the existing saved session.\n');
    return;
  }

  // launchPersistentContext writes a real browser profile to USER_DATA_DIR.
  // On the first run the directory is created fresh.
  // On subsequent runs the existing profile is reused — no login needed
  // as long as the Microsoft session is still alive inside that profile.
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
  });

  const page = await context.newPage();

  console.log('\n[Auth] Opening persistent browser profile…');
  await page.goto(BASE_URL);

  // Quick check: if the app loads within 8 seconds without being redirected
  // to the Microsoft login page, the stored session is still valid.
  const alreadyLoggedIn = await page
    .waitForURL((url) => url.href.startsWith(BASE_URL), { timeout: 8_000 })
    .then(() => true)
    .catch(() => false);

  if (alreadyLoggedIn) {
    console.log('[Auth] Persistent session is valid — skipping login.');
    await saveAuthSnapshots(page);
    await context.close();
    console.log('[Auth] Tests will now run with the saved session.\n');
    return;
  }

  // Session expired or first run — walk the user through all login steps.
  console.log('\n[Auth] ──────────────────────────────────────────────────');
  console.log('[Auth] Login required. Complete ALL steps in the browser');
  console.log('[Auth] window that just opened:');
  console.log('[Auth]');
  console.log('[Auth]   1. Enter your credentials');
  console.log('[Auth]   2. Complete the OTP verification');
  console.log('[Auth]   3. Select your Azure account');
  console.log('[Auth]   4. Approve the login from your email');
  console.log('[Auth]');
  console.log('[Auth] The browser will NOT close automatically.');
  console.log('[Auth] Once the main app has fully loaded (all steps done),');
  console.log('[Auth] come back here and press Enter to save the session.');
  console.log('[Auth] ──────────────────────────────────────────────────\n');

  // Wait until the post-auth redirect lands back on the app.
  // This covers steps 1-3 (credentials → OTP → Azure account selection).
  await page.waitForURL(
    (url) => url.href.startsWith(BASE_URL),
    { timeout: 10 * 60 * 1_000 },
  );

  // Step 4 (email approval) happens after the redirect, inside the app.
  // The browser stays open and the user presses Enter when fully done.
  console.log('[Auth] Browser is back on the app.');
  console.log('[Auth] If an email approval step is shown, complete it now.');
  console.log('[Auth] Press Enter here when the main app has fully loaded: ');

  await waitForEnterKey();

  await saveAuthSnapshots(page);
  await context.close();

  console.log('[Auth] Login successful.');
  console.log('[Auth] Persistent profile: .playwright-profile/');
  console.log('[Auth] Tests will now run with the saved session.\n');
}
