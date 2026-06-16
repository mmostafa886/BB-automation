# AZ-Automation — Claude Context Guide

## Project Overview

AI-powered **Playwright TypeScript QA automation framework** for a chemistry synthesis web application. The framework automates the full QA lifecycle:

- **BRD → User Stories → Test Cases → Playwright scripts** (via Claude Code skills)
- **Azure DevOps integration** — reads/writes work items, test plans, test suites
- **Self-healing locators** — 3-phase fallback (primary CSS/XPath → semantic Playwright strategies → AI via MCP)
- **22 Claude Code skills** orchestrating every stage of the automation lifecycle

App under test: configured via `BASE_URL` env var (see `playwright.config.ts` for default).  
Auth: Microsoft Azure AD (MFA) — auth state persisted in `playwright-auth.json`.

---

## Key Commands

```bash
npm test                              # Run all tests
npm run test:area                     # Run tests by app area
npm run test:module MODULE=<Name>     # Run a specific module (e.g. MODULE=Instruments)
npm run modules:list                  # List all registered test modules
npm run sync                          # Sync test plans from Azure DevOps
npm run auth:reset                    # Clear auth state (re-authenticate on next test run)
npm run report                        # Open last HTML report
npm run locators:extract              # Extract locators from existing specs
```

---

## Folder Structure

```
AZ-Automation/
├── .claude/
│   └── skills/                  # 22 Claude Code skills (see Skills section)
├── brd/                         # Raw BRD input documents
├── config/
│   ├── testCaseFilter.js        # Modules + TC IDs registered for PLScript generation
│   └── testMapping.js           # Code area → test tag mapping
├── docs/                        # Project documentation
├── pipelines/                   # CI/CD pipeline definitions
├── src/
│   ├── factories/
│   │   └── helper-factory.ts    # Factory for creating helper instances
│   ├── generators/              # AI-driven test generators (JS)
│   ├── locators/                # Locator repositories (pure data, no logic)
│   │   └── <page>-page-locators.ts
│   ├── pages/                   # Page object classes (self-healing pattern)
│   │   ├── <page>-page-self-healing.ts
│   │   ├── self-healing-page-base.ts   # Abstract base all pages extend
│   │   └── pom-lazy-self-healing.ts    # Page Object Manager (lazy init)
│   ├── scripts/
│   │   ├── global-setup.ts      # Auth setup — runs before test suite
│   │   ├── list-modules.js      # CLI: list modules
│   │   ├── manual-sync.js       # CLI: sync ADO test plans
│   │   └── run-tests-for-area.js
│   └── utils/
│       ├── advanced-actions-helper.ts      # Wraps page actions (goto, click, fill…)
│       ├── advanced-assertions-helper.ts   # Wraps expect assertions
│       ├── advanced-api-helper.ts          # Wraps APIRequestContext methods
│       ├── download-helper.ts              # File download handling
│       ├── Logger.ts                       # Winston logger factory
│       ├── self-healing-locator.ts         # Core 3-phase healing locator
│       ├── step-runner.ts                  # Wraps code in test.step()
│       └── urls.ts                         # Centralised APP_URLS constants
├── stories/                     # Generated User Stories (markdown)
├── stories_Archieved/           # Archived User Stories
├── test_cases/                  # Generated Test Cases (markdown)
├── test_cases_Archieved/        # Archived Test Cases
├── tests/
│   ├── fixtures/
│   │   ├── self-healing-fixture.ts   # Main fixture — all specs use this
│   │   └── api-test-fixture.ts       # Fixture for pure API tests
│   └── generated/               # Generated spec files (organised by module)
│       ├── Audit-Trail/
│       ├── Instruments/
│       ├── Library-Management/
│       ├── Plate-Layouts/
│       ├── Products/
│       ├── Projects/
│       ├── Reagents/
│       ├── Reaction-Templates/
│       └── ...
├── playwright.config.ts
├── tsconfig.json
├── package.json
└── .env                         # Secrets (gitignored — see .env.example)
```

---

## Architecture: 4-Layer Pattern

Every feature follows this strict layering:

| Layer | Location | Responsibility |
|---|---|---|
| **Locators** | `src/locators/<page>-page-locators.ts` | Pure selector data, no logic |
| **Page Object** | `src/pages/<page>-page-self-healing.ts` | Actions + assertions, extends `SelfHealingPageBase` |
| **POM** | `src/pages/pom-lazy-self-healing.ts` | Lazy-initialised manager — all pages registered here |
| **Specs** | `tests/generated/<Module>/tc-*.spec.ts` | Test cases, use `self-healing-fixture` |

### Self-Healing Locator (3-Phase)

1. **Primary** — CSS/XPath selector from locator file
2. **Semantic** — Playwright role/label/placeholder strategies
3. **AI** — Playwright MCP browser inspection (Anthropic or Gemini)

### Test Fixture Import

All specs must import from the self-healing fixture:

```typescript
import { test, expect } from '../../fixtures/self-healing-fixture';
```

Access pages via `pomSelfHealing`:

```typescript
test('example', async ({ pomSelfHealing }) => {
  await pomSelfHealing.loginPage.login();
  await pomSelfHealing.homePage.assertPageLoaded();
});
```

---

## Registered Modules (config/testCaseFilter.js)

These 12 modules have TC IDs registered for PLScript generation:

| Module | Folder in tests/generated/ |
|---|---|
| Login | `Login/` |
| Navigation-Menu | `Navigation-Menu/` |
| Library-Management | `Library-Management/` |
| Reaction-Templates | `Reaction-Templates/` |
| Plate-Layouts | `Plate-Layouts/` |
| Products | `Products/` |
| Reagents | `Reagents/` |
| Projects | `Projects/` |
| Users | `Users/` |
| Audit-Trail | `Audit-Trail/` |
| Instruments | `Instruments/` |
| Sign-Out | `Sign-Out/` |

To add a new module: add it to `config/testCaseFilter.js` with its TC IDs.

---

## Claude Code Skills

Invoke any skill with `/skill-name` in the Claude chat. Skills are located in `.claude/skills/`.

### Pipeline Skills (end-to-end)

| Skill | When to use |
|---|---|
| `/brd-full-pipeline` | Full BRD → US → TC → Playwright → commit in one command |
| `/ado-full-pipeline` | Same as above but US + TC are pushed to Azure DevOps |
| `/taf-full-pipeline` | Full TAF migration: scaffold → create → migrate → polish |

### Artifact Generation Skills

| Skill | When to use |
|---|---|
| `/brd-to-uss` | Convert BRD text to User Stories (local save + optional ADO push) |
| `/uss-to-tcs` | Transform User Stories to structured manual Test Cases |
| `/tcs-to-plscript` | Convert local TC markdown files to Playwright scripts |
| `/ado-uss-to-tcs` | Fetch User Stories from ADO, generate TCs, push back to ADO |
| `/ado-tcs-to-plscript` | Fetch TCs from ADO, generate Playwright scripts (uses testCaseFilter.js) |

### Page Object / Locator Skills

| Skill | When to use |
|---|---|
| `/create-page-locators` | Extract selectors from tests, build `src/locators/<page>-page-locators.ts` |
| `/create-selfhealing-page` | Generate `src/pages/<page>-page-self-healing.ts` from locator files |
| `/register-page-in-pom` | Auto-register new page objects into `pom-lazy-self-healing.ts` |
| `/migrate-test-to-selfhealing` | Convert raw Playwright specs to self-healing fixture pattern |

### Maintenance & Refactoring Skills

| Skill | When to use |
|---|---|
| `/polish-generated-code` | Post-pipeline cleanup (escape fixes, method grouping) |
| `/move-specs-to-module` | Move spec files between modules, port methods/locators |
| `/rename-and-merge-module` | Rename a module across all 40+ spec files |
| `/merge-tc-sets` | Merge two TC sets, deduplicate, run gap analysis |
| `/subtract-archived-tcs` | Remove redundant TCs already covered in archived set |

### Debugging Skills

| Skill | When to use |
|---|---|
| `/execute-and-fix-tests` | Run tests, live-inspect failures via MCP browser, apply fixes, re-run |
| `/analyze-trace` | Parse Playwright `trace.zip`, classify failure, apply targeted fix |

### Setup Skills

| Skill | When to use |
|---|---|
| `/scaffold-taf-infrastructure` | Create TAF structure from scratch on a new branch |
| `/setup-workspace` | Initialize folder structure (stories/, test_cases/, src/pages/, tests/) |
| `/tcs-to-ado` | Push locally-saved TCs to ADO Test Plan + Suite + work items |

---

## Environment Variables (.env)

Copy `.env.example` to `.env` and fill in values.

| Variable | Purpose |
|---|---|
| `ENV` | Environment selector: `test` or `staging` |
| `BASE_URL` | Override app URL (defaults set in `playwright.config.ts`) |
| `LOG_LEVEL` | Winston verbosity: `silly/debug/verbose/info/warn/error` |
| `OPENAI_API_KEY` | OpenAI key for AI generation/healing |
| `ANTHROPIC_API_KEY` | Anthropic key (alternative AI provider) |
| `GEMINI_API_KEY` | Gemini key (alternative AI provider) |
| `AZURE_DEVOPS_ORG_URL` | ADO org URL |
| `AZURE_PERSONAL_ACCESS_TOKEN` | ADO PAT for work item read/write |
| `AZURE_PROJECT_NAME` | ADO project name |
| `APP_IN_OPERATION` | `true` = enable live MCP browser snapshots during generation |

---

## Key Configuration Files

### playwright.config.ts

- `testDir`: `./tests` (all spec files)
- `globalSetup`: `./src/scripts/global-setup` (handles MFA auth)
- `storageState`: `playwright-auth.json` (injected into every test)
- `retries`: 2 (both CI and local)
- `workers`: 1 (CI), 2 (local)
- `timeout`: 120 000 ms per test
- Active project: `chromium` only (Firefox/WebKit commented out)

### config/testCaseFilter.js

Defines which TC IDs belong to each module. Used by `/ado-tcs-to-plscript` to know what to fetch and generate. Edit here to add/remove TCs from automation scope.

### config/testMapping.js

Maps source code areas to test tags. Used by `npm run test:area` to select relevant tests when source files change.

---

## Conventions & Rules

- **Spec naming**: `tc-<ADO-ID>-<kebab-case-description>.spec.ts`
- **Module folders**: PascalCase (e.g. `Library-Management/`, `Audit-Trail/`)
- **Locator files**: pure selector data — no conditional logic, no page actions
- **Page object files**: extend `SelfHealingPageBase`, import locators from `src/locators/`
- **After creating a page object**: always run `/register-page-in-pom` or manually add it to `pom-lazy-self-healing.ts`
- **Generated specs** (`tests/generated/`): created by skills, but can be manually edited to fix spec logic
- **Never commit**: `.env`, `playwright-auth.json`, `session-storage.json`, `.playwright-profile/`
- **AI provider selection**: set exactly one of `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, or `GEMINI_API_KEY` in `.env`

---

## Authentication

The app uses **Microsoft Azure AD MFA**. Auth is handled once before the suite runs:

1. `global-setup.ts` launches a browser, logs in, saves cookies to `playwright-auth.json`
2. `self-healing-fixture.ts` injects `playwright-auth.json` + MSAL session storage into every test
3. If auth expires or breaks: run `npm run auth:reset` then `npm test` to re-authenticate

`playwright-auth.json` is gitignored — each developer maintains their own local auth state.

---

## Known Issues in Generated Tests

These are pre-existing issues in `tests/generated/` — do not flag as new bugs:

- **`csv-parser`** — missing package causes test listing failure in `tc-5097` tests
- **Non-existent matchers** — some specs use `toHaveCountGreaterThan`, `toHaveCountLessThan`, `toHaveDownloaded` which do not exist in Playwright
- **Invalid locator filter** — some specs use `.filter({name: ...})` which is not a valid Locator option

These can be fixed manually in the spec files or by running `/execute-and-fix-tests`.
