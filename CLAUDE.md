# BB-Automation — Claude Context Guide

## What this project is

AI-powered Playwright TypeScript QA framework for the BznsBuilder chemistry synthesis web app.  
Pipeline: **BRD → User Stories → Test Cases → Playwright specs**, backed by 20 Claude Code skills.  
App under test: `https://stgapp.bznsbuilder.com/` (override with `BASE_URL`).

---

## Commands

```bash
npm test                              # Run all tests
npm run test:module MODULE=<Name>     # Run one module (e.g. MODULE=Login)
npm run test:area                     # Run tests by changed source area
npm run report                        # Open last HTML report
npm run lint                          # TypeScript type-check (no emit)
npm run auth:reset                    # Clear stored auth artefacts
npm run sync                          # Sync issues from Jira
npm run locators:extract              # Extract locators from existing specs
npm run codegen                       # Launch Playwright codegen
npm run install:browsers              # Install Playwright browsers + deps
```

---

## Architecture: 4-Layer Pattern

Every feature follows this strict layering — never skip or collapse layers:

| Layer | Path | Rule |
| --- | --- | --- |
| **Locators** | `src/locators/<page>-page-locators.ts` | Pure selector data — no logic, no imports |
| **Page Object** | `src/pages/<page>-page-self-healing.ts` | Actions + assertions, extends `SelfHealingPageBase` |
| **POM** | `src/pages/pom-lazy-self-healing.ts` | Lazy-init manager — register every new page here |
| **Specs** | `tests/generated/<Module>/tc-*.spec.ts` | Tests only — no selectors, no raw Playwright calls |

### Self-Healing Locator (3 phases, automatic)

1. **Primary** — CSS/XPath from the locator file
2. **Semantic** — Playwright role/label/placeholder strategies
3. **AI** — Playwright MCP browser inspection (Claude or Gemini) — requires an API key in `.env`

---

## Fixture Pattern (mandatory for all specs)

```typescript
import { test, expect } from '../../fixtures/self-healing-fixture';
import loginData from '../../../test-data/login.json';

test('TC-BB-001: Sign in with valid credentials @login @P1 @smoke',
    async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();
        await pomSelfHealing.loginPage.fillAndSubmitSignInForm(
            loginData.validUser.email,
            loginData.validUser.password,
        );
        await pomSelfHealing.homePage.assertPageLoaded();
    },
);
```

- Always import from `tests/fixtures/self-healing-fixture`, never from `@playwright/test` directly.
- Always read credentials from `test-data/login.json` — never hardcode them in specs.
- `test.step()` belongs inside page-object methods, not in specs.

---

## Skills

Invoke with `/<skill-name>`. Full pipeline diagrams: `docs/skills-index.md`.

### End-to-end pipelines

| Skill | Use when |
| --- | --- |
| `/brd-full-pipeline` | BRD → US → TC → Playwright → commit |
| `/jira-full-pipeline` | Same + push US + TC to Jira |
| `/taf-full-pipeline` | Migrate raw specs to self-healing POM |

### Generation

| Skill | Use when |
| --- | --- |
| `/brd-to-uss` | BRD text → User Stories |
| `/uss-to-tcs` | User Stories → manual Test Cases |
| `/tcs-to-plscript` | Local TC markdown → Playwright specs |
| `/jira-uss-to-tcs` | Fetch US from Jira → generate TCs → push back |
| `/jira-tcs-to-plscript` | Fetch TCs from Jira → generate specs |

### Page object / locators

| Skill | Use when |
| --- | --- |
| `/create-page-locators` | Extract selectors from tests → build locator files |
| `/create-selfhealing-page` | Locator files → page object classes |
| `/add-method-to-page` | Add one action/assertion to an existing page object |
| `/register-page-in-pom` | Wire a new page object into `pom-lazy-self-healing.ts` |
| `/migrate-test-to-selfhealing` | Convert raw specs to self-healing fixture pattern |

### Maintenance & debugging

| Skill | Use when |
| --- | --- |
| `/add-teststep-hooks` | Wrap all page-object methods with `test.step()` labels |
| `/polish-generated-code` | Post-pipeline cleanup (escapes, grouping, imports) |
| `/merge-tc-sets` | Merge + deduplicate two TC sets |
| `/execute-and-fix-tests` | Run → inspect failures via MCP browser → fix → re-run |
| `/analyze-trace` | Parse `trace.zip`, classify failure, apply fix |
| `/tcs-to-jira` | Push local TCs to Jira as Epic + Task issues |
| `/patch-jira-tc-labels` | Update TC issue labels in Jira |

---

## Conventions

- **Spec file name**: `tc-<Key>-<kebab-description>.spec.ts` — key is a Jira ID (`BB-3871`) or sequential BB ID (`BB-001`).
- **Test title**: `TC-<Key>: <Title> @tags` — matches the file key exactly.
- **Module folders**: PascalCase-with-hyphens (`Library-Management/`, `Audit-Trail/`).
- **After creating a page object**: run `/register-page-in-pom` before writing any specs.
- **Never commit**: `.env`, `playwright-auth.json`, `session-storage.json`, `.playwright-profile/`.
- **Modules registry**: `config/testCaseFilter.ts` — add new modules and their Jira TC keys here.

---

## Environment Variables

Key non-obvious vars (see `.env.example` for the full list):

| Variable | Note |
| --- | --- |
| `ANTHROPIC_API_KEY` | Enables Phase 3 AI healing via Claude (takes priority over Gemini) |
| `ANTHROPIC_MODEL` | Override model (default: `claude-sonnet-4-6`) |
| `GEMINI_API_KEY` | Enables Phase 3 AI healing via Gemini (used if no Anthropic key) |
| `GEMINI_MODEL` | Override model (default: `gemini-2.0-flash`) |
| `APP_IN_OPERATION` | `true` = enable live MCP browser snapshots during generation |

---

## Authentication

No global pre-auth step. Every test navigates to the app and signs in via the Login page using credentials from `test-data/login.json`. The fixture starts a fresh browser context — it does not inject stored session state.

Run `npm run auth:reset` to clear any leftover auth artefacts between runs.
