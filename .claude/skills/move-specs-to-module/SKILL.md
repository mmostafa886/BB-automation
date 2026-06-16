---
name: move-specs-to-module
description: Moves spec files from one generated module to another, porting methods, locators, and page wiring as needed.
---

# move-specs-to-module

Moves one or more generated spec files from their current module into a target module.
For each method called in the specs, the skill checks whether it already exists on the
target page class — reusing it if so, or porting the implementation from the source page
class if not. Missing locators are appended to the target locators file and wired into
the target page class constructor. Finally each spec is updated in-place and relocated
with `git mv`.

---

## When to invoke

Use this skill whenever you need to reassign spec files to a different module because
the test cases conceptually belong there (e.g. role-management specs generated under
Plate-Layouts that actually exercise the Reagent form).

---

## Inputs — ask the user for any that are missing

| Input | Description | Example |
|-------|-------------|---------|
| `specFiles` | Glob or explicit list of spec file paths to move | `tests/generated/Plate-Layouts/tc-575*.spec.ts` |
| `sourcePageProperty` | POM property name currently used in the specs | `plateLayoutsPage` |
| `sourceModuleTag` | `@Tag` used inside the spec strings | `PlateLayout` |
| `sourceDescribePrefix` | Prefix of the `test.describe(...)` string | `PlateLayout` |
| `targetModule` | Destination folder under `tests/generated/` | `Reagents` |
| `targetPageProperty` | POM property to route calls to | `reagentsPage` |
| `targetPageClass` | Self-healing class file (no extension) | `reagents-page-self-healing` |
| `targetLocatorsFile` | Path to target locators file | `src/locators/reagents-page-locators.ts` |
| `targetModuleTag` | `@Tag` to use in moved specs | `Reagents` |
| `targetDescribePrefix` | Prefix to use in `test.describe(...)` strings | `Reagents` |

---

## Execution steps

### Step 1 — Gather inputs
Prompt for any missing inputs listed above before proceeding.

### Step 2 — Catalog method calls
For each spec file, collect every `pomSelfHealing.<sourcePageProperty>.<method>(...)` call.
Also note `navigateToReagents()` → check if target page has an equivalent `navigateTo()`
or similarly named navigation method to reuse instead of creating a new one.

### Step 3 — Diff against target page class
For each method in the catalog:

1. Grep `src/pages/<targetPageClass>.ts` for the method name.
2. **Already exists** → record the mapping (may need name correction, e.g.
   `clickEditOnFirstReagent` → `clickEditFirstReagent`).
3. **Missing** → queue for addition; identify which locators the method needs and
   check `<targetLocatorsFile>` for each — queue any absent locators too.

### Step 4 — Add missing locators
For every queued locator:

1. Read its definition from the source locators file
   (`src/locators/<sourcePageClass>-locators.ts` or the page that owns it).
2. Append the entry to `<targetLocatorsFile>` immediately before
   `} satisfies Record<string, LocatorDefinition>;`.
3. Add a `readonly <name>: SelfHealingLocator;` field declaration in the target page class.
4. Add the `SelfHealingLocator.from(page, <locatorsObject>.<name>, logger, aiProvider);`
   assignment in the constructor.

### Step 5 — Port missing methods
For every queued method:

- Copy the implementation verbatim from the source page class.
- Replace any locator references that differ between source and target
  (e.g. `this.saveLayoutButton` → `this.page.locator('[data-testid="save-button"]...')` if
  the locator does not exist in the target page).
- Ensure every method body is wrapped in `await test.step(...)` with a meaningful label.
- Do **not** create one-liner thin aliases — if a functionally equivalent method already
  exists under a different name, map the spec call to that name instead.
- Append all new methods at the bottom of the class, grouped under a comment banner.

### Step 6 — Bulk-update spec files
Apply all of the following replacements to every spec file:

| Find (regex-safe) | Replace |
|-------------------|---------|
| `@module   <sourceModuleTag>` | `@module   <targetModuleTag>` |
| `'<sourceDescribePrefix> - ` | `'<targetDescribePrefix> - ` |
| `@<sourceModuleTag>` (inside test title strings) | `@<targetModuleTag>` |
| `pomSelfHealing\.<sourcePageProperty>\.` | `pomSelfHealing.<targetPageProperty>.` |
| Any method call mapped to a different name in Step 3 | Corrected call |

### Step 7 — Move spec files
```bash
git mv <specFile> tests/generated/<targetModule>/
```
Run one `git mv` per file; do **not** use wildcards with `git mv`.

### Step 8 — Clean up source page class
After moving all specs, determine which methods on the **source** page class are now unused.

1. Collect the full set of method names that existed on the source page class.
2. For each method, grep **all remaining** spec files under `tests/generated/<sourceModule>/`
   for that method name. If zero callers remain (and no other method in the source page
   class calls it internally), mark it for removal.
3. For each method removed in step 2, identify every `this.<locatorName>` reference inside
   that method body. Grep the **remaining** methods in the source page class for each
   locator name — if no remaining method uses it, mark both the field declaration and the
   constructor assignment for removal.
4. For each locator removed in step 3, remove the corresponding entry from the source
   locators file (`src/locators/<sourcePageClass>-locators.ts`) — but **only** if the
   locator key does not appear anywhere else in the source page class or its locators file
   consumers (grep broadly before deleting).
5. Apply all removals: delete methods, field declarations, constructor assignments, and
   locator entries in one pass.

> **Tip**: Run the grep checks before editing — identify the complete removal set first,
> then make all edits together to avoid multiple round-trips over the same file.

### Step 9 — Verify
Run `npx tsc --noEmit` and report only errors **introduced** by this skill run (compare
against any pre-existing errors noted before Step 1).
Confirm with `git status` that:
- All spec files are tracked as renames (`R`)
- Source page class and locators file are modified (`M`)
- Target page class and locators file are modified (`M`)
Grep the moved specs to confirm zero occurrences of `<sourcePageProperty>`.

---

## Rules

- **No duplicate methods**: always grep before adding to the target page.
- **No thin aliases**: if the target page has `clickEditFirstReagent()` and the spec calls
  `clickEditOnFirstReagent()`, update the spec — do not add a one-liner wrapper.
- **No duplicate locators**: grep `<targetLocatorsFile>` before adding each entry.
- **Always clean up the source**: after moving specs, remove every method, field, and
  locator entry in the source page and locators file that has no remaining callers.
  Do not leave dead code behind.
- **Grep before deleting**: confirm zero remaining callers before removing anything from
  the source page class or its locators file.
- **Preserve `test.fixme`**: never remove the fixme annotation from moved specs.
- **Ask before destructive steps**: confirm before deleting source files that still
  contain unrelocated specs.
- All new methods must use meaningful `test.step()` descriptions, not empty strings.
