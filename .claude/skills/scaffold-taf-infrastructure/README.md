# scaffold-taf-infrastructure

> **One-shot bootstrap** that detects whether the current branch (JS or TS) is missing the
> Self-Healing TAF layers and adds them in-place in TypeScript — on the same branch,
> without switching or creating a new one. All pre-existing non-TAF files are left untouched.
> **Automatically continues** the full pipeline after completion.

---

## What this skill does

Runs through ~23 ordered steps to produce:

| Layer | Files Created |
| ----- | ------------- |
| TypeScript config | `tsconfig.json`, `playwright.config.ts` |
| Utilities | `Logger.ts`, `self-healing-locator.ts`, `playwright-mcp-provider.ts`, `advanced-actions-helper.ts`, `advanced-assertions-helper.ts`, `advanced-api-helper.ts`, `download-helper.ts`, `step-runner.ts`, `urls.ts` |
| Factory | `src/factories/helper-factory.ts` |
| POM base | `src/pages/self-healing-page-base.ts`, `src/pages/pom-lazy-self-healing.ts` (stub) |
| Fixtures | `tests/fixtures/self-healing-fixture.ts`, `tests/fixtures/api-test-fixture.ts` |
| Auth | `src/scripts/global-setup.ts` |
| Environment | `.env.example` |
| Directories | `src/locators/`, `src/pages/`, `src/factories/`, `src/scripts/`, `tests/fixtures/`, `docs/` |

After running this skill the project compiles with `npx tsc --noEmit` and tests are
discoverable via `npx playwright test --list`. All pre-existing non-TAF files are untouched.

---

## When to use

Run **once** on any branch that is missing the TAF layers, before adding any page objects.
Invoking this skill starts the **full automated pipeline** — all remaining skills run
automatically in sequence without further input.

```text
scaffold-taf-infrastructure   ← invoke this (auto-chains all below)
        ↓  auto-continues
create-page-locators          (scans ALL tests, creates locators for every page)
        ↓  auto-continues
create-selfhealing-page       (processes ALL pages)
        ↓  auto-continues
register-page-in-pom          (registers ALL pages, auto-discovered)
        ↓  auto-continues
migrate-test-to-selfhealing   (migrates ALL tests + verifies result)
```

---

## How to invoke

```text
/scaffold-taf-infrastructure
```

No input variables required. The skill reads `package.json` and the existing Playwright
config automatically to extract project-specific values (e.g. `baseURL`).

---

## Prerequisites

- Node.js ≥ 18
- Any Playwright project (JS or TS) with at least `package.json` and a test directory

A `.env` file should exist (or be created from `.env.example`) with:

```env
BASE_URL=https://your-app-url/
APP_USERNAME=your-user
APP_PASSWORD=your-password

# Optional — activates Phase 3 AI healing
ANTHROPIC_API_KEY=sk-ant-...
# or
GEMINI_API_KEY=AIza...
```

---

## Post-scaffold checklist

- [ ] `npx tsc --noEmit` exits with 0 errors
- [ ] `playwright.config.ts` `baseURL` matches the target application
- [ ] `src/scripts/global-setup.ts` login steps are filled in for your auth flow (**required before running tests**)
- [ ] `src/utils/urls.ts` contains all application routes
- [ ] `.env` file exists (copy `.env.example` → `.env` and fill in values)
- [ ] Old `playwright.config.js.bak` can be deleted once verified

> **Important:** `src/scripts/global-setup.ts` contains `// TODO` placeholders for the login
> steps. These must be replaced with your application's actual authentication flow before
> the test suite can run. Without this, `playwright-auth.json` will not be created and
> tests will fail at startup.

---

## Architecture notes

### Three-phase self-healing

Every `SelfHealingLocator` tries selectors in order:

1. **Phase 1** — primary CSS/XPath selector (fastest, zero overhead when it works)
2. **Phase 2** — semantic Playwright strategies derived from `ElementMetadata` (`getByRole`, `getByLabel`, `getByPlaceholder`, `getByText`, `getByTestId`)
3. **Phase 3** — AI healing via `@playwright/mcp` (opt-in via `ANTHROPIC_API_KEY` / `GEMINI_API_KEY`)

### Step tracking — no test.step() in tests

Every action and assertion is automatically wrapped as a named Playwright step by
`StepRunner.step()` inside `AdvancedActionsHelper` and `AdvancedAssertionsHelper`.
This means test files never need `test.step()` calls — steps appear in the HTML report
automatically via the page object methods.

### Logger isolation

Each page object and helper gets its own named Winston logger writing to
`test-logs/<name>.log`. Log level is controlled by the `LOG_LEVEL` env var (default: `info`).

### Auth state

`src/scripts/global-setup.ts` runs once before the test suite, saves browser storage state to
`playwright-auth.json`, and saves sessionStorage to `session-storage.json` (needed for
MSAL/token-based SSO). The fixture injects sessionStorage tokens on every test page load
via `page.addInitScript()`.

### AI Provider Configuration

| Provider | Env var | Model override |
| -------- | ------- | -------------- |
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | `ANTHROPIC_MODEL` |
| Gemini (Google) | `GEMINI_API_KEY` | `GEMINI_MODEL` |

If neither key is set, the framework falls back to Phase 1+2 healing only.

### scripts/ → src/scripts/

The global-setup script lives under `src/scripts/` (not a top-level `scripts/` folder)
for better project organisation. `playwright.config.ts` references it as
`'./src/scripts/global-setup'`.

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [create-page-locators](../create-page-locators/README.md) | Scan all tests and create locator definitions |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Build self-healing page objects for all pages |
| [register-page-in-pom](../register-page-in-pom/README.md) | Wire all pages into the POM manager |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Migrate all test specs and verify result |
