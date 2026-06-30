# testcafe-to-page

> Converts a legacy **TestCafe** JavaScript **page-object** file (a class whose methods drive
> the UI with `t.click` / `t.typeText` / `t.expect` — e.g. `FinancialDashboard.js`,
> `RevenuesPopUp.js`) into this project's **self-healing Page Object** at
> `src/pages/<page>-self-healing.ts`. Methods are migrated **1:1** — same names, same
> signatures, same order — so the rest of the migrated suite maps onto them cleanly.
> Input is a `.js` file path or pasted class code.

---

## How this differs from `create-selfhealing-page`

| | `create-selfhealing-page` | **`testcafe-to-page`** |
| --- | --- | --- |
| Input | a **locators** file | a **TestCafe page-object** (methods) |
| Methods | **auto-generated** generic `clickXxx` / `verifyXxx` | **migrated 1:1** from the legacy class |
| Names | derived from locator keys | **preserved exactly** (even `newChek`, `genaralCost`) |
| Use when | building a fresh page object | porting an existing TestCafe page object |

Use `testcafe-to-page` when you have the legacy method bodies and want them faithfully ported.

---

## What this skill does

1. Reads the TestCafe page class (every method, in order) and its matching
   `src/locators/<page>-page-locators.ts` (must already exist — run `/testcafe-to-locators` first)
2. Derives the class name / file name to match the existing page objects
3. Wires every locator-repository entry as a `readonly SelfHealingLocator` field in the constructor
4. Migrates each method 1:1, mapping TestCafe `t.*` calls to `AdvancedActionsHelper` /
   `AdvancedAssertionsHelper`
5. Builds **dynamic, argument-derived selectors** at runtime via `this.page.locator(...)`
   (these never go in the locators file)
6. Wraps every method body in a single method-level `test.step()`
7. Preserves and flags real-app quirks; type-checks; prints a summary

---

## Conversion map (method bodies)

| TestCafe | Playwright (this project) |
| --- | --- |
| `t.click(this.btn)` | `await this.actions.click(await this.btn.get(), 'Click …')` |
| `t.click(div.withExactText(v).filterVisible())` | `await this.actions.clickOption(this.page.locator('div:visible').filter({ hasText: this.exactText(v) }).first(), '…')` |
| `t.typeText(this.field, val)` | `await this.actions.fill(await this.field.get(), val, 'Fill …')` |
| `t.expect(sel.visible).ok()` | `await this.assert.toBeVisible(await this.sel.get(), '…')` |
| `t.expect(sel.innerText).contains(x)` | `await this.assert.toContainText(locator, x, '…')` |
| `.wait(ms)` | dropped (helpers auto-wait) |
| `t.maximizeWindow()` | dropped (viewport config) |

**Static** selectors → repository `SelfHealingLocator`. **Dynamic** selectors built from method
args (`'auto-financial-row-'+name+'-'+attr`) → `this.page.locator(...)` at runtime.

---

## Faithful migration rules

- **One method per legacy method**, same name + params + order — even abbreviated/misspelled names.
- **Preserve combined flows** — e.g. `deleteEntry(name, flag)` keeps its click-then-confirm/cancel branch.
- **Quirks preserved + flagged**, never silently "fixed".
- **`clickOption`** for clicks inside an open Radix dropdown/menu; **`click`** otherwise.

---

## When to use

When migrating a TestCafe suite into this Playwright project, **after** the page's locators
file exists. Run once **per** TestCafe page file:

```text
FinancialDashboard.js  (TestCafe page object)
        ↓  (prerequisite)
testcafe-to-locators        →  src/locators/financial-dashboard-locators.ts
        ↓
testcafe-to-page            ← you are here  →  src/pages/financial-dashboard-page-self-healing.ts
        ↓  (suggested next, not auto-run)
register-page-in-pom
        ↓
testcafe-to-spec / migrate-test-to-selfhealing
```

Does **not** auto-chain — you review flagged quirks first.

---

## How to invoke

```text
/testcafe-to-page src/legacy/FinancialDashboard.js
```

Or paste the TestCafe class body directly after the command.

---

## Summary output

```text
Converted: FinancialDashboard.js → src/pages/financial-dashboard-page-self-healing.ts
Class: FinancialDashboardSelfHealing
Methods migrated: 10 (1:1, names preserved)
Locators wired: 47
Dynamic (runtime page.locator) methods: 8
⚠ Quirks / reconstructed flows flagged: 2  (deleteEntry flag branch, swapped month/year dropdowns)
Type-check: PASS
Next: /register-page-in-pom
```

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [testcafe-to-locators](../testcafe-to-locators/README.md) | Prerequisite — TestCafe selectors → locator repository |
| [testcafe-to-spec](../testcafe-to-spec/README.md) | Sibling — TestCafe test file → Playwright spec |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Auto-generate a page object from a locators file (no legacy methods) |
| [register-page-in-pom](../register-page-in-pom/README.md) | Next step — wire the page object into the POM |
