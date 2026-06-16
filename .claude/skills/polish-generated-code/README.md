# polish-generated-code

> Final cleanup pass that fixes six common code-generation artefacts:
> **(1)** stray backslash-escapes before opening quotes in test specs,
> **(2)** interleaved action/assertion methods in self-healing page objects,
> **(3)** inline element locators in page methods that should be in the locator repository,
> **(4)** page-object methods that are called from tests but were never implemented,
> **(5)** hallucinated helper method names in page classes, and
> **(6)** unused import statements in generated spec and page files.
> Does **not** chain into another skill.

---

## What this skill does

### Task 1 — Stray Backslash Removal (test specs)

Removes the extraneous `\` that the generator sometimes places before the opening `'`
of a string argument:

| Before (broken) | After (fixed) |
| --- | --- |
| `test.describe(\'Title', () => {` | `test.describe('Title', () => {` |
| `test(\'TC-1234: Title', async ...` | `test('TC-1234: Title', async ...` |
| `searchByKeyword(\'ID');` | `searchByKeyword('ID');` |

Legitimate mid-string escapes like `isn\'t` are **preserved**.

### Task 2 — Re-arrange Page Methods

Reorders methods inside `*-page-self-healing.ts` so they follow the canonical layout:

```text
Navigation methods       → navigateTo(), navigateToXxx()
Action methods           → click*, fill*, select*, search*, get*Data, scroll*
Assertion methods        → verify*, assert*
Combined methods         → methods using both this.actions.* and this.assert.*
```

Removes dead generation comments (e.g. `// Wait, I need to reconsider...`) and sorts
methods alphabetically within each section.

### Task 3 — Extract Inline Locators to Repository

Finds inline locator expressions in page method bodies and refactors them into the
three-layer self-healing architecture:

```typescript
// BEFORE (inline — no self-healing):
const lotsTab = (await this.pageContainer.get()).locator('[data-testid="lots-tab"]').first();
await this.actions.click(lotsTab, 'Click Lots tab');

// AFTER (repository — full self-healing):
await this.actions.click(await this.lotsTab.get(), 'Click Lots tab');
```

For each extracted locator, the skill:

1. Adds a `LocatorDefinition` entry to `src/locators/<page>-page-locators.ts`
2. Adds a `readonly SelfHealingLocator` field to the page class
3. Adds `SelfHealingLocator.from()` wiring in the constructor
4. Replaces the inline usage with `await this.<field>.get()`

Dynamic locators (template literals, runtime parameters, loop variables) are left inline
and marked with `// inline: <reason>`.

### Task 5 — Fix Hallucinated Helper Method Names

Detects and corrects calls to non-existent methods on `this.assert.*` and `this.actions.*`
that the generator invented. Replaces each hallucinated name with its canonical counterpart
from a substitution table (e.g. `assertVisible` → `toBeVisible`, `navigate` → `goto`).

### Task 6 — Remove Unused Imports

Scans every generated spec file (`tests/generated/**/*.spec.ts`), page object
(`src/pages/*-page-self-healing.ts`), and locator file (`src/locators/*-page-locators.ts`)
for import specifiers that are never referenced in the file body, then removes them:

```typescript
// BEFORE — BrowserContext and Locator were generated but never used:
import { test, expect, BrowserContext, Locator, Page } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';

// AFTER — only what the file actually uses:
import { test, expect, Page } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
```

Rules:

- Side-effect imports (`import './setup'`) are **never removed**.
- Barrel/re-export files are **skipped entirely** (all imports treated as used).
- `import type { Foo }` specifiers are only removed when `Foo` is absent from the file.
- Value imports used only in type positions are left in place (safe for `isolatedModules`).
- Surviving import lines are **not reordered** — only unused specifiers are deleted.

### Task 4 — Scaffold Missing Page-Object Methods

Detects methods that tests call on `pomSelfHealing.<page>` but that have **no implementation**
in the corresponding page class, then scaffolds them so the project compiles and tests
fail with a clear `Error('Not implemented: ...')` rather than a confusing runtime TypeError.

```typescript
// BEFORE (test calls an invented method — runtime crash):
await pomSelfHealing.productsPage.verifySearchResultsDisplayed();
await pomSelfHealing.productsPage.clickLotsTabOnProductDetails();

// AFTER (stub inserted into ProductsPageSelfHealing — fails loudly):
/**
 * Verifies that search results are displayed on the page.
 * @generated-stub polish-generated-code Task 4
 */
async verifySearchResultsDisplayed(): Promise<void> {
    // TODO: Implement — add the appropriate locator and replace this placeholder.
    throw new Error('Not implemented: verifySearchResultsDisplayed — replace with real assertion using this.assert.*');
}
```

For **near-duplicate** calls (method name ≥ 70% similar to an existing method), a thin
**alias** is created instead of a full stub:

```typescript
// NEAR-MATCH: 'verifyNoSearchResultsMessageDisplayed' ≈ 'verifyNoResultsFoundMessageDisplayed'
// → Alias created that delegates to the existing method.
async verifyNoSearchResultsMessageDisplayed(): Promise<void> {
    await this.verifyNoResultsFoundMessageDisplayed();
}
```

Every stub is tagged `@generated-stub` in its JSDoc so engineers can find all stubs that
still need a real implementation:

```bash
grep -rn "@generated-stub" src/pages/
```

---

## When to use

Run **after** the main pipeline has completed — i.e. after `migrate-test-to-selfhealing`
has produced the final test specs and page objects.

```text
scaffold-taf-infrastructure
        ↓
create-page-locators
        ↓
create-selfhealing-page
        ↓
register-page-in-pom
        ↓
migrate-test-to-selfhealing
        ↓
polish-generated-code          ← you are here (final cleanup)
```

---

## How to invoke

```text
/polish-generated-code
```

No arguments → runs all four tasks on all files.

Optional scoping:

```text
/polish-generated-code specs         # Task 1 only (backslash fixes)
/polish-generated-code pages         # Task 2 only (method reordering)
/polish-generated-code locators      # Task 3 only (extract inline locators)
/polish-generated-code stubs         # Task 4 only (scaffold missing methods)
/polish-generated-code helpers       # Task 5 only (fix hallucinated helper names)
/polish-generated-code imports       # Task 6 only (remove unused imports)
/polish-generated-code Products      # All tasks for Products module/page
/polish-generated-code tests/generated/Products/tc-4783-....spec.ts   # Single file
```

---

## Execution order

Tasks run in this order: **Task 1 → Task 5 → Task 4 → Task 3 → Task 2 → Task 6**.

- Task 5 (hallucinated helper fixes) runs before Task 4 so the method inventory is clean
  before the missing-method diff is computed.
- Task 4 (scaffold missing methods) runs before Task 3 so that any inline locator
  placeholders inside the new stubs can also be extracted.
- Task 3 (locator extraction) runs before Task 2 (method reordering) because extraction
  changes method bodies, and reordering should operate on the already-cleaned methods.
- Task 6 (unused import removal) runs last so all prior additions and removals are final
  before the import list is pruned.

---

## Summary output

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│ polish-generated-code — Summary                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ Task 1 — Stray Backslash Removal                                               │
│   Files scanned: 6   Fixed: 6   Replacements: 18                               │
│                                                                                │
│ Task 4 — Missing Method Scaffolding                                            │
│   Pages scanned: 11   Stubs added: 4   Aliases added: 1   Skipped: 0          │
│                                                                                │
│ Task 3 — Inline Locator Extraction                                             │
│   Files scanned: 11   Extracted: 3   Already clean: 8                          │
│                                                                                │
│ Task 2 — Page Method Re-arrangement                                            │
│   Files scanned: 11   Reordered: 3   Already ordered: 8                        │
├──────────────────────────────────┬──────────────────────────────────┬──────────┤
│ Page (Task 4)                    │ Method                           │ Kind     │
├──────────────────────────────────┼──────────────────────────────────┼──────────┤
│ products-page-self-healing.ts    │ verifySearchResultsDisplayed     │ stub     │
│ products-page-self-healing.ts    │ verifyNoSearchResultsMessage...  │ alias    │
│ products-page-self-healing.ts    │ clickLotsTabOnProductDetails     │ stub     │
│ products-page-self-healing.ts    │ ensureProductsPageHasMinimum...  │ stub     │
├──────────────────────────────────┬──────────┬──────────┬──────────┬────────────┤
│ Page File (Task 3)               │ Before   │ After    │ New      │ Remaining  │
├──────────────────────────────────┼──────────┼──────────┼──────────┼────────────┤
│ products-page-self-healing.ts    │ 1        │ 15       │ 14       │ 3 inline   │
│ instruments-page-self-healing.ts │ 5        │ 22       │ 17       │ 8 inline   │
└──────────────────────────────────┴──────────┴──────────┴──────────┴────────────┘
```

---

## Related skills

| Skill | Purpose |
| --- | --- |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Produces the specs this skill cleans |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Produces the page objects this skill reorders |
| [create-page-locators](../create-page-locators/README.md) | Creates the locator files this skill extends |
