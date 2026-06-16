# create-page-locators

> Scans **all** test files in the `tests/` folder to discover every page touched across
> the project, then **creates** `src/locators/<page>-page-locators.ts` for each page that
> does not yet have one, or **appends** only the missing entries to pages that were already
> created by a previous run. A specific page or module can be targeted if needed.
> **Automatically continues** to `create-selfhealing-page` when complete.

---

## What this skill does

In a single run:

1. Lists all `*.spec.ts` / `*.spec.js` files in `tests/` and derives the page name for each
2. Groups files by page — multiple tests belonging to the same page are processed together
3. For each unique page, checks whether `src/locators/<page>-page-locators.ts` exists
4. **Creates** the locators file from scratch if it does not exist
5. **Appends** only the new entries if the file was already created — existing entries are never modified
6. Enriches every selector with semantic metadata for Phase 2 healing
7. Prints a per-page result and a consolidated batch summary
8. **Automatically runs `/create-selfhealing-page`** after completing

---

## Page name derivation

| Test file location | Page name |
| ------------------ | --------- |
| `tests/Reagents/tc-5405-...spec.ts` | `Reagents` (subfolder name wins) |
| `tests/Instruments/tc-1234-...spec.ts` | `Instruments` (subfolder name wins) |
| `tests/tc-5097-bulk-add-reagents.spec.ts` | `Reagents` (domain noun extracted from filename) |
| `tests/tc-7890-audit-trail-export.spec.ts` | `AuditTrail` (domain noun extracted from filename) |

When the filename is ambiguous, the skill cross-references `page.goto('/path')` calls inside
the file to confirm the page domain.

---

## When to use

Run **once** (no arguments) after `scaffold-taf-infrastructure` has set up the project.
The skill processes every page in a single invocation, then automatically continues.

This is **Step 2** of the conversion pipeline:

```text
scaffold-taf-infrastructure
        ↓
create-page-locators          ← you are here (processes ALL pages, then auto-continues)
        ↓  auto-continues
create-selfhealing-page       (processes ALL pages)
        ↓  auto-continues
register-page-in-pom          (registers ALL pages)
        ↓  auto-continues
migrate-test-to-selfhealing   (migrates ALL tests)
```

---

## How to invoke

```text
/create-page-locators
```

No arguments needed to process the entire project. Optionally target a specific page:

```text
/create-page-locators Instruments
/create-page-locators Reagents
```

---

## Output structure

```typescript
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const <camelCaseName>Locators = {

    // ── Section comment ──
    <elementName>: {
        selector: '<css-or-xpath>',
        metadata: {
            role:        '<aria-role>',
            label:       '<label>',
            placeholder: '<placeholder>',
            text:        '<visible-text>',
            description: '<specific plain-English description>',
        },
    },

} satisfies Record<string, LocatorDefinition>;
```

---

## Selector strategy

Priority order applied when generating selectors:

1. `data-testid` attribute: `[data-testid="submit-btn"]`
2. ARIA-stable CSS: `button[type="submit"]`, `input[name="username"]`
3. Text-based CSS: `button:has-text("Save")`
4. XPath (last resort): `//button[@aria-label='Save']`

Selectors marked `// ⚠ Review selector` were inferred and must be validated against the real DOM.

---

## Naming conventions

| Element type | Property name pattern | Example |
| ------------ | --------------------- | ------- |
| Table / list | `<name>Table` | `reagentsTable` |
| Button | `<action>Button` | `confirmDeleteButton` |
| Input | `<name>Input` | `usernameInput` |
| Dropdown | `<name>Dropdown` | `statusFilterDropdown` |
| Modal / dialog | `<name>Dialog` | `confirmationDialog` |
| Toast / alert | `<name>Toast` | `successToast` |
| Tab / link | `<name>Tab` | `reagentsTab` |

---

## Batch summary output

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ create-page-locators — Batch Run Summary                                     │
├──────────────────────────────────┬────────────┬────────────┬─────────────────┤
│ Locators File                    │ New        │ Existed    │ Status          │
├──────────────────────────────────┼────────────┼────────────┼─────────────────┤
│ src/locators/reagents-page-...   │ 12         │ 0          │ CREATED         │
│ src/locators/instruments-page-...│ 3          │ 8          │ UPDATED         │
│ src/locators/login-page-...      │ 0          │ 5          │ SKIPPED         │
└──────────────────────────────────┴────────────┴────────────┴─────────────────┘
Pages processed: N  |  New files: X  |  Updated files: Y  |  Skipped: Z
```

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [scaffold-taf-infrastructure](../scaffold-taf-infrastructure/README.md) | Must run first |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Next step (auto-runs) |
| [register-page-in-pom](../register-page-in-pom/README.md) | Register all pages |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Migrate all specs |
