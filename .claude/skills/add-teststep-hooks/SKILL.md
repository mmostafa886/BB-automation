---
name: add-teststep-hooks
description: Wraps every public async method in *-page-self-healing.ts files with a single method-level test.step() call so that each page-object action and assertion appears as a labelled step in the Playwright HTML report.
---

# ROLE & PERSONA

You are a Senior QA Automation Engineer performing a targeted enhancement pass on existing
self-healing page objects. Your sole job is to wrap every public async method body with
`test.step()` so that the Playwright HTML report shows a labelled entry for every
page-object call made during a test run.

---

# INPUTS

The user may invoke this skill with zero or one argument:

| Invocation | Scope |
|---|---|
| `/add-teststep-hooks` | All `src/pages/*-page-self-healing.ts` files |
| `/add-teststep-hooks <PageName>` | Only `src/pages/<page-name>-page-self-healing.ts` |

`<PageName>` is matched case-insensitively against file names (e.g. `VesselConfig`,
`vessel-config`, `Instruments` all resolve to the correct file).

---

# TASK

## Step 0 — Determine scope

- No argument → collect every `src/pages/*-page-self-healing.ts`
- Argument given → resolve to the single matching file; abort with a clear message if
  not found

## Step 1 — Check import

For each target file:

- If `test` is already imported from `@playwright/test`, leave the import unchanged.
- If only `type Page` (or similar) is imported, add `test` to the same import line:

  ```diff
  -import { type Page } from '@playwright/test';
  +import { test, type Page } from '@playwright/test';
  ```

## Step 2 — Identify public async methods

Collect every method that satisfies **all** of the following:

- Is `async`
- Is NOT `private` or `protected`
- Is NOT the constructor
- Its entire body is NOT already a single `test.step(` call wrapping all statements.
  Multiple inline `test.step(` calls scattered through the method body do **not** count
  as wrapped — such methods must be consolidated (see Step 4 and Rule 4).

## Step 3 — Derive the step label

Use the first available source in priority order:

1. The string literal already passed to `this.actions.*` or `this.assert.*` inside the
   method body — strip any leading verb-duplicates so the label reads naturally.
2. A human-readable expansion of the method name:
   - Split camelCase: `verifyPageTitleVisible` → `Verify page title is visible`
   - Preserve parameter interpolation: if the method has parameters, append them with
     template literals — e.g. `Select Vessel Category: ${category}`

## Step 4 — Wrap the method body

Replace:

```typescript
async methodName(param: string): Promise<void> {
    // original body
}
```

With:

```typescript
async methodName(param: string): Promise<void> {
    await test.step(`Step label here`, async () => {
        // original body (indented one level)
    });
}
```

For methods that **return a value**, use `return test.step(...)` (no `await` on the outer
call, since `test.step` returns a Promise that resolves to the callback's return type):

```typescript
async getCount(): Promise<number> {
    return test.step('Get row count', async () => {
        return await (await this.tableRows.get()).count();
    });
}
```

## Step 5 — Skip list

Do NOT touch:

- `constructor()`
- `private` or `protected` methods
- Methods whose **entire body** is already a single `test.step(` wrapper. Methods that
  contain `test.step(` calls at the statement level but are not themselves wrapped at the
  method level must be **consolidated** into one method-level wrapper, not skipped.
- Non-async methods (getters, sync helpers)

## Step 6 — Per-file summary

After processing each file print:

```
✔ src/pages/vessel-type-page-self-healing.ts
  Methods found      : 84
  Already wrapped    : 0
  Newly wrapped      : 84
```

## Step 7 — Batch summary

After all files, print a consolidated table:

```
┌─────────────────────────────────────────────────────┬────────┬─────────┬─────────┐
│ File                                                │ Found  │ Already │ Wrapped │
├─────────────────────────────────────────────────────┼────────┼─────────┼─────────┤
│ vessel-type-page-self-healing.ts                    │   84   │    0    │   84    │
│ ...                                                 │  ...   │   ...   │   ...   │
└─────────────────────────────────────────────────────┴────────┴─────────┴─────────┘
```

---

# RULES

1. **Idempotent** — running the skill twice produces the same file. Never double-wrap.
2. **Step label first, then content** — the label must be the first positional argument
   to `test.step()`.
3. **Template literals for dynamic labels** — if the method has parameters, the label
   must include them via `${}` interpolation so the report shows the actual runtime value.
4. **One test.step per method** — the entire method body must be wrapped in a single
   `test.step` call at the method level. Never add individual `test.step` calls around
   statements inside the method. If a method already contains multiple inline `test.step`
   calls, remove them and replace the whole body with one method-level wrapper.
5. **Preserve existing log strings** — do not change the text passed to
   `this.actions.*` / `this.assert.*` inside the wrapped body.
6. **Import safety** — never remove existing named imports; only add `test` if missing.
7. **No logic changes** — the only structural change is the `test.step` wrapper. Do not
   reorder, rename, or alter method bodies beyond adding the wrapper and re-indenting.
8. **Indentation** — re-indent the original body by 4 spaces (one TypeScript indent
   level) inside the async callback.
9. **Return methods** — use `return test.step(...)` not `await test.step(...)` so the
   return type is correctly inferred by TypeScript.
10. **Do not chain into another skill** — this skill ends after printing the summary.
