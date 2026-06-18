# BB-Automation

AI-assisted **Playwright TypeScript** end-to-end test automation suite for [BznsBuilder](https://app.bznsbuilder.com/) — a business process and workflow management platform.

---

## What this repo does

- Runs **Playwright** browser tests against `https://app.bznsbuilder.com/` (configurable via `BASE_URL`)
- Generates test artefacts from BRDs through a **Claude Code AI pipeline**: BRD → User Stories → Test Cases → Playwright scripts
- Syncs test cases with **Jira** (reads/writes Stories, Tasks, Epics)
- Uses **self-healing locators** with a 3-phase fallback strategy so tests stay green as the UI evolves

---

## Tech stack

| Tool | Purpose |
|---|---|
| [Playwright](https://playwright.dev/) | Browser automation & test runner |
| TypeScript | Language for all tests and page objects |
| Claude Code (Anthropic) | AI pipeline that generates test artefacts |
| Jira REST API | Issue tracking integration |
| Winston | Structured test logging |
| GitHub Actions | CI/CD (`qa-automation.yml`) |

---

## Prerequisites

- Node.js 20+
- Google Chrome (Playwright uses the installed Chrome channel)
- A valid account on `https://app.bznsbuilder.com/`
- `.env` file — copy `.env.example` (or `db.env.example`) and fill in secrets

---

## Quick start

```bash
# Install dependencies + Playwright browsers
npm install
npx playwright install --with-deps

# Copy and fill in environment variables
cp db.env.example .env   # edit .env with your credentials

# Authenticate (runs once — saves auth state to playwright-auth.json)
npm test   # global-setup.ts handles login before the suite begins

# Run all tests
npm test

# Run a specific module
npm run test:module MODULE=Instruments

# Open the last HTML report
npm run report
```

---

## Authentication

The app uses **Microsoft Azure AD MFA**. Auth is handled automatically:

1. `src/scripts/global-setup.ts` launches a browser on first run, prompts for MFA, and saves cookies to `playwright-auth.json`
2. Every subsequent test reuses that saved state — no repeated logins
3. If auth expires: `npm run auth:reset` then `npm test` to re-authenticate

> `playwright-auth.json` is gitignored — each developer maintains their own local auth state.

---

## Key commands

```bash
npm test                              # Run all tests
npm run test:module MODULE=<Name>     # Run a single module (e.g. MODULE=Instruments)
npm run test:area                     # Run tests mapped to a source code area
npm run modules:list                  # List all registered test modules
npm run sync                          # Sync issues from Jira
npm run auth:reset                    # Clear saved auth state
npm run report                        # Open last HTML report in browser
npm run locators:extract              # Extract locators from existing spec files
npm run lint                          # TypeScript type-check (no emit)
```

---

## Folder structure

```
BB-Automation/
├── src/
│   ├── locators/                        # Pure selector data — no logic
│   │   ├── instruments-page-locators.ts
│   │   └── login-page-locators.ts
│   ├── pages/                           # Self-healing page objects
│   │   ├── self-healing-page-base.ts    # Abstract base all pages extend
│   │   ├── pom-lazy-self-healing.ts     # Lazy-initialised page manager
│   │   ├── instruments-page-self-healing.ts
│   │   └── login-page-self-healing.ts
│   ├── utils/                           # Shared helpers
│   │   ├── self-healing-locator.ts      # Core 3-phase healing locator
│   │   ├── advanced-actions-helper.ts
│   │   ├── advanced-assertions-helper.ts
│   │   ├── advanced-api-helper.ts
│   │   ├── download-helper.ts
│   │   ├── db-helper.ts
│   │   ├── step-runner.ts
│   │   ├── Logger.ts
│   │   └── playwright-mcp-provider.ts
│   ├── factories/
│   │   └── helper-factory.ts            # Factory for creating helper instances
│   ├── generators/
│   │   ├── playwrightGenerator.ts       # AI-driven Playwright script generator
│   │   └── mcpSnapshotProvider.ts
│   ├── listeners/
│   │   └── testPlanListener.ts          # Jira listener — polls for issue changes
│   ├── monitors/
│   │   └── gitMonitor.ts
│   ├── orchestrator/
│   │   └── pipelineOrchestrator.ts
│   ├── reporters/
│   │   └── reportGenerator.ts
│   └── scripts/
│       ├── global-setup.ts              # Auth setup — runs before test suite
│       ├── list-modules.ts
│       ├── manual-sync.ts               # CLI: sync Jira issues
│       └── run-tests-for-area.ts
├── tests/
│   ├── fixtures/
│   │   ├── self-healing-fixture.ts      # Main fixture — all specs use this
│   │   └── api-test-fixture.ts
│   └── generated/                       # Spec files organised by module
│       ├── Instruments/
│       └── Login/
├── config/
│   ├── testCaseFilter.ts                # Jira TC keys per module
│   ├── testMapping.ts                   # Source area → test tag mapping
│   └── jira-us-keys.json
├── brd/                                 # BRD input documents
├── playwright.config.ts
├── tsconfig.json
└── package.json
```

---

## Architecture: 4-layer pattern

Every feature follows this strict layering:

```
Locator file  →  Page object  →  POM (lazy init)  →  Spec file
```

| Layer | File location | Responsibility |
|---|---|---|
| Locators | `src/locators/<page>-page-locators.ts` | Selector data only, no logic |
| Page object | `src/pages/<page>-page-self-healing.ts` | Actions + assertions |
| POM | `src/pages/pom-lazy-self-healing.ts` | Lazy-initialised page manager |
| Specs | `tests/generated/<Module>/tc-*.spec.ts` | Test cases |

All specs import from the shared fixture:

```typescript
import { test, expect } from '../../fixtures/self-healing-fixture';

test('example', async ({ pomSelfHealing }) => {
  await pomSelfHealing.loginPage.login();
  await pomSelfHealing.homePage.assertPageLoaded();
});
```

### Self-healing locator — 3-phase fallback

1. **Primary** — CSS / XPath selector from the locator file
2. **Semantic** — Playwright `getByRole`, `getByLabel`, `getByPlaceholder` strategies
3. **AI** — Playwright MCP browser snapshot analysed by Claude / Gemini

---

## Environment variables

| Variable | Purpose |
|---|---|
| `BASE_URL` | Target app URL (default: `https://app.bznsbuilder.com/`) |
| `ENV` | Environment selector: `test` or `staging` |
| `LOG_LEVEL` | Winston verbosity: `silly/debug/verbose/info/warn/error` |
| `ANTHROPIC_API_KEY` | Anthropic API key (Claude — for AI generation & healing) |
| `OPENAI_API_KEY` | OpenAI key (alternative AI provider) |
| `GEMINI_API_KEY` | Gemini key (alternative AI provider) |
| `JIRA_BASE_URL` | Jira Cloud base URL |
| `JIRA_EMAIL` | Jira account email |
| `JIRA_API_TOKEN` | Jira API token (generate at id.atlassian.com) |
| `JIRA_PROJECT_KEY` | Jira project key (e.g. `BB`) |

Set exactly one AI provider key to enable generation and self-healing.

---

## CI/CD

GitHub Actions workflow: `.github/workflows/qa-automation.yml`

The pipeline runs on push/PR, installs dependencies, runs the full Playwright suite headlessly, and uploads the HTML report as a build artifact.

---

## AI generation pipeline (Claude Code)

The framework uses 22 Claude Code skills to automate the full QA lifecycle. Key entry points:

```
/brd-full-pipeline       # BRD → User Stories → Test Cases → Playwright scripts → commit
/execute-and-fix-tests   # Run tests, inspect failures live via MCP browser, apply fixes
/create-page-locators    # Extract selectors from specs → locator files
/create-selfhealing-page # Generate page objects from locator files
```

See `CLAUDE.md` for the full skill reference.
