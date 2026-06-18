# execute-and-fix-tests Skill

Runs Playwright tests, diagnoses failures by live-inspecting the app through the Playwright MCP
browser, applies targeted fixes, and re-runs until the selected scope is green.

## Usage

```
/execute-and-fix-tests                                     ← run all tests
/execute-and-fix-tests all                                 ← same as above
/execute-and-fix-tests tests/generated/Products            ← Products module only
/execute-and-fix-tests tests/generated/Products/tc-4778-verify-products-page-content.spec.ts
/execute-and-fix-tests TC-4778                             ← by TC ID (--grep)
/execute-and-fix-tests Products                            ← module name shorthand
/execute-and-fix-tests --grep "TC-477"                     ← raw grep pattern
/execute-and-fix-tests TC-4778 --jira-check                ← with Jira contradiction check
/execute-and-fix-tests Products --jira-check               ← module run + Jira check
```

## What it does

| Step | Action |
|---|---|
| 0 | Resolves the scope to a Playwright CLI command; detects `--ado-check` flag |
| 1 | Runs `npx playwright test <scope>` with list+JSON reporter |
| 2 | Parses failures — TC ID, failing method, error message, category |
| 3 | Live-inspects the real app via Playwright MCP (snapshot, screenshot, click, evaluate) |
| 3.5 | *(--jira-check only)* Fetches Jira TC steps via REST API; classifies each failure as `LOCATOR-ONLY`, `SPEC-WRONG`, or `CONTRADICTION` |
| 4 | Plans the minimal fix per failure |
| 4.5 | *(--jira-check only)* For each `CONTRADICTION`, pauses and asks the user to choose: fix spec / skip / mark fixme |
| 5 | Applies approved fixes (locator file → page class → spec, in that order) |
| 6 | Re-runs the same scope and loops until green or BLOCKED |
| 7 | Caps at 2 fix iterations; reports BLOCKED failures with next-steps |
| 8 | Prints a final summary table of results and modified files |

## Failure categories handled

| ID | Pattern | Fix target |
|---|---|---|
| LOCATOR | `TimeoutError: waiting for locator(...)` | `src/locators/<page>-page-locators.ts` |
| LOCATOR-STRICT | `strict mode violation` — multiple elements | narrow selector or add `.first()` |
| TEXT | `toHaveText` / `toContainText` mismatch | assertion string in page method |
| ASSERTION | unexpected assertion value | assertion logic in page method |
| METHOD-MISSING | `is not a function` | add method to page class |
| NAVIGATION | 404 / redirect on `goto` | URL in `src/utils/urls.ts` |
| TIMING | element visible only after async update | `waitForLoadState` in page method |
| AUTH | 401 / 403 on API calls | instruct user to run `npm run auth:setup` |
| COMPILE | TypeScript error prevents run | fix type in page class or spec |

## Key principles

> Inspect before fixing — the Playwright MCP browser is used to see the **real** DOM
> before any selector or text change is written. No guessing.
>
> When `--jira-check` is used, the Jira test case is the source of truth. If the Jira
> documented expected result contradicts what the live app shows, execution pauses and
> the user must confirm the intended fix direction before any change is written.

## Fix order

1. `src/locators/<page>-page-locators.ts` — selector/metadata update (safest)
2. `src/pages/<page>-page-self-healing.ts` — method logic, assertion text, missing methods
3. `tests/generated/<Module>/*.spec.ts` — last resort, only if the spec data is wrong
4. `src/utils/urls.ts` — if a route constant is wrong
