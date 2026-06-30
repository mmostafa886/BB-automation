# testcafe-to-spec

> Converts a legacy **TestCafe** test/fixture file (a `fixture("…").page(url)` module with one
> or more `test(...)` blocks — including data-driven `data.forEach(input => test(...))` loops,
> e.g. `unitSalesRevenueTestCase.js`) into this project's **Playwright TypeScript spec** under
> `tests/generated/<Module>/tc-<key>-<kebab>.spec.ts`. The spec is **thin** — only
> `pomSelfHealing.<page>.<method>()` calls, no selectors. Input is a `.js` file path or pasted
> test code.

---

## What this skill does

1. Reads the TestCafe test: fixture name (→ **Module**), `.page()` URL, data-driven loop +
   the `test-data` JSON it uses, imported page objects, and the ordered step sequence
2. Maps every TestCafe step to a `pomSelfHealing.<page>.<method>()` call and **verifies the
   target exists** in `src/pages/` + `pom-lazy-self-healing.ts`
3. Flags any **missing** page-object methods (defer to `/testcafe-to-page`) instead of inventing
   selectors in the spec
4. Writes the spec: fixture import, data import, JSDoc header, data-driven loop, thin body
5. Creates an empty `[]` data-file placeholder if the referenced JSON is missing (no fabricated
   values, unless you ask)
6. Type-checks and prints a summary listing any unresolved dependencies

---

## The project's spec rules (enforced)

- **Import `test, expect` from `../../fixtures/self-healing-fixture`** — never `@playwright/test`.
- **No raw selectors, no `t.*`/`page.*`, no `expect(locator)`, no `test.step()`** in the spec —
  all UI logic lives in page objects; steps are auto-tracked in the helpers.
- **Data from `test-data/*.json`**, never hardcoded; the data-driven loop is preserved.
- **Title/file key match**: `TC-<Key>: <Title> @tags` ↔ `tc-<key>-<kebab>.spec.ts`.

---

## Conversion map (test body)

| TestCafe | Playwright (this project) |
| --- | --- |
| `fixture('revenues').page(url)` | folder `tests/generated/Revenues/`; URL dropped (config + `navigateToLogin()`) |
| `data.forEach(input => test(input.test, …))` | `for (const input of data) { test(\`TC-…: ${input.test} @tags\`, async ({ selfHealingFixture: { pomSelfHealing } }) => {…}) }` |
| `t.click(loginPage.loginPopUp)` | `await pomSelfHealing.loginPage.openSignInModal()` |
| `t.typeText(loginPage.email, input.mail)` | folded into `…fillAndSubmitSignInForm(input.mail, input.password)` |
| `t.expect(x.visible).ok()` | the page object's `assert…` / `navigateTo…` method |
| `await po.method(a,b)` | `await pomSelfHealing.<page>.method(a, b)` |
| `.wait(1000)` / `t.maximizeWindow()` | dropped |
| inline `Selector(...)` in the test | **not allowed** — must be a page-object method (flagged if missing) |

---

## Handling missing page objects

A spec can only call methods that exist. When the TestCafe test relies on a page object that
hasn't been migrated yet, this skill **does not invent** its body — it lists the gap and points
you to `/testcafe-to-page`:

```text
unitSalesRevenueTestCase.js
        ↓
testcafe-to-spec  ← you are here
        ⚠ needs: RevenuesSelfHealing.openAddRevenue, RevenuePopupSelfHealing.addUnitSalesRevenue
        ↓
testcafe-to-page  (convert the legacy Revenues / revenue-popup page objects)
        ↓
register-page-in-pom
        ↓
re-run testcafe-to-spec  → spec compiles & runs
```

---

## When to use

When migrating a TestCafe suite into this Playwright project — run once **per** TestCafe test
file, ideally **after** its page objects exist (`/testcafe-to-locators` → `/testcafe-to-page` →
`/register-page-in-pom`).

---

## How to invoke

```text
/testcafe-to-spec src/legacy/unitSalesRevenueTestCase.js
```

Or paste the TestCafe test body directly after the command.

---

## Summary output

```text
Converted: unitSalesRevenueTestCase.js → tests/generated/Revenues/tc-bb-add-unit-sales-revenue.spec.ts
Module: Revenues   |   Data-driven: yes (test-data/revenues.json)
Steps mapped: 12
⚠ Unresolved page-object methods (run /testcafe-to-page first): RevenuesSelfHealing.openAddRevenue, RevenuePopupSelfHealing.addUnitSalesRevenue
⚠ Data file: created empty placeholder test-data/revenues.json — populate before running
Type-check: PASS
```

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [testcafe-to-locators](../testcafe-to-locators/README.md) | TestCafe selectors → locator repository |
| [testcafe-to-page](../testcafe-to-page/README.md) | Prerequisite — TestCafe page object → self-healing page (provides the methods this spec calls) |
| [register-page-in-pom](../register-page-in-pom/README.md) | Wire page objects into the POM so the spec can reach them |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Same target shape, but from existing **Playwright** specs |
