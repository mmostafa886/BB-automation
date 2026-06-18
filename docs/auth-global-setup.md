# Authentication: Global Setup — ARCHIVED

> **Status: Archived — no longer in use**
>
> The `globalSetup` + persistent browser profile approach was removed.
> Tests now handle authentication directly through the UI login flow.
> See [CLAUDE.md](../CLAUDE.md#authentication) for the current approach.

---

The original document is preserved below for historical reference only.
The code it describes (`src/scripts/global-setup.ts`, `playwright-auth.json`,
`session-storage.json`, `.playwright-profile/`) still exists on disk but
is no longer wired into the test runner.

---

## What changed

| Before | After |
|---|---|
| `globalSetup` ran before every suite, opened a persistent Chrome profile, handled MFA | No `globalSetup` — removed from `playwright.config.ts` |
| `storageState: playwright-auth.json` injected pre-auth cookies into every test | No `storageState` — tests start from a fresh context |
| `self-healing-fixture.ts` injected `session-storage.json` (MSAL tokens) via `addInitScript` | Session storage injection removed from fixture |
| App URL was `https://az-chem-synth.vercel.app/` | `baseURL` is `https://stgapp.bznsbuilder.com/` |

## Why it was removed

The app under test (BznsBuilder) uses a direct email/password sign-in modal —
no MFA, no Azure AD redirect, no OTP step. Pre-auth via `globalSetup` was unnecessary
overhead. Each spec navigates to the app and signs in via the Login page using
credentials from `test-data/login.json`.
