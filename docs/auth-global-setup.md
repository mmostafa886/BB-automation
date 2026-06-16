# Authentication: Global Setup with Persistent Browser Profile

**Date:** 2026-03-01
**Branch:** `merge-trial`
**Last updated:** 2026-03-01 — switched to `launchPersistentContext` (see [Fix: Private Session Issue](#fix-private-session-issue))

---

## Summary

This document describes the implementation of a `globalSetup`-based authentication strategy for the Playwright test suite. The app requires a multi-step login flow (OTP verification + Azure account selection) before any test can run. This setup ensures every test starts with a valid, authenticated session — without repeating the login steps per test.

---

## Problem

The application at `https://az-chem-synth.vercel.app/` enforces a two-step authentication flow:

1. **OTP verification** — a one-time password must be entered after credentials
2. **Azure account selection** — the user must pick their Azure / Microsoft account

This makes fully automated per-test login impractical. The session must be captured once and reused across the entire suite.

---

## Solution: `globalSetup` + Persistent Browser Profile

Playwright's `globalSetup` hook runs **once before any test file is executed**. The setup:

1. Opens a **persistent browser profile** (`.playwright-profile/`) using `launchPersistentContext`
2. Navigates to `BASE_URL` and waits up to 8 seconds to check if the app loads without a login redirect
3. If already logged in → saves a `storageState` snapshot and exits (fast path)
4. If redirected to Microsoft login → waits up to 10 minutes for the user to complete OTP + Azure account selection, then saves state

Every test then loads `playwright-auth.json` via `storageState` and starts already authenticated.

---

## Fix: Private Session Issue

### What went wrong with the first approach

The original implementation used `chromium.launch()` + `browser.newContext()`. This creates an **isolated, incognito-like context** with no browser profile on disk. This caused two problems:

- **Microsoft treats it as an untrusted device** — no persistent profile means no device-trust signals, making Azure AD stricter about allowing the session.
- **MSAL tokens stored in `sessionStorage` are lost** — Playwright's `storageState()` captures cookies and `localStorage` only; `sessionStorage` is not included. Microsoft MSAL (used for Azure AD) defaults to `sessionStorage`, so tokens were silently dropped after the context was closed.

### The fix: `launchPersistentContext`

Replacing `chromium.launch()` with `chromium.launchPersistentContext(USER_DATA_DIR)` writes a **real Chrome profile** to `.playwright-profile/`. This directory persists everything the browser stores — cookies, `localStorage`, `sessionStorage`, and IndexedDB — exactly like a normal browser installation. Microsoft's "Stay signed in" and device-trust features work correctly with this profile.

```text
Before  chromium.launch()              → fresh incognito context, session lost
After   chromium.launchPersistentContext('.playwright-profile/')  → real profile, session persists
```

---

## Files Changed

| File | Change |
| --- | --- |
| `src/scripts/global-setup.ts` | **Created then updated** — switched from `chromium.launch()` to `launchPersistentContext`; session detection via URL redirect check instead of cookie timestamps |
| `playwright.config.ts` | Added `globalSetup: './src/scripts/global-setup'`; simplified `storageState` to always point to `AUTH_FILE` |
| `tsconfig.json` | `src/**/*.ts` glob already covers `src/scripts/` — no separate entry needed |
| `.gitignore` | Added `.playwright-profile/` — the profile directory must not be committed |

---

## File: `src/scripts/global-setup.ts`

### How session detection works

Rather than parsing cookie expiry timestamps (which doesn't catch MSAL token loss), the setup now performs a **live navigation check**:

1. Opens the persistent profile and navigates to `BASE_URL`
2. Waits 8 seconds for the URL to stay on the app domain
3. If it stays → session is valid (no redirect to Microsoft login)
4. If it redirects → session has expired, login is required

### Flow diagram

```text
npm test
    │
    ▼
globalSetup runs
    │
    ├─ Open .playwright-profile/ in headed Chrome
    │
    ├─ Navigate to BASE_URL
    │
    ├─ URL stays on app within 8s?
    │       │
    │     YES ──→ Save storageState snapshot → close → TESTS START
    │       │
    │      NO ──→ Show login prompt
    │              │
    │              ▼
    │          User completes:
    │            1. Credentials
    │            2. OTP
    │            3. Azure account selection
    │              │
    │              ▼
    │          Redirect back to app detected
    │              │
    │              ▼
    │          Save storageState + close → TESTS START
    │
    ▼
All tests run with playwright-auth.json loaded as storageState
```

---

## File: `playwright.config.ts`

### Before (original)

```ts
import * as fs from 'fs';
const AUTH_FILE = 'playwright-auth.json';

export default defineConfig({
  // no globalSetup
  use: {
    storageState: fs.existsSync(AUTH_FILE) ? AUTH_FILE : undefined,
  },
});
```

### After (current)

```ts
const AUTH_FILE = 'playwright-auth.json';

export default defineConfig({
  globalSetup: './src/scripts/global-setup',
  use: {
    storageState: AUTH_FILE,  // globalSetup guarantees the file exists and is valid
  },
});
```

---

## How to Use

### Normal test run

```bash
npm test
```

The terminal will show one of two paths:

**Session valid (fast path):**

```text
[Auth] Opening persistent browser profile…
[Auth] Persistent session is valid — skipping login.
[Auth] storageState snapshot saved to playwright-auth.json
```

**Session expired or missing (re-auth):**

```text
[Auth] Opening persistent browser profile…
[Auth] ──────────────────────────────────────────────────
[Auth] Login required. Complete the following steps in the
[Auth] browser window that just opened:
[Auth]
[Auth]   1. Enter your credentials
[Auth]   2. Complete the OTP verification
[Auth]   3. Select your Azure account
[Auth]
[Auth] The browser will close automatically once you land
[Auth] on the app. You have 10 minutes.
[Auth] ──────────────────────────────────────────────────
```

After login completes, the browser closes and tests begin immediately.

### Force a session refresh manually

```bash
npm run auth:reset
```

Deletes `playwright-auth.json`, `session-storage.json`, and `.playwright-profile/` so the next `npm test` starts a fresh login. Use this if you need to switch Azure accounts or clear the session outside of a test run.

---

## Artifacts

| Artifact | Location | Purpose | In `.gitignore`? |
| --- | --- | --- | --- |
| `playwright-auth.json` | project root | `storageState` snapshot loaded by tests | Yes |
| `.playwright-profile/` | project root | Persistent browser profile (MSAL tokens, device trust) | Yes |

Both files contain live session data and must never be committed to source control.

---

## Environment Variables

| Variable | Default | Description |
| --- | --- | --- |
| `BASE_URL` | `https://az-chem-synth.vercel.app/` | App URL used for navigation and redirect detection |

Set in a `.env` file at the project root to override.

---

## Notes

- The 10-minute login timeout covers the full OTP + Azure account selection flow. Increase the `timeout` value in `src/scripts/global-setup.ts` if needed.
- Session lifetime depends on the Azure AD / Vercel tenant configuration. Typical Microsoft sessions last 1–14 days in a persistent profile.
- Tests that explicitly verify the **unauthenticated** state (e.g., TC-4950 unauthorized access) create their own context via `browser.newContext({ storageState: 'empty' })` — they are unaffected by this setup.
- If a test run is interrupted mid-login (e.g., Ctrl+C), the `.playwright-profile/` directory may be in a partial state. Delete it and run `npm test` again to start fresh.
