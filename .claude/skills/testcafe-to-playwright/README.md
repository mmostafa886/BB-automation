# testcafe-to-playwright

> Migrates **one feature** from TestCafe to Playwright in a single command, from **two**
> legacy files — a **page-object file** (`Selector(...)` fields + `t.*` methods) and its
> **test/spec file** (`fixture("…").page(url)` + `test(...)`). It chains the three TestCafe
> conversion skills (plus POM registration as glue) to produce the four canonical layers,
> enforcing the strict split: **locators = selectors only · page = all logic · spec = calls
> only**.

---

## What this skill does

It orchestrates — it does not re-implement. In dependency order it invokes:

| Step | Skill | Input | Output |
| --- | --- | --- | --- |
| 1 | [`/testcafe-to-locators`](../testcafe-to-locators/README.md) | **page** file | `src/locators/<page>-page-locators.ts` — selectors only |
| 2 | [`/testcafe-to-page`](../testcafe-to-page/README.md) | **page** file | `src/pages/<page>-self-healing.ts` — all logic, methods 1:1 |
| 3 | [`/register-page-in-pom`](../register-page-in-pom/README.md) | (the new page object) | getter in `pom-lazy-self-healing.ts` |
| 4 | [`/testcafe-to-spec`](../testcafe-to-spec/README.md) | **spec** file | `tests/generated/<Module>/tc-<key>-<kebab>.spec.ts` — calls only |

The **page file is used twice** — Step 1 reads its `Selector(...)` fields, Step 2 reads its
methods. The **spec file** is used once, in Step 4.

---

## The layer split it enforces

```text
src/locators/<page>-page-locators.ts   →  ONLY selectors (LocatorDefinition data, no logic)
src/pages/<page>-self-healing.ts       →  ALL logic (every legacy method, 1:1, via this.actions/this.assert)
src/pages/pom-lazy-self-healing.ts     →  the lazy getter that exposes the page object
tests/generated/<Module>/tc-*.spec.ts  →  ONLY pomSelfHealing.<page>.<method>() calls
```

If anything leaks across layers (a selector in the spec, logic in the locator file), the run
flags it in the final summary.

---

## Why this order

`testcafe-to-page` (Step 2) **stops** if the locators file from Step 1 is missing.
`testcafe-to-spec` (Step 4) **verifies** the page object + its methods exist in the POM and
flags anything missing instead of inventing it. So **locators → page → register-in-pom →
spec** is the only sequence that resolves cleanly in one pass. Each step is gated: if it
fails its type-check or produces no file, the pipeline stops and surfaces the error rather
than cascading a broken file forward.

---

## How to invoke

```text
/testcafe-to-playwright src/legacy/RevenuesPopUp.js src/legacy/unitSalesRevenueTestCase.js
```

- **First** path = the page-object file, **second** path = the test/spec file.
- Optionally append a Jira/BB key or module, e.g. `… BB-3871` or `… module=Revenues`,
  forwarded to Step 4.

| Input | Behaviour |
| --- | --- |
| `<page>.js <spec>.js` | Full pipeline |
| `<page>.js <spec>.js BB-1234` | Pass the Jira/BB key to the spec |
| `status` | Show which of the 4 layers already exist; run nothing |
| `from page` / `from pom` / `from spec` | Start at Step 2 / 3 / 4 |

---

## Summary output

```text
TestCafe → Playwright Full Pipeline — Complete
  Step 1 testcafe-to-locators  ✅  src/locators/revenues-popup-page-locators.ts  (Entries: 24, selectors only)
  Step 2 testcafe-to-page      ✅  src/pages/revenues-popup-self-healing.ts      (Methods 1:1: 11, all logic)
  Step 3 register-page-in-pom  ✅  pomSelfHealing.revenuesPopup
  Step 4 testcafe-to-spec      ✅  tests/generated/Revenues/tc-bb-3871-add-unit-sales-revenue.spec.ts (calls only)
  Layer split verified: locators=selectors · page=logic · spec=calls
  ⚠ Quirks preserved: 2   ⚠ Unresolved: none
  Type-check: PASS
  Next: npm run test:module MODULE=Revenues
```

---

## Related skills

| Skill | Purpose |
| --- | --- |
| [testcafe-to-locators](../testcafe-to-locators/README.md) | Step 1 — TestCafe selectors → locator repository |
| [testcafe-to-page](../testcafe-to-page/README.md) | Step 2 — TestCafe page object → self-healing page (all logic) |
| [register-page-in-pom](../register-page-in-pom/README.md) | Step 3 — wire the page object into the POM |
| [testcafe-to-spec](../testcafe-to-spec/README.md) | Step 4 — TestCafe test → thin Playwright spec |
| [taf-full-pipeline](../taf-full-pipeline/README.md) | The sibling pipeline for migrating existing **Playwright** specs (not TestCafe) |
