# add-teststep-hooks

Wraps every public async method in one or more `*-page-self-healing.ts` files with
`test.step()` so that each page-object action and assertion appears as a labelled step in
the Playwright HTML report — mirroring the pattern established in
`reaction-class-page-self-healing.ts`.

---

## What this skill does

For each targeted page object file:

1. **Adds `test` to the `@playwright/test` import** (if not already present)
2. **Wraps every public async method body** with `await test.step('...', async () => { ... })`
3. **Derives the step label** from the existing log string passed to
   `this.actions.*` / `this.assert.*`, or falls back to a human-readable expansion of the
   method name with parameter interpolation
4. **Skips already-wrapped methods** — the operation is fully idempotent
5. **Leaves private/protected methods and the constructor untouched**

### Before

```typescript
async clickSaveButton(): Promise<void> {
    await this.actions.click(await this.saveButton.get(), 'Click Save button');
}
```

### After

```typescript
async clickSaveButton(): Promise<void> {
    await test.step('Click Save button', async () => {
        await this.actions.click(await this.saveButton.get(), 'Click Save button');
    });
}
```

### Return-value methods

```typescript
async getRowCount(): Promise<number> {
    return test.step('Get row count', async () => {
        return await (await this.tableRows.get()).count();
    });
}
```

---

## When to use

Run this skill after a page object has been created and verified, whenever you want its
method calls to appear as named steps in the Playwright HTML report.

### Pipeline position (optional post-step)

```
create-selfhealing-page
        ↓
register-page-in-pom
        ↓
[polish-generated-code]        (optional)
        ↓
add-teststep-hooks             ← you are here
```

---

## How to invoke

```
/add-teststep-hooks
```
No arguments → processes **all** `src/pages/*-page-self-healing.ts` files.

```
/add-teststep-hooks VesselConfig
```
Targets only `src/pages/vessel-type-page-self-healing.ts` (name matched
case-insensitively).

---

## Summary output

```
✔ src/pages/vessel-type-page-self-healing.ts
  Methods found      : 84
  Already wrapped    : 0
  Newly wrapped      : 84

┌─────────────────────────────────────────────────────┬────────┬─────────┬─────────┐
│ File                                                │ Found  │ Already │ Wrapped │
├─────────────────────────────────────────────────────┼────────┼─────────┼─────────┤
│ vessel-type-page-self-healing.ts                    │   84   │    0    │   84    │
└─────────────────────────────────────────────────────┴────────┴─────────┴─────────┘
```

---

## Related skills

- [create-selfhealing-page](../create-selfhealing-page/README.md) — generates page objects this skill enhances
- [polish-generated-code](../polish-generated-code/README.md) — cleans up generated code before this skill runs
- [execute-and-fix-tests](../execute-and-fix-tests/README.md) — run tests and inspect the enriched HTML report
