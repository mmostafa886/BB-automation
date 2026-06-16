# create-selfhealing-page

> **Creates** `src/pages/<page>-self-healing.ts` if it does not exist, or **appends**
> missing locator declarations and methods to it if already created by a previous run.
> Performs a **semantic similarity check** before adding any method to avoid duplicating
> intent already covered by an existing method. Processes all pages in a single run when
> invoked without arguments. **Automatically continues** to `register-page-in-pom` when complete.

---

## What this skill does

In a single run:

1. Discovers all `*-page-locators.ts` files in `src/locators/` (or uses a specified page)
2. For each page, checks whether `src/pages/<page>-page-self-healing.ts` already exists
3. Reads the locators file to get all keys and metadata
4. **Before generating any method**, runs a similarity check against existing methods to
   avoid creating methods whose intent is already covered
5. **Creates** the full class from scratch if the page file does not exist
6. **Appends** only new locator declarations, constructor wiring, and methods if the file
   already exists — existing code is never modified
7. Prints a per-page result and a consolidated batch summary
8. **Automatically runs `/register-page-in-pom`** after completing

---

## No test.step() in page object methods

Every action and assertion is automatically wrapped as a named Playwright step by
`StepRunner.step()` inside `AdvancedActionsHelper` and `AdvancedAssertionsHelper`.
Page object methods **must not** call `test.step()` directly — steps appear in the
HTML report automatically.

---

## Similarity check — no duplicate methods

Before adding any method, the skill checks whether the proposed method is already covered
by an existing method in the class:

| Proposed | Covered by | Result |
| -------- | ---------- | ------ |
| `clickSaveButton` | `clickSaveButtonAndVerifySuccess` | **Skipped** — combined method already handles it |
| `verifySaveSuccess` | `clickSaveButtonAndVerifySuccess` | **Skipped** — assertion is part of combined method |
| `fillNameField` | `fillNameFieldAndSubmit` | **Skipped** — fill is part of the wider scenario |
| `verifyTableVisible` | *(none)* | **Added** — no coverage |
| `clickExportButton` | `clickSaveButton` | **Added** — different intent |

**Rule:** if an existing method contains the same verb+noun as the proposed method (even
with `AndVerify`, `AndConfirm`, `AndSubmit` suffixes), the proposed method is skipped.

---

## When to use

Run **once** (no arguments) after `create-page-locators` has produced all locators files.

This is **Step 3** of the conversion pipeline:

```text
scaffold-taf-infrastructure
        ↓
create-page-locators          (ALL pages)
        ↓
create-selfhealing-page       ← you are here (ALL pages, then auto-continues)
        ↓  auto-continues
register-page-in-pom          (ALL pages)
        ↓  auto-continues
migrate-test-to-selfhealing   (ALL tests)
```

---

## How to invoke

```text
/create-selfhealing-page
```

No arguments needed to process all pages. Optionally target a specific page:

```text
/create-selfhealing-page Instruments
/create-selfhealing-page Login
```

---

## Method generation rules

| Locator type | Action method generated | Assertion method generated |
| ------------ | ----------------------- | -------------------------- |
| Button | `click<Name>()` | — |
| Input | `fill<Name>(value)` | — |
| Table / list | — | `verify<Name>Visible()`, `verify<Name>HasRows()` |
| Dropdown / select | `select<Name>Option(value)` | — |
| Modal / dialog | — | `verify<Name>DialogVisible()` |
| Toast / alert | — | `verify<Name>ToastVisible()` |
| Navigation tab | `clickNavigateTo<Name>()` | — |

Combined action+assertion methods (e.g. `clickSaveAndVerifySuccess`) are generated when
the step context implies both an action and its expected result belong to a single intent.

---

## Three-phase healing at runtime

```text
Test calls: await pomSelfHealing.reagentsPage.deactivateReagent()
                                                     ↓
                              await this.deactivateButton.get()
                                           ↓
Phase 1: try primary CSS/XPath selector
         → found → return Locator ✅
                                           ↓ (miss)
Phase 2: try getByRole / getByLabel / getByText / getByTestId
         → found → return Locator ✅
                                           ↓ (miss)
Phase 3: AI suggests selector via @playwright/mcp (Claude or Gemini)
         → found → return Locator ✅
```

---

## Conventions enforced

- No `page.locator()` in the class body — only in the constructor via `SelfHealingLocator.from()`
- `await this.<locator>.get()` before every interaction
- Action methods contain no assertions
- Assertion methods have no side effects
- **No `test.step()` calls** — StepRunner handles step wrapping automatically
- Logger name: `<PageName>SelfHealing-${testName}` for per-test log isolation

---

## Batch summary output

```text
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ create-selfhealing-page — Batch Run Summary                                         │
├────────────────────────────────────┬───────────┬───────────┬───────────┬────────────┤
│ Page File                          │ Locators  │ Methods   │ Skipped   │ Status     │
├────────────────────────────────────┼───────────┼───────────┼───────────┼────────────┤
│ src/pages/reagents-page-...        │ 12        │ 18        │ 0         │ CREATED    │
│ src/pages/instruments-page-...     │ 8         │ 4         │ 2         │ UPDATED    │
└────────────────────────────────────┴───────────┴───────────┴───────────┴────────────┘
Pages processed: N  |  New files: X  |  Updated files: Y
```

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [create-page-locators](../create-page-locators/README.md) | Must run first |
| [register-page-in-pom](../register-page-in-pom/README.md) | Next step (auto-runs) |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Migrate all specs |
| [scaffold-taf-infrastructure](../scaffold-taf-infrastructure/README.md) | Initial setup |
