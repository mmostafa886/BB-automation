# rename-and-merge-module

Renames a generated test module and optionally merges its page object + locators into an existing target module. Designed for the common case where a generated module (e.g. `Solvent-Records`) logically belongs inside an existing module (e.g. `Reagents`).

## What it does

1. **Renames tags** — replaces `@SourceTag` with `@TargetTag` in all spec test name strings
2. **Renames describe prefix** — replaces `'SourceModule - ...'` with `'TargetModule - ...'` in `test.describe()` blocks
3. **Re-routes POM references** — updates `pomSelfHealing.sourcePage.method()` calls to either `pomSelfHealing.targetListingPage.method()` or `pomSelfHealing.targetFormPage.method()` based on semantic context
4. **Merges locators** — appends new-only locator entries from source into the target locator files (listing + form), skipping duplicates
5. **Merges page methods** — appends new-only action and assertion methods into target page classes, wires new locator fields in the constructor
6. **Updates POM registry** — removes the source page's import, backing field, lazy getter, and healing report entry from `pom-lazy-self-healing.ts`
7. **Moves spec files** — `git mv` from `tests/generated/SourceModule/` to `tests/generated/TargetModule/`
8. **Deletes obsolete files** — removes source locator file and source page class

## When to use

Use this skill when:
- A generated test module was created under a folder name that doesn't match the app's module structure
- You want to consolidate two related modules (e.g. a "Solvent Records" sub-feature into the parent "Reagents" module)
- Tags in spec files need to be updated to align with the existing tagging convention

## How to invoke

```
/rename-and-merge-module
```

The skill will prompt you for all required inputs. You can also pass them inline:

```
/rename-and-merge-module sourceModule=Solvent-Records targetModule=Reagents sourceTag=SolventRecord targetTag=Reagents mergePages=true
```

## Before/after example

**Before** (`tests/generated/Solvent-Records/tc-5789-...spec.ts`):
```typescript
test.describe('SolventRecord - Solvent Record Form Shows Only Simplified Identity and Properties Fields', () => {
  test.fixme(
    'TC-5789: ... @P2 @SolventRecord',
    async ({ selfHealingFixture: { pomSelfHealing } }) => {
      await pomSelfHealing.solventRecordsPage.navigateTo();
      await pomSelfHealing.solventRecordsPage.clickCreateReagentButton();
      await pomSelfHealing.solventRecordsPage.selectReagentRole('Solvent');
      await pomSelfHealing.solventRecordsPage.verifyIdentitySectionVisible();
    }
  );
});
```

**After** (`tests/generated/Reagents/tc-5789-...spec.ts`):
```typescript
test.describe('Reagents - Solvent Record Form Shows Only Simplified Identity and Properties Fields', () => {
  test.fixme(
    'TC-5789: ... @P2 @Reagents',
    async ({ selfHealingFixture: { pomSelfHealing } }) => {
      await pomSelfHealing.reagentsPage.navigateTo();           // listing method
      await pomSelfHealing.reagentsPage.clickCreateReagentButton(); // listing method
      await pomSelfHealing.newEditReagentPage.selectReagentRole('Solvent'); // form method
      await pomSelfHealing.newEditReagentPage.verifyIdentitySectionVisible(); // form method
    }
  );
});
```

## Listing vs form method routing

The skill classifies each source method as either a **listing page** method or a **form page** method:

| Listing page | Form page |
|-------------|-----------|
| `navigateTo()` (to `/module`) | `navigateToCreateForm()` (to `/module/new`) |
| `clickCreate*Button()` on listing | `fillName()`, `selectRole()`, form inputs |
| `applyListingFilter*()` | section heading assertions |
| `verifyListingTable*()` | toggle switches, sub-questions |
| deactivation modal actions | `clickSave()`, `clickCancel()` |
| | `verifyToastVisible()` (form save confirmation) |

## Key implementation notes

- `@` in Perl regex **must** be escaped as `\@` to avoid array variable interpolation
- Always use `git mv` for moving spec files (preserves git history)
- Locator deduplication: a locator is duplicate if target already has a key with matching `role` + `text`/`name` metadata
- Method deduplication: if the target already has a method with the same name or semantically equivalent behaviour, skip it and use the existing one in specs

## Related skills

- `tcs-to-plscript` — generates the initial spec files and page objects
- `polish-generated-code` — cleans up generated code after creation
- `register-page-in-pom` — registers new page objects in the POM
