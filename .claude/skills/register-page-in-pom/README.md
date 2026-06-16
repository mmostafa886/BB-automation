# register-page-in-pom

> Makes self-healing page objects accessible in tests by adding them to
> `src/pages/pom-lazy-self-healing.ts` as **lazy-initialised public getters**.
> When invoked without arguments, auto-discovers all `*PageSelfHealing` classes in
> `src/pages/` and registers every unregistered one in a single run.
> Skips silently if a page is already registered.
> **Automatically continues** to `migrate-test-to-selfhealing` when complete.

---

## What this skill does

For each unregistered page, performs four **surgical additions** to `pom-lazy-self-healing.ts` —
nothing is modified or removed:

| Edit | What is added |
| ---- | ------------- |
| Import | `import { <PageClass> } from './<file>'` |
| Backing field | `private _<propName>?: <PageClass>` |
| Getter | `get <propName>(): <PageClass> { return (this._<propName> ??= new ...) }` |
| Healing report | `this._<propName>?.getHealingReport()` in the aggregate |

After completing, **automatically runs `/migrate-test-to-selfhealing`**.

---

## When to use

Run **once** (no arguments) after `create-selfhealing-page` has produced all page objects.

This is **Step 4** of the conversion pipeline:

```text
scaffold-taf-infrastructure
        ↓
create-page-locators          (ALL pages)
        ↓
create-selfhealing-page       (ALL pages)
        ↓
register-page-in-pom          ← you are here (ALL pages, then auto-continues)
        ↓  auto-continues
migrate-test-to-selfhealing   (ALL tests + verification)
```

---

## How to invoke

```text
/register-page-in-pom
```

No arguments needed — the skill discovers all `*-page-self-healing.ts` files in `src/pages/`,
derives the class name and getter name for each, then registers any that are not yet in the POM.

Optionally target a specific page:

```text
/register-page-in-pom ReagentsPageSelfHealing reagentsPage
/register-page-in-pom InstrumentsPageSelfHealing instrumentsPage
```

---

## Auto-discovery logic

When called without arguments, the skill:

1. Scans `src/pages/` for all `*-page-self-healing.ts` files
2. Derives class names: `reagents-page-self-healing.ts` → `ReagentsPageSelfHealing`
3. Derives getter names: `ReagentsPageSelfHealing` → `reagentsPage`
4. Reads `pom-lazy-self-healing.ts` and filters out classes already imported
5. Registers only the unregistered ones

---

## After registration

Tests access every page via the fixture:

```typescript
test('TC-5405', async ({ selfHealingFixture: { pomSelfHealing } }) => {
  await pomSelfHealing.reagentsPage.navigateTo();
  await pomSelfHealing.reagentsPage.deactivateReagent();
  await pomSelfHealing.reagentsPage.verifyToastMessage();
});
```

No `test.step()` calls needed — every action is automatically wrapped as a named step
by `StepRunner.step()` inside the helper classes.

---

## Lazy initialization

Pages are constructed **on first access**, not at fixture startup:

```typescript
get reagentsPage(): ReagentsPageSelfHealing {
  return (this._reagentsPage ??= new ReagentsPageSelfHealing(
    this.page, this._testName ?? 'POM', this._aiProvider
  ));
}
```

Tests that never access a page pay zero construction cost. The `??=` operator ensures
exactly one instance per test. The `?.` in `getHealingReport()` means unaccessed pages
contribute nothing to the report.

---

## Batch summary output

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ register-page-in-pom — Batch Run Summary                                   │
├───────────────────────────────┬─────────────────────────┬──────────────────┤
│ Class                         │ Getter                  │ Status           │
├───────────────────────────────┼─────────────────────────┼──────────────────┤
│ ReagentsPageSelfHealing       │ reagentsPage            │ REGISTERED       │
│ InstrumentsPageSelfHealing    │ instrumentsPage         │ ALREADY EXISTED  │
│ AuditTrailPageSelfHealing     │ auditTrailPage          │ REGISTERED       │
└───────────────────────────────┴─────────────────────────┴──────────────────┘
Registered: N  |  Already existed: M  |  Total: T
```

---

## Registered pages (examples)

| Page class | `pomSelfHealing` property |
| ---------- | ------------------------- |
| `LoginPageSelfHealing` | `loginPage` |
| `HomePageSelfHealing` | `homePage` |
| `InstrumentsPageSelfHealing` | `instrumentsPage` |
| `ReagentsPageSelfHealing` | `reagentsPage` |
| `BulkRegisterReagentsPageSelfHealing` | `bulkRegisterReagentsPage` |
| `LibraryManagementPageSelfHealing` | `libraryManagementPage` |
| `PlateLayoutsPageSelfHealing` | `plateLayoutsPage` |
| `ProjectsPageSelfHealing` | `projectsPage` |
| `ReactionTemplatesPageSelfHealing` | `reactionTemplatesPage` |
| `AuditTrailPageSelfHealing` | `auditTrailPage` |

New pages are auto-registered each time the skill runs.

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Must run first |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Next step (auto-runs) |
| [create-page-locators](../create-page-locators/README.md) | Locator definitions |
| [scaffold-taf-infrastructure](../scaffold-taf-infrastructure/README.md) | Initial setup |
