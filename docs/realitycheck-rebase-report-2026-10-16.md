# RealityCheck merge conflict: incident and resolution report (2026-10-16)

Branch: `test/update-test-case-metadata`, rebased onto `main` at `dc654de` (PR #26).

## Summary

- Merging `main` into the branch concatenated two independent RealityCheck implementations. Every spec stopped loading, so `npm run test:area Login` found **no tests**.
- The merge was reverted, then redone as a rebase onto `main`. The two implementations were combined, and the tests from **both** sides were run against UAT.
- Resolving it also exposed two UAT problems that were unrelated to the merge:
  - the RealityCheck test account's subscription had expired; it has been fixed;
  - CreateCompany expectations no longer match the app; this is still **open**.
- A reusable `/resolve-merge-conflicts` skill came out of this work.

---

## 1. What happened

| # | Event | Effect |
|---|---|---|
| 1 | `main` gained a RealityCheck module (PR #26) covering **wizard Step 2** | — |
| 2 | Meanwhile, the branch added its own RealityCheck module covering **wizard Step 1** (`31a206d`) | Both sides created the same files independently, an add/add conflict |
| 3 | `main` was merged into the branch (`3bb5f11`). The conflict was resolved by keeping **both** versions one after the other | Two `export class RealityCheckPageSelfHealing` in one file, two JSON documents in one file, and a duplicate registration in the POM |
| 4 | `npm run test:area Login` executed nothing | Playwright failed to load the specs (`Identifier 'RealityCheckPageSelfHealing' has already been declared`) and reported "No tests found" |
| 5 | The merge was reverted (`53e2125`, `git revert -m 1`) | Specs loaded again, but main's work was missing from the branch |
| 6 | `git pull --rebase origin main` | Stopped on `31a206d` with conflicts. The pending todo also contained the revert commit |

Why "No tests found" was misleading: every spec imports the fixture, the fixture imports the POM, and
the POM imports every page object. One broken page file therefore prevents **every** module from
loading, not just RealityCheck.

---

## 2. The conflict

| | `main` (upstream) | branch (`31a206d`) |
|---|---|---|
| Scope | Step 2: revenue, currency, price, customer count, insights | Step 1: idea length, score and hint, category, stage, country list, industry lens, Continue gate |
| Specs | `tc-BB-001…016-realitycheck.spec.ts` (16) | `tc-bb-realitycheck-step1-001…015.spec.ts` (15) |
| Locators | `reality-check-locators.ts` (53 keys) | `reality-check-page-locators.ts` (17 keys) |
| Test data | `RealityCheckInputs.json`: **array** | `RealityCheckInputs.json`: **object** |
| Tag | `@RealityCheck` | `@realitycheck` |

| File | Conflict type | Notes |
|---|---|---|
| `src/pages/reality-check-page-self-healing.ts` | add/add (5 hunks) | Two unrelated classes |
| `test-data/RealityCheckInputs.json` | add/add (whole file) | Incompatible shapes |
| `src/pages/pom-lazy-self-healing.ts` | **silent break** (no marker) | Git auto-merged both registrations: duplicate import, field, getter and report entry |

The pending rebase step `pick 53e2125 Revert "Merge branch 'main'…"` would have removed main's
Step-2 work again once replayed onto `main`.

---

## 3. Resolution

Strategy: **union**. The two sides cover different wizard steps, so both are kept.

| Layer | Change |
|---|---|
| Rebase todo | Dropped `53e2125` (the revert of the bad merge, now superseded by the rebase) |
| Locators | Merged into `src/locators/reality-check-locators.ts`; `reality-check-page-locators.ts` deleted. Equivalent keys mapped onto main's names (their selectors were identical). New keys: `countryOptions`, `ideaCharCounter`, `fieldErrors`, `minimumLengthError`, `maximumLengthError`, `stepChips` |
| Page object | Main's class is the base. Ported from the branch: `enterIdea`, `selectCategory`, `selectStage`, `openCountrySelect`, `clickContinueButton`, and the Step-1 assertions (`assertScore`, `assertHint`, `assertCountryOptions`, `assertIndustryLens*`, `assertCurrentStep`, and others) |
| Overlaps | `openRealityCheck` → `navigateToRealityCheck` (main's, which has the click retry). `selectCountry` → main's. `assertContinueBtn{Enabled,Disabled}` → `assertContinueButton{Enabled,Disabled}`, which gained an optional `failedMessage` |
| POM | One RealityCheck registration |
| Test data | Main's array stays in `RealityCheckInputs.json`. The branch's object moved to `test-data/RealityCheckStep1Inputs.json` |
| Step-1 specs | New data import, renamed methods, and the tag normalised to `@RealityCheck` |
| Step-2 test account | `realitycheck@gmail.com` → `automation-youstena@drmail.in` in all 16 rows of `RealityCheckInputs.json` (see section 4) |

Resulting history (not yet pushed):

```
1ae7871 Add the resolve-merge-conflicts skill
680fb7d Split the Dividends spec into one file per test case
84fc784 Fix the CreateCompany side-bar menu clicks and shorten the spec headers
4d1c0a8 Add the RealityCheck step-1 module as one spec per test case   ← contains the resolution
dc654de Merge pull request #26 …                                        ← main
```

Static checks on the final tree: no conflict markers, both JSON files parse, `npm run lint` passes,
and every affected spec loads.

---

## 4. Test results (UAT)

| Side | Module | Result |
|---|---|---|
| upstream | RealityCheck Step 2 (16) | ✅ 16/16, after the account switch |
| branch | RealityCheck Step 1 (15) | ✅ 15/15 |
| branch | Dividends (4) | ✅ 4/4 |
| branch | CreateCompany (20) | ⚠️ 14 passed, 5 failed, 1 skipped |
| regression | Login (6) | ✅ 6/6 |

**RealityCheck Step 2, first run: 16/16 failed.**
- Every test failed waiting for the heading "Is your idea worth your money?".
- A live check with the Playwright MCP browser showed that `realitycheck@gmail.com` lands on **"Sorry, your subscription is expired"**, so the wizard never opens.
- The heading locator was correct. The tests now use the Step-1 account, which shares the same password.

**CreateCompany: 5 failures, not caused by the merge.**
- `main` didn't touch CreateCompany, and its code is byte-identical to the pre-rebase commit.
- The failures come from UAT behaviour that no longer matches the tests:

| Test | Expected | Actual |
|---|---|---|
| 005 | 8 wizard steps | 6 |
| 017 | "Start Free Trial" button | "Proceed to checkout" |
| 018, 019, 020 | "Subscription Details" step | "Funding" |

---

## 5. Open follow-ups

1. **Push the rewritten branch.** It is 4 ahead and 4 behind `origin`, because the rebase removed the already-pushed merge and revert. Publishing needs `git push --force-with-lease`, and anyone else with the branch checked out must reset to the new history.
2. **CreateCompany.** Decide whether the app or the test account changed, then update the specs (`/execute-and-fix-tests tests/generated/CreateCompany`).
3. **`realitycheck@gmail.com`.** Renew its subscription on UAT, or retire it.
4. **Duplicate TC keys.** Main's `TC-BB-001…016` RealityCheck titles reuse keys already used by Login and other modules (the real Jira keys are in the `@jira BZNS-…` headers). Consider renaming them for unique keys.

---

## 6. Prevention

- Resolve conflicts with **`/resolve-merge-conflicts`** (`.claude/skills/resolve-merge-conflicts/`). It:
  - prints a conflict-type table with a suggested action per file;
  - flags silent breaks such as the duplicate POM registration;
  - warns about pending rebase steps that would undo upstream work;
  - lists and runs the tests affected by **each** side.
- To check a merge that already happened: `/resolve-merge-conflicts --audit <merge-sha>`.
- Never resolve an add/add conflict by keeping both blocks. Keep one copy of each declaration.
- After any merge, run `npx playwright test --list`. If it reports "No tests found", look for a spec that fails to load, not for missing tests.
- Before starting parallel work on the same page or module, agree on one locator file, one page class and one test-data shape per page.
