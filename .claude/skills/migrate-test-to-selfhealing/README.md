# migrate-test-to-selfhealing

> Migrates **all** existing Playwright test specs on the current branch to the self-healing
> fixture pattern (or a specified subset). Replaces direct element locator usage
> (`page.locator`, `expect(locator)`) with the corresponding `pomSelfHealing.<page>.<method>()`
> calls from the already-created page objects. After migration, runs a **mandatory verification
> pass** to confirm no direct element usage or `test.step()` wrappers remain in any migrated
> file. Skips files that are already migrated. This is the **final step** of the pipeline.

---

## What this skill does

In a single run:

1. Lists all `*.spec.ts` / `*.spec.js` files in `tests/` (or uses a specified subset)
2. Checks whether each file already uses `self-healing-fixture` — skips if so
3. Reads the relevant page objects in `src/pages/` to build a **semantic method lookup table**
4. Replaces every direct locator call with the matching page method
5. Collapses consecutive raw lines that share the same intent into a single combined method call
6. Adds `// TODO:` stubs for any raw call that has no matching page method
7. Swaps the fixture import to `self-healing-fixture`
8. Adds the JSDoc metadata header
9. **Removes any `test.step()` wrappers** from the source (unwraps the inner content)
10. Writes the migrated file to `tests/generated/<Module>/`
11. **Runs a verification pass** over all migrated files — reports any remaining uncommented
    direct element usage or `test.step()` calls as errors that must be resolved

---

## No test.step() in test files

Steps are tracked **automatically** by `StepRunner.step()` inside `AdvancedActionsHelper`
and `AdvancedAssertionsHelper`. Every `pomSelfHealing.<page>.<method>()` call already
produces a named step in the Playwright HTML report.

Adding `test.step()` wrappers in test files creates redundant nesting. The migration skill
**removes** any existing `test.step()` wrappers from the source and the verification pass
**fails** if any `test.step(` calls remain after migration.

---

## When to use

Run **once** (no arguments) after all pages have been registered in the POM.

This is **Step 5** — the final step of the conversion pipeline:

```text
scaffold-taf-infrastructure
        ↓
create-page-locators          (ALL pages)
        ↓
create-selfhealing-page       (ALL pages)
        ↓
register-page-in-pom          (ALL pages)
        ↓
migrate-test-to-selfhealing   ← you are here (ALL tests + verification)
```

---

## How to invoke

```text
/migrate-test-to-selfhealing
```

No arguments migrates the entire project. Optionally target a subset:

```text
/migrate-test-to-selfhealing Reagents
/migrate-test-to-selfhealing TC-5405
/migrate-test-to-selfhealing tests/generated/Instruments/*.spec.ts
```

### Input options

| Input | Example |
| ----- | ------- |
| *(none)* | Migrate all test files in `tests/` |
| Module name | `Reagents` |
| TC ID | `TC-5405` |
| Single file path | `tests/generated/tc-5405-verify-reagents-deactivation.spec.ts` |
| Glob | `tests/generated/Instruments/*.spec.ts` |

---

## Before / after

### Before (old pattern)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Reagents - Verify the reagents deactivation', () => {
  test('TC-5405: Verify the reagents deactivation', async ({ page }) => {
    await page.goto('/reagents');
    await page.locator('button:has-text("Deactivate")').click();
    await page.locator('.confirm-btn').click();
    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
```

### After (self-healing pattern — NO test.step in test body)

```typescript
/**
 * @testcase TC-5405
 * @title Verify the reagents deactivation
 * @module Reagents
 */

import { test } from '../../fixtures/self-healing-fixture';

test.describe('Reagents - Verify the reagents deactivation', () => {
  test('TC-5405: Verify the reagents deactivation @reagents', async ({
    selfHealingFixture: { pomSelfHealing },
  }) => {
    // Step 1: Navigate to the reagents page
    await pomSelfHealing.reagentsPage.navigateTo();

    // Step 2: Deactivate a reagent
    await pomSelfHealing.reagentsPage.deactivateReagent();

    // Step 3: Confirm deactivation
    await pomSelfHealing.reagentsPage.confirmDeactivation();

    // Step 4: Verify toast message
    await pomSelfHealing.reagentsPage.verifyToastMessage();
  });
});
```

### ❌ Wrong — do not produce this (has test.step wrappers)

```typescript
// WRONG — test.step() in test body is forbidden
test('TC-5405: ...', async ({ selfHealingFixture: { pomSelfHealing } }) => {
  await test.step('Step 1: Navigate', async () => {
    await pomSelfHealing.reagentsPage.navigateTo();
  });
});
```

---

## Method matching strategy

The skill uses **semantic similarity**, not just exact name matching:

- Matches raw selector strings against locator keys in `src/locators/`
- Looks up which page method acts on that locator key
- Collapses a consecutive click + assertion into a single combined method when both share
  the same element intent (e.g. `clickSaveAndVerifySuccess` covers both the raw `click()`
  and the `expect(...).toBeVisible()`)
- Falls back to step comment intent when the selector has no exact match in locators

---

## TODO stubs

When no page method exists for a raw call, the skill leaves:

```typescript
// TODO: add verifyInstrumentsTableColumns() to InstrumentsPageSelfHealing
// await expect(page.locator('th')).toHaveCount(5);
```

Collect all TODOs after migration and run `/create-selfhealing-page` again to add the
missing methods, then re-run `/migrate-test-to-selfhealing` to replace the stubs.

---

## Post-migration verification

After all files are written, the skill scans every migrated file for remaining issues:

```bash
grep -rn "page\.locator\|page\.goto\|expect(page\." tests/generated/ --include="*.ts"
grep -rn "await test\.step\|test\.step(" tests/generated/ --include="*.ts"
```

- Lines starting with `//` (commented-out TODOs) are **acceptable** for the first grep
- Any **uncommented** `page.*` match is a **verification failure**
- Any `test.step(` match (commented or not) is a **verification failure**

Failures are reported and must be resolved before the run is marked complete.

---

## Final summary output

```text
┌──────────────────────────────────────────────────────────────┬──────────────┬─────────┬──────────────┬──────────┐
│ File                                                         │ Steps Mapped │ TODOs   │ Verification │ Status   │
├──────────────────────────────────────────────────────────────┼──────────────┼─────────┼──────────────┼──────────┤
│ tests/generated/Reagents/tc-5405.spec.ts                     │ 4            │ 0       │ ✅ PASS      │ MIGRATED │
│ tests/generated/Reagents/tc-5282.spec.ts                     │ 3            │ 1       │ ✅ PASS      │ MIGRATED │
│ tests/generated/Instruments/tc-1234.spec.ts                  │ 5            │ 0       │ ❌ FAIL      │ NEEDS FIX│
└──────────────────────────────────────────────────────────────┴──────────────┴─────────┴──────────────┴──────────┘
Migration complete: X files migrated, Y files skipped (already migrated)
Verification: P PASS  |  F FAIL
```

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [register-page-in-pom](../register-page-in-pom/README.md) | Must run first |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Add missing POM methods after TODO review |
| [scaffold-taf-infrastructure](../scaffold-taf-infrastructure/README.md) | Initial setup |
| [create-page-locators](../create-page-locators/README.md) | Locator definitions |
