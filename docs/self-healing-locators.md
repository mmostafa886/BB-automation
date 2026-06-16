# Self-Healing Locators

**Playwright Test Automation Framework**
**Last Updated:** 2026-03-01

---

## Table of Contents

1. [The Problem](#the-problem)
2. [How It Works — Three-Phase Healing](#how-it-works--three-phase-healing)
3. [File Structure](#file-structure)
4. [Architecture Overview](#architecture-overview)
5. [Locator Repositories](#locator-repositories)
6. [Defining a Self-Healing Locator](#defining-a-self-healing-locator)
7. [AI Providers](#ai-providers)
8. [Configuration via Environment Variables](#configuration-via-environment-variables)
9. [Integration with Existing Helpers](#integration-with-existing-helpers)
10. [Using Self-Healing in Tests](#using-self-healing-in-tests)
11. [Post-Test Healing Report](#post-test-healing-report)
12. [Adding a New Self-Healing Page](#adding-a-new-self-healing-page)
13. [Implementing a Custom AI Provider](#implementing-a-custom-ai-provider)
14. [Log Output Reference](#log-output-reference)
15. [Troubleshooting](#troubleshooting)

---

## The Problem

Standard Playwright locators are tied to a single CSS or XPath selector. When developers rename a class, restructure a component, or change an attribute, every test that touches the affected element breaks — even though the element is still on the page and functionally unchanged.

The naive fix — maintaining a hand-written list of fallback selectors — only defers the problem. If all listed selectors target attributes that change together (e.g. all use the same class), the list fails as a unit.

**Self-healing locators solve this differently.** Instead of listing more selectors, you describe *what the element is* — its role, its label, its visible text. The framework derives resilient Playwright strategies from that description automatically, and falls back to an AI model when even those strategies fail.

---

## How It Works — Three-Phase Healing

On the **first call**, `SelfHealingLocator.get()` runs through up to three phases. Once a healed locator is found it is **cached** — every subsequent call returns the cached result immediately without re-running any phase.

```text
┌─────────────────────────────────────────────────────────────────────┐
│  Cache check — already healed?                                       │
│  If a prior call already healed this locator, return the cached     │
│  result immediately — zero DOM queries, zero API calls.             │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ no cached result (first call)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 1 — Primary selector                                          │
│  Try the CSS/XPath you wrote.                                        │
│  Element found (attached) → return immediately, no healing needed.  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ FAILS (timeout / element not attached)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 2 — Semantic auto-strategies (derived from ElementMetadata)  │
│  Auto-generated in order from the fields you filled in:             │
│    getByRole(role, { name, exact: true })  →  most stable, ARIA    │
│    getByLabel(label)                        →  <label>-linked input │
│    getByPlaceholder(text)                   →  placeholder attr     │
│    getByText(text, { exact: true })         →  visible text         │
│    getByAltText(text)                       →  <img> alt attr       │
│    getByTestId(id)                          →  data-testid attr     │
│  Each strategy is probed (attached check, 2 s default).             │
│  First match → cache & return.                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ ALL FAIL
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  Phase 3 — AI healing (opt-in, requires env var)                    │
│  Attaches @playwright/mcp server to the live BrowserContext.        │
│  Passes enriched description to the AI:                             │
│      "<description> [role: <role>]"                                 │
│  (Only role is appended — stale content hints are excluded.)        │
│                                                                     │
│  Claude (ANTHROPIC_API_KEY) — up to 3 selector candidates:         │
│    • AI calls browser_snapshot → YAML ARIA tree                     │
│    • Returns 3 candidates ordered most → least stable:              │
│        Candidate 1 — unique stable attr (data-testid / unique id)  │
│        Candidate 2 — role + visible-text from snapshot              │
│        Candidate 3 — text-content or structural fallback            │
│                                                                     │
│  Gemini (GEMINI_API_KEY) — 1 selector candidate:                   │
│    • AI calls browser_snapshot → YAML ARIA tree                     │
│    • Returns the single best selector from the snapshot             │
│                                                                     │
│  Each candidate is probed in order (best-effort):                   │
│    Probe passes → cache & return that locator immediately           │
│    Probe fails  → try next candidate                                │
│  If no probe passes, return a composite OR-locator:                 │
│    locator1.or(locator2)...  (action timeout races all candidates)  │
│  Return null only if AI returns "UNABLE_TO_HEAL" or nothing         │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ AI returns null / not configured
                               ▼
               Return primary selector → Playwright raises
               its natural timeout error with full context
```

**Caching prevents redundant API calls.** When a page method calls `.get()` twice on the same locator (e.g. once to assert visibility, once to click), only the first call runs the healing chain. Subsequent calls return the cached locator instantly — no extra Gemini/Claude requests and no risk of a second Phase 3 call returning nothing and surfacing the broken primary selector.

**Phase 1 is free.** No extra DOM queries when the primary selector works. All healing overhead only pays when it is actually needed.

**Phase 3 derives selectors from snapshot content, not stale metadata.** The framework passes `"<description> [role: <role>]"` to the AI — only the structural `role` is appended as a type filter. Content-based fields (`name`, `text`, `testId`, `label`, `placeholder`) are intentionally excluded because they may be stale. The AI locates the element in the live ARIA snapshot and generates selectors from what it actually observes. CSS classes, data attributes, XPath text content, and structural paths are all valid output formats.

---

## File Structure

```text
src/
├── locators/
│   ├── login-page-locators.ts        ← Locator repository: LoginPage selector data
│   ├── home-page-locators.ts         ← Locator repository: HomePage selector data
│   └── <module>-page-locators.ts     ← One file per module (instruments, reagents, …)
├── utils/
│   ├── self-healing-locator.ts       ← Core class, LocatorDefinition, ElementMetadata
│   ├── self-healing-page-base.ts     ← Abstract base class for self-healing pages
│   └── playwright-mcp-provider.ts    ← PlaywrightMCPHealingProvider + GeminiMCPHealingProvider
├── pages/
│   ├── login-page-self-healing.ts    ← LoginPage behaviour (no inline selectors)
│   ├── home-page-self-healing.ts     ← HomePage behaviour (no inline selectors)
│   ├── <module>-page-self-healing.ts ← One file per module
│   └── pom-lazy-self-healing.ts      ← POM manager (wires pages + AI provider)
tests/
├── fixtures/
│   └── self-healing-fixture.ts       ← Playwright fixture (auto-configures AI)
└── generated/
    └── <Module>/
        └── tc-<id>-<name>.spec.ts    ← Generated test specs (use self-healing-fixture)
```

---

## Architecture Overview

The implementation is split into four distinct concerns — each layer has a single responsibility:

```text
┌──────────────────────────────┐
│   src/locators/*.ts           │  ← WHAT to find
│   LocatorDefinition objects   │    (selector strings + semantic metadata, no Page dep)
└──────────────┬───────────────┘
               │ SelfHealingLocator.from(page, def, logger)
               ▼
┌──────────────────────────────┐
│   SelfHealingLocator          │  ← HOW to find it
│   (3-phase healing logic)     │    (probe → semantic → AI)
└──────────────┬───────────────┘
               │ await locator.get()
               ▼
┌──────────────────────────────┐
│   SelfHealingPageBase         │  ← WHAT to do once found
│   + Page subclasses           │    (actions, assertions, navigation)
│   (auto-healing report)       │    getHealingReport() auto-discovers locators
└──────────────┬───────────────┘
               │ pomSelfHealing.getHealingReport()
               ▼
┌──────────────────────────────┐
│   POMLazySelfHealing          │  ← Wires pages + AI provider
│   self-healing-fixture.ts     │    Logs post-test summary
└──────────────────────────────┘
```

### SelfHealingPageBase

Every self-healing page class extends `SelfHealingPageBase`. The base class provides:

- **`pageName` (auto)** — derived from the class name by stripping the `SelfHealing` suffix.
  `LoginPageSelfHealing` → `"LoginPage"`, `HomePageSelfHealing` → `"HomePage"`.
  Override if you need a different label.

- **`allLocators()` (auto-discovery)** — uses `Object.entries(this)` to find every
  `SelfHealingLocator` instance on the page object at runtime. No manual list to maintain
  and no risk of forgetting a newly added locator.

- **`getHealingReport()` (inherited)** — filters out locators never called during the test
  and formats the result. Returns an empty string when nothing was exercised.

A minimal subclass has **zero boilerplate** beyond its constructor and page methods:

```typescript
export class MyPageSelfHealing extends SelfHealingPageBase {
    readonly myInput  = SelfHealingLocator.from(page, myLocators.myInput,  logger);
    readonly myButton = SelfHealingLocator.from(page, myLocators.myButton, logger);

    async clickButton() {
        await this.actions.click(await this.myButton.get(), 'Click button');
    }
    // getHealingReport() works automatically — nothing else needed
}
```

---

## Locator Repositories

Selector strings and semantic metadata live in dedicated repository files under `src/locators/`.
They contain **pure data only** — no `Page` dependency, no logic, safe to import anywhere.

Page objects read from the repository and instantiate `SelfHealingLocator` objects via
`SelfHealingLocator.from()` — keeping selectors entirely separate from page behaviour.

### LocatorDefinition type

```typescript
// src/utils/self-healing-locator.ts (exported)
export interface LocatorDefinition {
    selector: string;           // Primary CSS or XPath selector
    metadata: ElementMetadata;  // Semantic description for healing
}
```

### Example repository

```typescript
// src/locators/login-page-locators.ts
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const loginLocators = {

    usernameInput: {
        selector: 'input[name="username"]',
        metadata: {
            role:        'textbox',
            label:       'Username',
            placeholder: 'Username',
            description: 'Username text input on the OrangeHRM login form',
        },
    },

    loginButton: {
        selector: 'button[type="submit"]',
        metadata: {
            role:        'button',
            name:        'Login',
            text:        'Login',
            description: 'Login submit button on the OrangeHRM login form',
        },
    },

    // ... more locators

} satisfies Record<string, LocatorDefinition>;
```

The `satisfies` keyword enforces `LocatorDefinition` shape on every entry while preserving
the precise property names for type-safe access (`loginLocators.usernameInput`).

### SelfHealingLocator.from()

The static factory creates a `SelfHealingLocator` from a `LocatorDefinition` in one call:

```typescript
// In the page constructor:
this.usernameInput = SelfHealingLocator.from(page, loginLocators.usernameInput, this.logger, aiProvider);
// equivalent to:
this.usernameInput = new SelfHealingLocator(
    page, loginLocators.usernameInput.selector, loginLocators.usernameInput.metadata, this.logger, aiProvider
);
```

---

## Defining a Self-Healing Locator

### ElementMetadata fields

Fill only the fields that apply to the element. Unused fields are silently skipped when building Phase 2 strategies.

| Field | Type | Used by | Example |
| --- | --- | --- | --- |
| `description` | `string` **required** | Phase 3 AI prompt + healing reports | `"Login submit button on the OrangeHRM login form"` |
| `role` | `AriaRole` | `getByRole()` | `'button'`, `'textbox'`, `'heading'`, `'img'` |
| `name` | `string` | `getByRole(role, { name })` | `'Login'`, `'Dashboard'` |
| `label` | `string` | `getByLabel()` | `'Username'`, `'Password'` |
| `placeholder` | `string` | `getByPlaceholder()` | `'Username'`, `'Password'` |
| `text` | `string` | `getByText(text, { exact: true })` | `'Login'`, `'Invalid credentials'` |
| `altText` | `string` | `getByAltText()` | `'profile picture'` |
| `testId` | `string` | `getByTestId()` | `'login-btn'` |

### SelfHealingLocator.wasUsed()

Returns `true` when `.get()` was called at least once during the test. Used internally by
`getHealingReport()` to skip locators that were never exercised.

```typescript
if (locator.wasUsed()) {
    // only reachable when get() was called
}
```

---

## AI Providers

Both providers are in [src/utils/playwright-mcp-provider.ts](../src/utils/playwright-mcp-provider.ts).
They share the same `@playwright/mcp` setup — the only difference is the AI API used in the agentic loop.

| Provider | Trigger env var | AI API |
| --- | --- | --- |
| `PlaywrightMCPHealingProvider` | `ANTHROPIC_API_KEY` | Anthropic (Claude) |
| `GeminiMCPHealingProvider` | `GEMINI_API_KEY` | Google Generative Language (Gemini) |

Both providers:

- Spin up a `@playwright/mcp` server **in-process**, attached to the test's live `BrowserContext`
- Receive a **YAML ARIA accessibility tree** via `browser_snapshot` — not stripped HTML
- Ignore the `pageSnapshot` parameter (the MCP server provides better data directly)

### PlaywrightMCPHealingProvider (Claude + Playwright MCP)

```typescript
import { PlaywrightMCPHealingProvider } from '../utils/playwright-mcp-provider';

const provider = new PlaywrightMCPHealingProvider(
    page,                            // current Playwright Page from the test fixture
    process.env.ANTHROPIC_API_KEY!,
    'claude-sonnet-4-6',             // optional, this is the default
);
```

### GeminiMCPHealingProvider (Gemini + Playwright MCP)

```typescript
import { GeminiMCPHealingProvider } from '../utils/playwright-mcp-provider';

const provider = new GeminiMCPHealingProvider(
    page,                          // current Playwright Page from the test fixture
    process.env.GEMINI_API_KEY!,
    'gemini-2.0-flash',            // optional, this is the default
);
```

### AIHealingProvider interface

Implement this interface to add any other AI backend:

```typescript
export interface AIHealingProvider {
    // Required — backward-compatible single-selector method
    suggestSelector(elementDescription: string): Promise<string | null>;

    // Optional — preferred multi-candidate method (up to 3 selectors)
    suggestSelectors?(elementDescription: string): Promise<string[]>;
}
```

The framework calls `suggestSelectors()` when implemented, otherwise falls back to `suggestSelector()` and treats the result as a single-item list.

The `elementDescription` argument is the plain-English description followed by the ARIA role (if defined):

```text
"Bulk Register button on the Reagents page [role: button]"
```

Only `role` is appended — content-based fields (`name`, `text`, `testId`, etc.) are excluded because they may be stale. The AI derives actual attribute values from the live snapshot.

Return an array of up to 3 raw selector strings (CSS, XPath, or any Playwright-supported format) ordered from most to least stable. Return an empty array or `['UNABLE_TO_HEAL']` when the element cannot be found.

---

## Configuration via Environment Variables

The fixture reads these variables automatically — no code changes needed to switch providers.

```bash
# .env

# Playwright MCP + Claude (highest priority)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6   # optional override

# Playwright MCP + Gemini (second priority)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash       # optional override
```

**Priority:** `ANTHROPIC_API_KEY` → `GEMINI_API_KEY` → no AI (semantic-only healing).

Without any key the framework still heals via Phase 2 (semantic strategies) — AI is purely additive.

---

## Integration with Existing Helpers

`AdvancedActionsHelper` and `AdvancedAssertionsHelper` accept plain Playwright `Locator` objects — they are not changed. Page methods call `await locator.get()` to resolve the self-healing locator into a standard `Locator` before passing it to a helper.

```typescript
// Standard page (login-page.ts) — unchanged
await this.actions.fill(this.usernameInput, username, 'Enter username');
//                       ↑ Playwright Locator, assigned in constructor

// Self-healing page (login-page-self-healing.ts)
await this.actions.fill(await this.usernameInput.get(), username, 'Enter username');
//                       ↑ get() resolves to a Playwright Locator via 3-phase healing
```

The helpers, fixture, and test layer are completely transparent to the healing logic.

---

## Using Self-Healing in Tests

Import from the self-healing fixture instead of the standard one. The test API is **identical** to `pom-lazy-fixture`.

```typescript
// tests/generated/Login/tc-<id>-<name>.spec.ts
import { test } from '../../fixtures/self-healing-fixture';

test.describe('Self-Healing: Login', () => {
    test.beforeEach(async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.navigateToLogin();
    });

    test('Successful login', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'admin123');
        await pomSelfHealing.homePage.assertProfileIcon();
    });

    test('Failed login - invalid credentials', async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.loginPage.login('Admin', 'wrong');
        await pomSelfHealing.loginPage.assertInvalidLoginMessage();
    });
});
```

Run the spec:

```bash
npx playwright test tests/generated/Login --project=chromium
```

---

## Post-Test Healing Report

After every test the fixture logs a healing summary. Only locators that were **actually called** during the test appear — locators that were never exercised are silently omitted.

```text
--- Self-Healing Locator Summary ---
LoginPage:
  usernameInput        : ⚠ HEALED   — "Username text input on the OrangeHRM login form" via [Semantic: getByPlaceholder('Username')]
  passwordInput        : ✓ PRIMARY  — "Password text input on the OrangeHRM login form"
  loginButton          : ✓ PRIMARY  — "Login submit button on the OrangeHRM login form"
HomePage:
  profile_icn          : ✓ PRIMARY  — "User profile dropdown image in the OrangeHRM top navigation bar"
```

**Reading the report:**

- `✓ PRIMARY` — primary selector worked, no healing needed
- `⚠ HEALED via [Semantic: ...]` — Phase 2 triggered; update the primary selector soon
- `⚠ HEALED via [AI[N/3]: ...]` — Phase 3 triggered; candidate N's probe passed; investigate the DOM change
- `⚠ HEALED via [AI[composite 3]: ...]` *(with "no probe passed" in the log)* — Phase 3 triggered; no probe passed; composite OR-locator of all 3 candidates returned; action timeout raced all 3
- `✗ FAILED` — all strategies exhausted; AI not configured or returned null/UNABLE_TO_HEAL

Any `HEALED` entry is a maintenance signal: the primary selector is stale and should be updated in the next sprint.

### Ownership of the report

The report is assembled bottom-up. Each layer owns only its own slice:

```text
SelfHealingLocator.getHealingReport()     → one line per locator (pending entries skipped by wasUsed())
    ↑ auto-discovered by
SelfHealingPageBase.getHealingReport()    → filters used locators via Object.entries(this)
    ↑ called on each initialised page by
POMLazySelfHealing.getHealingReport()     → skips pages with empty reports
    ↑ called by
self-healing-fixture.ts                   → logs the result, knows nothing about locator names
```

Adding a new locator to a page automatically includes it in the report on the next run — no fixture or POM manager change needed.

---

## Adding a New Self-Healing Page

### 1. Create the locator repository

```typescript
// src/locators/my-page-locators.ts
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const myPageLocators = {

    myButton: {
        selector: '.my-button',
        metadata: {
            role:        'button',
            name:        'Submit',
            description: 'Submit button on My Page',
        },
    },

    myInput: {
        selector: 'input#search',
        metadata: {
            role:        'textbox',
            placeholder: 'Search…',
            description: 'Search text input on My Page',
        },
    },

} satisfies Record<string, LocatorDefinition>;
```

### 2. Create the page class

Extend `SelfHealingPageBase` — the report is inherited automatically.

```typescript
// src/pages/my-page-self-healing.ts
import { Page } from '@playwright/test';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { SelfHealingPageBase } from '../utils/self-healing-page-base';
import { HelperFactory } from '../factories/helper-factory';
import { Logger } from '../utils/Logger';
import { myPageLocators } from '../locators/my-page-locators';

export class MyPageSelfHealing extends SelfHealingPageBase {
    readonly myButton: SelfHealingLocator;
    readonly myInput:  SelfHealingLocator;

    constructor(page: Page, testName?: string, aiProvider?: AIHealingProvider) {
        super();
        const logger  = Logger.getLogger(`MyPageSelfHealing-${testName}`);
        const helpers = HelperFactory.createHelpers(page, testName ?? 'MyPage');
        this.actions  = helpers.actions;
        this.assert   = helpers.assert;

        this.myButton = SelfHealingLocator.from(page, myPageLocators.myButton, logger, aiProvider);
        this.myInput  = SelfHealingLocator.from(page, myPageLocators.myInput,  logger, aiProvider);
    }

    async clickButton() {
        await this.actions.click(await this.myButton.get(), 'Click submit button');
    }
    // getHealingReport() is fully inherited — nothing else needed
}
```

### 3. Add a lazy getter to POMLazySelfHealing

```typescript
// src/pages/pom-lazy-self-healing.ts
import { MyPageSelfHealing } from './my-page-self-healing';

private _myPage?: MyPageSelfHealing;

get myPage(): MyPageSelfHealing {
    if (!this._myPage) {
        this._myPage = new MyPageSelfHealing(this.page, this._testName, this._aiProvider);
    }
    return this._myPage;
}
```

### 4. Update getHealingReport() in POMLazySelfHealing

```typescript
getHealingReport(): string {
    const sections: string[] = [];
    if (this._loginPage) { const r = this._loginPage.getHealingReport(); if (r) sections.push(r); }
    if (this._homePage)  { const r = this._homePage.getHealingReport();  if (r) sections.push(r); }
    if (this._myPage)    { const r = this._myPage.getHealingReport();    if (r) sections.push(r); }
    return sections.length > 0 ? sections.join('\n') : '(no locators were exercised during this test)';
}
```

No changes to the fixture or test specs are needed.

---

## Implementing a Custom AI Provider

Implement the `AIHealingProvider` interface directly for any backend not covered by the two built-ins.
The interface has a single method — return the selector string or `null`:

```typescript
// src/utils/my-custom-provider.ts
import { type AIHealingProvider } from './self-healing-locator';

export class MyCustomHealingProvider implements AIHealingProvider {
    constructor(private readonly apiKey: string) {}

    // Implement suggestSelectors for multi-candidate support (recommended)
    async suggestSelectors(description: string): Promise<string[]> {
        // `description` includes metadata hints, e.g.:
        //   "Submit button [role: button, accessible name: "Submit"]"
        // Return up to 3 selector strings ordered most → least specific.
        // Return [] when the element cannot be found.
        return [];
    }

    // suggestSelector is required by the interface — delegate to suggestSelectors
    async suggestSelector(description: string): Promise<string | null> {
        const candidates = await this.suggestSelectors(description);
        return candidates[0] ?? null;
    }
}
```

Wire it directly to `POMLazySelfHealing`:

```typescript
const pom = new POMLazySelfHealing(page, testName, new MyCustomHealingProvider(apiKey));
```

---

## Log Output Reference

| Log level | Message pattern | Meaning |
| --- | --- | --- |
| `DEBUG` | `[SelfHealingLocator] ✓ Primary resolved: "…" → selector` | Phase 1 success — primary worked |
| `DEBUG` | `[SelfHealingLocator] ✓ Returning cached healed locator for "…"` | Cache hit — healed on a prior call, returned instantly |
| `WARN` | `[SelfHealingLocator] Primary selector failed for "…": selector — starting self-healing…` | Phase 1 failed, healing begins |
| `WARN` | `[SelfHealingLocator] Phase 2 — trying N semantic strategies for "…"…` | Phase 2 starting; N = number of strategies derived from metadata |
| `WARN` | `[SelfHealingLocator] Phase 2 probe [PASS] "…" ← getByRole('button', { name: '…', exact: true })` | Phase 2 strategy passed its probe |
| `WARN` | `[SelfHealingLocator] Phase 2 probe [FAIL] "…" ← getByLabel('…')` | Phase 2 strategy failed its probe; next strategy tried |
| `WARN` | `[SelfHealingLocator] Phase 2 exhausted for "…". AI provider: CONFIGURED ✓` | All Phase 2 strategies failed; Phase 3 will be invoked |
| `WARN` | `[SelfHealingLocator] Phase 2 exhausted for "…". AI provider: NOT configured ✗ (set ANTHROPIC_API_KEY or GEMINI_API_KEY in .env to enable)` | All Phase 2 strategies failed; no AI provider available |
| `WARN` | `[SelfHealingLocator] Invoking AI healing (Phase 3) for "…"…` | Phase 3 starting |
| `WARN` | `[SelfHealingLocator] ✨ AI-healed "…" (candidate N/M probe passed): "selector"` | Phase 3 success — candidate N of M passed the probe |
| `WARN` | `[SelfHealingLocator] AI candidate N/M probe failed for "…": "selector"` | A candidate was probed and failed; trying next |
| `WARN` | `[SelfHealingLocator] ✨ AI-healed "…" (no probe passed — composite OR of all N candidates handed to action): [1: "…", 2: "…"]` | No probe passed — composite OR-locator returned; action timeout races all candidates |
| `WARN` | `[SelfHealingLocator] AI could not suggest a selector for "…"` | AI returned UNABLE_TO_HEAL or an empty response |
| `ERROR` | `[SelfHealingLocator] AI healing threw an error for "…": <error>` | Phase 3 threw an exception (network error, invalid API key, etc.) |
| `ERROR` | `[SelfHealingLocator] ✗ All healing strategies failed for "…". Returning primary selector — expect a Playwright timeout error.` | All phases exhausted; primary returned so Playwright surfaces a clear timeout |
| `INFO` | `[SelfHealingFixture] AI provider: Playwright MCP + Claude (claude-sonnet-4-6)` | Provider wired at startup |
| `INFO` | `[SelfHealingFixture] AI provider: Playwright MCP + Gemini (gemini-2.0-flash)` | Provider wired at startup |
| `INFO` | `[SelfHealingFixture] No AI provider configured — using semantic auto-healing only` | No env key set |

---

## Troubleshooting

### Phase 2 never triggers even though the primary is broken

`probeTimeout` (default 2 000 ms) controls how long each probe waits. If the page is slow to load, the primary probe may time out before the element appears — and Phase 2 probes then also time out. **Fix:** increase `probeTimeout` or ensure `navigateToLogin()` waits for the page to settle before calling `.get()`.

```typescript
// Override probe timeout for slow pages
await this.actions.fill(await this.usernameInput.get(5000), username, 'Enter username');
```

### AI healing is not activating

- Check that `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` is set in `.env` and loaded via `dotenv`.
- The fixture logs `[SelfHealingFixture] AI provider: …` at test start — if you see "No AI provider configured" the key was not found.
- AI healing only triggers after **all** Phase 2 semantic strategies fail. If `getByLabel` succeeds, Phase 3 is never called.

### AI returns a selector that does not match

The AI receives the live ARIA tree from `browser_snapshot`. Improve the `description` field in `ElementMetadata` to be more specific if the AI picks the wrong element (e.g. on pages with many similar elements).

### All three phases fail

The element genuinely cannot be found. Possible causes:

- The page has not finished loading (`navigateToLogin` did not wait long enough)
- The element is inside an iframe or shadow DOM (Playwright locators do not pierce these by default)
- The element no longer exists in the new version of the application

Check the `ERROR` log line which includes the element description for quick identification.

### Test still fails after healing (second `.get()` call uses broken primary)

This happens when a page method calls `.get()` more than once on the same locator (e.g. once to assert, once to click) and the second Phase 3 call returns nothing.

**Root cause:** Without caching, each `.get()` call independently ran all three phases. If the second Phase 3 call failed (AI returned nothing), `get()` fell back to the broken primary selector and the test timed out.

**Fix (already applied):** `SelfHealingLocator` caches the healed result in `_cachedHealedLocator`. Once Phase 2 or Phase 3 succeeds on the **first** call, every subsequent call returns the cached locator immediately — no re-healing, no API call, no risk of a second failure. You will see `[SelfHealingLocator] ✓ Returning cached healed locator for "…"` in the log for every call after the first.

### "HEALED" entries appear on every run

The primary selector is stale. Use the healing report to identify which selectors need updating and fix them in the next maintenance window. Self-healing is a **safety net**, not a substitute for keeping primary selectors current.

### A new locator is missing from the healing report

Because `allLocators()` discovers locators via `Object.entries(this)`, the locator property
must be declared directly on the page class (not inside a nested object). Properties declared
with `readonly` in the class body are enumerable own properties and are discovered automatically.

### `TypeError: message.timestamp is not a function` — test fails despite passing assertions

**Symptom:** All test assertions pass, but the test is marked as failed with this error logged by the fixture teardown.

**Cause:** `@playwright/mcp@0.0.68` bundles its own `playwright@1.59.0-alpha` internally. The alpha version's `Tab` class registers a `page.on("console", ...)` listener that calls `message.timestamp()` on every `ConsoleMessage` event. However, `playwright-core@1.58.x` (the version used by the test runner) has no `timestamp()` method on `ConsoleMessage`. The resulting `TypeError` escapes as an unhandled promise rejection, which Playwright captures and uses to fail the test — even though the test body itself succeeded.

**Fix (already applied):** `createMCPClient()` in [src/utils/playwright-mcp-provider.ts](../src/utils/playwright-mcp-provider.ts) polyfills `ConsoleMessage.prototype.timestamp` to `() => Date.now()` before the MCP server is created. The guard (`typeof ... !== 'function'`) makes the patch idempotent so it runs only once regardless of how many AI-healing calls occur per test.

**If the error reappears after a package upgrade:** Check whether the installed `@playwright/mcp` still bundles a version of playwright newer than the root `playwright-core`. Run:

```bash
node -e "const p=require('path');console.log(require(p.join(p.dirname(require.resolve('playwright-core/package.json')),'lib/client/consoleMessage')).ConsoleMessage.prototype.timestamp)"
```

If the output is `undefined`, the polyfill needs to be kept. If it logs a function, the method is now native and the polyfill can be removed.

[↑ Back to top](#table-of-contents)

---

**Maintained by:** Test Automation Team
**Version:** 1.5
**Last Updated:** 2026-03-02
