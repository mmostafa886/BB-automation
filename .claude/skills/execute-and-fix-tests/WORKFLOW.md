# execute-and-fix-tests — Full Workflow

Full step-by-step detail for the `execute-and-fix-tests` skill. Loaded on demand from
[SKILL.md](SKILL.md). Code templates and printed-output formats referenced below live in
[SCRIPTS.md](SCRIPTS.md).

---

## ARCHITECTURE CONTEXT

### Test Runner
- Command: `npx playwright test`
- Config: `playwright.config.ts` — `testDir: './tests/generated'`, `baseURL` from `BASE_URL` env
- Auth: `playwright-auth.json` produced by `src/scripts/global-setup.ts`
- Reports: `test-results/` (traces), `playwright-report/` (HTML)

### Source Layout
```
src/
  locators/          *-page-locators.ts          — LocatorDefinition records
  pages/             *-page-self-healing.ts       — SelfHealingPageBase subclasses
  utils/             self-healing-locator.ts      — 3-phase healing (primary→semantic→AI)
tests/
  generated/
    <Module>/        *.spec.ts                    — migrated specs
  fixtures/          self-healing-fixture.ts      — pomSelfHealing fixture
```

### Failure Categories

| ID | Pattern | Primary Fix Target |
|---|---|---|
| LOCATOR | `TimeoutError: waiting for locator(...)` | `src/locators/<page>-page-locators.ts` |
| LOCATOR-STRICT | `strict mode violation: resolved to N elements` | selector — add `.first()` or narrow |
| TEXT | `toHaveText` / `toContainText` mismatch | expected string in page method |
| ASSERTION | `expect(...)` received unexpected value | assertion logic in page method |
| METHOD-MISSING | `TypeError: pomSelfHealing.<x>.<y> is not a function` | add method to page class |
| NAVIGATION | `page.goto` 404 / redirect / auth | URL constant in `src/utils/urls.ts` |
| TIMING | element visible only after async update | add `waitForLoadState` / increase timeout |
| AUTH | 401 / 403 on requests inside test | re-run `npm run auth:setup` |
| COMPILE | TypeScript type error prevents test from running | fix type in page class or spec |
| UNKNOWN | Crash with no clear pattern | inspect trace + live page |

---

## INPUTS

The user will provide one of:

| Input | Meaning |
|---|---|
| *(none)* | Run all tests: `npx playwright test` |
| `all` | Same as no input |
| A folder path (e.g. `tests/generated/Products`) | Scoped run for that folder |
| A single spec file (e.g. `tests/generated/Products/tc-4778-*.spec.ts`) | Single spec |
| A TC ID (e.g. `TC-4778`) | Grep by ID: `--grep "TC-4778"` |
| A module name (e.g. `Products`) | Folder: `tests/generated/Products` |
| `--grep <pattern>` | Pass grep directly to Playwright |
| `--jira-check` (append to any scope) | Fetch Jira TC steps and run contradiction detection before fixing |

---

## STEP-BY-STEP PROCESS

### STEP 0 — Read Environment Configuration

Before doing anything else, read the `.env` file in the project root:

```bash
cat .env
```

Extract and record these values for use throughout the skill:

#### BASE_URL
The `playwright.config.ts` resolves `baseURL` from `process.env.BASE_URL`.
If `BASE_URL` is not explicitly set in `.env`, derive it from the `ENV` variable:

| `ENV` value | Derived BASE_URL |
|---|---|
| `test` | value mapped in `playwright.config.ts` or `src/utils/urls.ts` |
| `staging` | staging variant of the same URL |
| *(not set)* | `http://localhost:3000` (Playwright config default) |

Use this URL as the base for all `mcp__playwright__browser_navigate` calls.

#### Active AI Provider
Scan `.env` for the first **uncommented, non-empty** API key line:

| Variable | Provider |
|---|---|
| `ANTHROPIC_API_KEY=<value>` | Anthropic (Claude) |
| `OPENAI_API_KEY=<value>` | OpenAI |
| `GEMINI_API_KEY=<value>` | Google Gemini |

The active provider is the one whose key is set and not commented out (no leading `#`).
Record it — e.g. `Active AI provider: Gemini (GEMINI_MODEL=gemini-2.5-flash)`.
This is purely informational context; the self-healing locator reads it at runtime automatically.

Print a config summary before proceeding:
```
Environment : <ENV value>
BASE_URL    : <resolved URL>
AI Provider : <provider name> (<model>)
APP_IN_OPERATION : <true|false>
```

---

### STEP 1 — Resolve Scope

Determine the Playwright CLI arguments from the user input:

| User Input | CLI Args |
|---|---|
| none / `all` | *(no extra args)* |
| folder path | `tests/generated/Products` |
| spec file path | `tests/generated/Products/tc-4778-....spec.ts` |
| TC ID `TC-NNNN` | `--grep "TC-NNNN"` |
| module name | `tests/generated/<Module>` |
| `--grep <pattern>` | `--grep "<pattern>"` |

#### `--jira-check` flag detection

Scan the raw user input for the literal string `--jira-check`:

- If **present**: set `JIRA_CHECK=true`, strip `--jira-check` from the Playwright CLI arguments
  before running any test command.
- If **absent**: set `JIRA_CHECK=false`. All Jira-related steps (STEP 3.5, STEP 5.5) are skipped
  entirely — the skill behaves exactly as it did before this flag existed.

Print the resolved command and Jira check status before running:

```
Resolved command : npx playwright test <scope_args>
Jira check       : enabled | disabled
```

---

### STEP 2 — Initial Test Run

Run the tests with all three reporters enabled. Use `CI=true` to suppress all interactive
prompts (Playwright's "Press Enter to view report", browser install confirmations, etc.):

```bash
CI=true PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/report.json \
  npx playwright test <scope_args> \
  --reporter=list,html,json 2>&1 | tee test-results/run-output.txt
```

**Report output locations:**

| Report | Path | Purpose |
|---|---|---|
| HTML | `playwright-report/index.html` | Visual report — open in browser |
| JSON | `test-results/report.json` | Machine-readable — CI/CD artifact |
| Console log | `test-results/run-output.txt` | Raw stdout capture |

After the run, print the report paths so the user can open them:
```
Reports generated:
  HTML : playwright-report/index.html   (open with: npx playwright show-report)
  JSON : test-results/report.json
  Log  : test-results/run-output.txt
```

If the run exits cleanly with 0 failures → print the green summary with report paths and stop.

If there are failures → continue to STEP 3.

---

### STEP 3 — Parse Failures

From the test output, extract for each failing test:

1. **Test title** — the full `test.describe` + `test()` title string
2. **Spec file path** — relative path to the `.spec.ts` file
3. **Failing step** — the last step that errored (from the list reporter indented output)
4. **Error message** — exact text of the error (timeout, assertion, type error, etc.)
5. **Page object call** — the `pomSelfHealing.<page>.<method>()` line that failed

Build a table using the format in
→ [SCRIPTS.md#failures-detected-table-step-3](SCRIPTS.md#failures-detected-table-step-3)

Classify each failure using the failure catalog above.

---

### STEP 3.5 — Fetch Jira Test Case Documentation *(skip entirely if `JIRA_CHECK=false`)*

For each unique TC ID discovered in STEP 3, fetch its documented steps from Jira.
This provides the **ground truth** for what the test is supposed to verify.

#### 3.5a — Read Jira credentials from `.env`

Extract these four values (already read in STEP 0):
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`

If any of these values is missing or empty, print a warning and skip to STEP 4 — treat all
failures as `LOCATOR-ONLY` / `SPEC-WRONG` (no contradiction check possible without Jira data).

#### 3.5b — Extract TC key from spec filename

The spec filename encodes the Jira issue key: `tc-<KEY>-<description>.spec.ts`

```bash
# Example: tc-PROJ-5764-invalid-creating-reaction-class-with-duplicate-name.spec.ts → PROJ-5764
TC_ID=$(basename "<spec_file>" | sed 's/^tc-//' | grep -oP '^[A-Z]+-\d+')
```

#### 3.5c — Fetch the issue via Jira REST API

```bash
curl -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  "${JIRA_BASE_URL}/rest/api/3/issue/${TC_ID}" \
  -H "Accept: application/json"
```

#### 3.5d — Parse the steps

The field `fields["description"]` (Atlassian Document Format) and any custom test-steps field
contain the test actions and expected results. Parse each step paragraph to extract the
**Action** and **Expected Result**. Strip ADF/HTML markup from both strings.

Build and print a steps table per TC using the format in
→ [SCRIPTS.md#jira-steps-table-step-35d](SCRIPTS.md#jira-steps-table-step-35d)

Record all steps as `JIRA_STEPS[TC_ID]` — a list of `{ stepNum, action, expectedResult }`
objects — for use in STEP 5.

If the API call fails (non-200, network error, JSON parse error):
- Print: `⚠ Jira fetch failed for TC-<ID>: <error>. Skipping contradiction check for this TC.`
- Continue to STEP 4 without Jira ground truth for that TC.

---

### STEP 4 — Live Inspection with Playwright MCP

For each unique failing **page + element** combination, use the Playwright MCP browser to
live-inspect the real application. This is mandatory before applying any locator or text fix.

#### 4a — Navigate to the relevant page

Use the `BASE_URL` resolved in STEP 0:

```
mcp__playwright__browser_navigate(url = BASE_URL + <route>)
```

Determine the route from:
- The `navigateTo()` method body in `src/pages/<page>-page-self-healing.ts`
- The `APP_URLS` map in `src/utils/urls.ts`
- The test spec's step comments

#### 4b — Take a snapshot to see the current DOM

```
mcp__playwright__browser_snapshot()
```

Read the accessibility tree / DOM snapshot to understand:
- What elements actually exist on the page
- Their roles, labels, text content, and `data-testid` attributes
- Whether the expected element is missing, has different text, or is in a different location

#### 4c — Confirm the correct selector

For LOCATOR failures: find the element in the snapshot and note:
- Its `data-testid` attribute (preferred)
- Its `role` and accessible `name`
- Its CSS class or structural path (fallback)

For TEXT failures: read the actual displayed text from the snapshot.

For NAVIGATION failures: check what URL was loaded and whether auth is required.

#### 4d — Interact when needed

If the element only appears after user interaction (e.g. clicking a menu, filling a search),
simulate those interactions using MCP before taking the final snapshot:

```
mcp__playwright__browser_click(selector = '<trigger element>')
mcp__playwright__browser_snapshot()
```

#### 4e — Screenshot for visual confirmation

```
mcp__playwright__browser_take_screenshot()
```

Use this to visually confirm the state of the page when the DOM snapshot is ambiguous.

---

### STEP 5 — Classify and Plan Fixes

After inspection, for each failure produce a fix plan:

```
TC-4778  LOCATOR  →  selector '[data-testid="products-page"]' not found
         MCP found: <div data-testid="product-list-container">
         Fix: update productsLocators.pageContainer.selector in src/locators/products-page-locators.ts

TC-4779  TEXT     →  expected "Products" but page shows "Product Library"
         Fix: update verifyPageTitle() assertion string in src/pages/products-page-self-healing.ts
```

Group fixes by target file to minimise edits.

#### Contradiction Detection *(only when `JIRA_CHECK=true` and `JIRA_STEPS` is populated)*

After building the initial fix plan, cross-reference each failure against `JIRA_STEPS[TC_ID]`
to classify it into one of three categories:

| Category | Condition | Action |
|---|---|---|
| `LOCATOR-ONLY` | Selector mismatch only; Jira expected result matches what app actually shows | Auto-fix |
| `SPEC-WRONG` | App behaviour matches Jira expected result; spec tests wrong text / logic | Auto-fix |
| `CONTRADICTION` | Jira expected result says X; MCP observation shows app does Y | **Pause → STEP 5.5** |

**Decision logic for each failure:**

1. Find the Jira TC step whose **Action** corresponds to the failing spec step (match by
   keywords, e.g. "enter duplicate name" ↔ method `verifyDuplicateNameError`).
2. Read that step's **Expected Result** from `JIRA_STEPS[TC_ID]`.
3. Compare it against the MCP observation from STEP 4.
4. If Jira expected result ≈ app actual → no contradiction → classify as `LOCATOR-ONLY` or
   `SPEC-WRONG` and proceed to STEP 6.
5. If Jira expected result ≠ app actual → `CONTRADICTION` → print the contradiction block
   (format in → [SCRIPTS.md#contradiction-block-step-5](SCRIPTS.md#contradiction-block-step-5))
   and proceed to STEP 5.5 before touching any files.

If a TC has no `JIRA_STEPS` entry (fetch failed or JIRA_CHECK=false), classify it as
`LOCATOR-ONLY` / `SPEC-WRONG` — proceed without a contradiction check.

---

### STEP 5.5 — User Confirmation for Contradictions *(only when `JIRA_CHECK=true`)*

For each `CONTRADICTION` failure, use `AskUserQuestion` to let the user decide how to proceed.

Batch all contradictions within the **same TC** into a single question. Ask one question
per TC (not per step) — list each contradicting step in the question body.

**Question structure:**

- **Question text:** `"TC-<ID>: Jira documented behavior contradicts the live app — how should we proceed?"`
- **Option 1 — Fix spec to match app:** Update the spec / page-object assertion to reflect
  what the app currently does. The automated fix from STEP 5 is applied.
- **Option 2 — Skip / investigate app bug:** Do NOT modify the spec. Add a
  `// TODO: Jira TC-<ID> Step <N>: app may have a bug — expected "<Jira result>" but app shows "<actual>"` comment
  on the failing assertion line only. No logic changes.
- **Option 3 — Mark test.fixme:** Apply `test.fixme` to the test with a CONTRADICTION reason
  (same tagging rules as STEP 8, but reason = `Jira contradiction`). No logic changes.

After the user answers:
- **Fix spec to match app** → proceed to STEP 6, apply the fix normally.
- **Skip** → add the TODO comment, exclude this TC from STEP 6 fixes, continue to next TC.
- **Mark test.fixme** → apply `test.fixme` tagging now, exclude from STEP 6 fixes.

---

### STEP 6 — Apply Fixes

> **Gate (when `JIRA_CHECK=true`):** Apply only fixes classified as `LOCATOR-ONLY`,
> `SPEC-WRONG`, or `CONTRADICTION` where the user chose **"Fix spec to match app"** in
> STEP 5.5. Never apply a code change to a `CONTRADICTION` case where the user chose
> **Skip** or **Mark test.fixme** — those are handled in STEP 5.5 itself.

Apply fixes in this priority order:

#### Fix Priority

1. **Locator file first** (`src/locators/<page>-page-locators.ts`)
   — Updating the `selector` field is the safest, most targeted change.
   — Also update `metadata` fields (role, name, testId, description) to match reality.

2. **Page class methods** (`src/pages/<page>-page-self-healing.ts`)
   — Fix assertion strings, navigation routes, missing methods, timing issues.
   — Never change method signatures unless the calling spec is also updated.

3. **Spec files** (`tests/generated/<Module>/*.spec.ts`)
   — Fix only if the spec itself has the wrong expectation (e.g. wrong TC data).
   — This is the last resort; prefer fixing the page object.

4. **URLs file** (`src/utils/urls.ts`)
   — Fix if a route constant is wrong.

Fix templates (Locator, Text Assertion, Missing Method, Timing) are in
→ [SCRIPTS.md#fix-patterns-step-6--apply-fixes](SCRIPTS.md#fix-patterns-step-6--apply-fixes)

---

### STEP 7 — Re-run the Tests

After applying fixes, re-run the same scope. This is **fix iteration 1** (or 2 on the second
pass). The total allowed executions across the whole session are:

```
Execution 1 — initial run          (STEP 2)
Execution 2 — after first fix pass (STEP 7, iteration 1)
Execution 3 — after second fix pass (STEP 7, iteration 2)  ← FINAL
```

```bash
CI=true PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/report.json \
  npx playwright test <scope_args> \
  --reporter=list,html,json 2>&1 | tee test-results/run-output.txt
```

`CI=true` suppresses Playwright's interactive "Press Enter to open HTML report" prompt that
would otherwise block execution waiting for keyboard input.

Reports are overwritten on each run — always reflect the latest execution.

If new failures appear that were not in the previous run, treat them as newly discovered failures
and apply the same inspection → fix loop within the remaining iteration budget.

If the same failure persists after a fix attempt:
1. Re-inspect with MCP — do not guess without looking again.
2. Check browser console for JS errors: `mcp__playwright__browser_console_messages()`
3. Check network requests: `mcp__playwright__browser_network_requests()`

---

### STEP 8 — Iteration Cap, Fixme Tagging, and Blocking

**Maximum total executions: 3** (1 initial run + 2 fix iterations).
**Maximum fix attempts per individual failure: 2** (once per fix iteration).

After the 3rd execution, any still-failing test is marked with `test.fixme` in its spec file
and reported as BLOCKED. Do NOT apply further speculative changes.

#### Applying `test.fixme`

For each unresolved failure, open the corresponding `.spec.ts` file and change the `test(`
call to `test.fixme(`, adding a comment on the line above that records the failure reason
and the date. Template and rules are in
→ [SCRIPTS.md#testfixme-tagging-template-step-8](SCRIPTS.md#testfixme-tagging-template-step-8)

BLOCKED report format (printed after tagging) is in
→ [SCRIPTS.md#blocked-report-step-8](SCRIPTS.md#blocked-report-step-8)

---

### STEP 9 — Final Summary

Print a final summary table using the format in
→ [SCRIPTS.md#final-summary-step-9](SCRIPTS.md#final-summary-step-9)

---

## MCP TOOL REFERENCE

| Tool | When to use |
|---|---|
| `mcp__playwright__browser_navigate` | Go to a page URL |
| `mcp__playwright__browser_snapshot` | Get DOM accessibility tree snapshot |
| `mcp__playwright__browser_take_screenshot` | Visual confirmation of page state |
| `mcp__playwright__browser_click` | Trigger menus, dialogs, or dynamic content |
| `mcp__playwright__browser_fill_form` | Fill search fields or forms to reveal content |
| `mcp__playwright__browser_evaluate` | Run JS in the page context (e.g. `document.querySelector(...)`) |
| `mcp__playwright__browser_console_messages` | Read browser console errors/warnings |
| `mcp__playwright__browser_network_requests` | Inspect API calls and responses |
| `mcp__playwright__browser_wait_for` | Wait for a selector or network idle |

---

## RULES

1. **Inspect before fixing** — never change a selector without first confirming the correct
   value via MCP snapshot or screenshot. Guessing selectors creates more failures.
2. **Minimal changes** — fix only what the MCP inspection confirms is wrong. Do not
   refactor surrounding code, rename methods, or change logic unrelated to the failure.
3. **Read before editing** — always read the current file content before applying any edit.
4. **One failure, one fix** — fix each failure individually with its own targeted change.
   Do not combine speculative fixes for multiple failures into one edit.
5. **Re-run after every batch** — after fixing a batch of same-type failures (e.g. all
   LOCATOR failures on the same page), re-run before tackling the next category.
6. **Never change method signatures** without also updating every call site.
7. **Never delete test steps or comments** — test specs are documentation.
8. **Auth failures are not code bugs** — if auth fails, instruct the user to run
   `npm run auth:setup` rather than modifying test code.
9. **Tag BLOCKED tests with `test.fixme`** — after 2 fix attempts (3 total executions), apply
   `test.fixme` to the failing test in its spec file with a FIXME comment recording the reason,
   date, and next steps. Do not apply a 3rd speculative fix.
10. **Preserve self-healing architecture** — all locator changes go into the locator file
    (`src/locators/`), not inline into method bodies. Keep every selector change within
    the `LocatorDefinition` record so the 3-phase healing pipeline still applies.
11. **Jira TC is the source of truth for intended behavior (when `--jira-check` is used).**
    Before fixing any failing assertion or test logic, fetch the Jira issue steps and
    compare the documented expected result against what the live app shows. If they conflict,
    always ask the user before applying any change. A test that checks for a feature the app
    doesn't implement may be catching a real regression — not an automation error.
