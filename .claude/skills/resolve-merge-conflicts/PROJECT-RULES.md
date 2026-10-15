# Project Rules — BB-Automation (4-layer self-healing POM)

Load in Steps 1, 4, 6 and 7 of `resolve-merge-conflicts`, but **only when
`src/pages/pom-lazy-self-healing.ts` exists**. These rules add to the generic workflow and
never replace its confirmation gates.

## Contents

1. [Extra silent-break checks](#1-extra-silent-break-checks)
2. [Layer resolution rules](#2-layer-resolution-rules)
3. [Affected-test mapping](#3-affected-test-mapping)
4. [Execution rules](#4-execution-rules)

---

## 1. Extra silent-break checks

| File | Must hold | Check |
|---|---|---|
| `src/pages/pom-lazy-self-healing.ts` | Each page has exactly one import, one `private _<x>Page?` field, one `get <x>Page()` getter, and one entry in the `getHealingReport` array | `grep -c "<PageClass>" src/pages/pom-lazy-self-healing.ts` gives 1 import line, 1 field and 1 getter; the report array has no duplicate `this._<x>Page` |
| `config/testCaseFilter.ts` | No duplicate module keys and no duplicate TC keys inside a module | Read the file and compare the keys |
| `src/locators/*.ts` | Exactly one locator file per page object, so two files for the same page means both sides created one | The page object imports exactly one locator file |
| `tests/generated/<Module>/` | No two spec files with the same `TC-<Key>` title key | `grep -rhoE "TC-[A-Za-z0-9-]+:" tests/generated/<Module> \| sort \| uniq -d` |

`conflict-report.ts` already catches the duplicate import, field and getter generically. The
duplicate report-array entry and the cross-file checks above have to be done by hand.

---

## 2. Layer resolution rules

Apply in this order: locators → page object → POM → test data → specs, so that each layer
compiles against the one beneath it.

**Locators (`src/locators/<page>-page-locators.ts`)**
- One file per page. Merge into the file that the surviving page object imports, and `git rm` the other.
- Map equivalent selectors to one key, keeping the more specific selector (prefer `data-automation-test` attributes), and rename that key's uses in the page object.
- The file holds pure selector data: no logic, no imports.

**Page object (`src/pages/<page>-page-self-healing.ts`)**
- One class extending `SelfHealingPageBase`. Never two classes in one file.
- Start from the side with more methods or more robust implementations (retries, waits), then port the other side's methods.
- Overlapping methods: keep one name, add the other side's extra parameters as optional (for example `failedMessage?: string`), and update the specs on both sides.
- Keep actions grouped before assertions, and keep one `test.step()` per public method.

**POM (`src/pages/pom-lazy-self-healing.ts`)**
- One import, field, getter and report entry per page, following the `/register-page-in-pom` conventions. Delete the duplicates rather than merging them.

**Test data (`test-data/*.json`)**
- Same shape: merge entries.
- Different shapes (one side indexes an array, the other reads named keys): **split**. Keep upstream's file at the original path, write the other side's as `test-data/<Name><Scope>Inputs.json`, and update the import in that side's specs.

**Specs (`tests/generated/<Module>/tc-*.spec.ts`)**
- Keep both sides' files. Apply any page-object method renames.
- Normalise tags to the upstream convention (for example `@RealityCheck` rather than `@realitycheck`).
- Specs import only from `tests/fixtures/self-healing-fixture`, and credentials come from test data.

**Config (`config/testCaseFilter.ts`)**
- Take the union of modules and TC keys.

---

## 3. Affected-test mapping

`affected-tests.ts` detects this project and applies the following mapping **before** the import
graph. The generic import graph alone would mark every spec as affected, because every spec
imports the fixture and the fixture imports the POM, which imports every page.

| Changed file | Affected specs |
|---|---|
| `src/pages/<page>-self-healing.ts` | Specs that reference its POM getter (`pomSelfHealing.<getter>`) |
| `src/locators/<x>.ts` | The page object(s) importing it, then the specs using their getters |
| `test-data/<x>.json` | Specs that import it (through the import graph) |
| `src/pages/pom-lazy-self-healing.ts` | None by itself, because registration-only changes are mapped through the page files |
| `tests/fixtures/**`, `src/utils/**`, `src/pages/self-healing-page-base.ts` | **Wide impact** (all specs): confirm before a full run |
| `tests/generated/**/*.spec.ts` | Itself |

---

## 4. Execution rules

- Specs that use the `seededForecast` fixture in code (not just in a comment) need the seed bracket:

  ```bash
  npm run seed:forecast && npx playwright test <paths>; npm run seed:forecast:delete
  ```

  `affected-tests.ts` flags these folders with `⚑ needs seed bracket`.
- `tests/generated/Personnel` seeds and tears down its own forecast, so it needs no bracket.
- Run everything else with plain `npx playwright test <folders>`.
- Hand failures to `/execute-and-fix-tests <paths>` (live inspection and fix) or `/analyze-trace` (trace root cause).
- Auth or UAT availability failures (login timeouts, 401s) are environmental. Report them, but don't treat them as merge defects.
