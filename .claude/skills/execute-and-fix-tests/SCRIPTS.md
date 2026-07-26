# execute-and-fix-tests — Script Templates & Report Formats

Referenced from [WORKFLOW.md](WORKFLOW.md). This file holds the code templates and printed-output
formats that WORKFLOW.md links to inline — kept here so the main workflow file stays scannable.

---

## Fix Patterns (STEP 6 — Apply Fixes)

### Locator Fix Pattern

```typescript
// BEFORE (in src/locators/products-page-locators.ts)
pageContainer: {
    selector: '[data-testid="products-page"]',
    metadata: { description: 'Products page root container' },
},

// AFTER — updated to match real DOM
pageContainer: {
    selector: '[data-testid="product-list-container"]',
    metadata: {
        testId: 'product-list-container',
        description: 'Products page root container',
    },
},
```

### Text Assertion Fix Pattern

```typescript
// BEFORE (in src/pages/products-page-self-healing.ts)
async verifyPageTitle(): Promise<void> {
    await this.assert.toHaveText(await this.pageTitle.get(), 'Products', 'Page title should be "Products"');
}

// AFTER — matches actual page text
async verifyPageTitle(): Promise<void> {
    await this.assert.toHaveText(await this.pageTitle.get(), 'Product Library', 'Page title should be "Product Library"');
}
```

### Missing Method Fix Pattern

If the error is `METHOD-MISSING` (`is not a function`):
- Read the spec to understand the intended behaviour
- Inspect the page with `mcp__playwright__browser_snapshot` to find the relevant element
- Add the method to the page class following the self-healing pattern:

```typescript
async <methodName>(): Promise<void> {
    await this.assert.toBeVisible(await this.<locatorField>.get(), '<step description>');
}
```

Follow all conventions from `polish-generated-code` Task 4 (real implementations, not stubs).

### Timing Fix Pattern

```typescript
// Add before the failing assertion in the page method
await this.actions.waitForLoadState('networkidle', 'Wait for page to settle');
```

---

## test.fixme Tagging Template (STEP 8)

```typescript
// FIXME: <short failure reason> — blocked after 2 fix attempts on <YYYY-MM-DD>
// MCP observation: <one-line summary of what was seen on the page>
// Next steps: <comma-separated list from BLOCKED report>
test.fixme('TC-4778: Verify that the products page isn\'t accessible @products', async ({ selfHealingFixture: { pomSelfHealing } }) => {
```

Rules:
- Change `test(` → `test.fixme(` on the **test line only** — do not change `test.describe(`.
- Preserve the original test title, parameters, and body verbatim.
- The FIXME comment must be on the line **immediately above** `test.fixme(`.
- Never add `test.fixme` to a test that is already passing or already tagged.

---

## Report / Output Templates

### Failures Detected Table (STEP 3)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FAILURES DETECTED                                                           │
├──────────────┬──────────────────────────────┬──────────────────────────────┤
│ TC ID        │ Method                        │ Error (truncated)           │
├──────────────┼──────────────────────────────┼──────────────────────────────┤
│ TC-4778      │ productsPage.navigateTo()     │ TimeoutError: waiting for.. │
│ TC-4779      │ productsPage.verifyPageTitle()│ Expected "Products" got ""  │
└──────────────┴──────────────────────────────┴──────────────────────────────┘
```

### Jira Steps Table (STEP 3.5d)

```
Jira TC-PROJ-5764 — Steps
┌──────┬──────────────────────────────────────┬──────────────────────────────────────────┐
│ Step │ Action                               │ Expected Result                          │
├──────┼──────────────────────────────────────┼──────────────────────────────────────────┤
│  1   │ Navigate to Reaction Class page      │ Page loads without error                 │
│  2   │ Enter a duplicate class name "X"     │ Inline error "Name already used" appears │
└──────┴──────────────────────────────────────┴──────────────────────────────────────────┘
```

Record all steps as `JIRA_STEPS[TC_ID]` — a list of `{ stepNum, action, expectedResult }` objects.

### Contradiction Block (STEP 5)

```
⚠ CONTRADICTION DETECTED — TC-<ID>, Step <N>

  Jira TC Expected Result : <exact text from Jira step>
  App Actual Behavior     : <one-line MCP observation>

  This means either:
    (a) The app has a bug — the feature is not implemented or has regressed
    (b) The Jira TC is outdated — the feature was intentionally changed

  Current spec tests   : pomSelfHealing.<page>.<method>()
  Proposed spec fix    : <describe what the auto-fix would change>
```

### BLOCKED Report (STEP 8)

```
BLOCKED: TC-4778 — productsPage.navigateTo()
  Error   : TimeoutError: waiting for locator '[data-testid="product-list-container"]'
  Attempts: 2
  MCP obs : Element '[data-testid="product-list-container"]' appears in snapshot but
            test still times out — likely an auth issue or race condition.
  Fixme   : tests/generated/Products/tc-4778-....spec.ts tagged with test.fixme
  Next steps:
    1. Run `npm run auth:setup` to refresh playwright-auth.json
    2. Add `waitForLoadState('networkidle')` before the locator call
    3. Verify BASE_URL in .env matches the running environment
```

### Final Summary (STEP 9)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ execute-and-fix-tests — Final Summary                                       │
├────────────────────────────────────────────────┬────────────────────────────┤
│ Scope                                          │ <resolved scope>           │
│ Rounds                                         │ <N> fix iterations         │
├──────────────┬──────────────────────────────────┬───────────────────────────┤
│ TC ID        │ Status                           │ Fix Applied               │
├──────────────┼──────────────────────────────────┼───────────────────────────┤
│ TC-4778      │ FIXED                            │ selector updated          │
│ TC-4779      │ FIXED                            │ assertion text corrected  │
│ TC-4782      │ PASSED (no fix needed)           │ —                         │
│ TC-4783      │ FIXME (blocked — tagged)         │ test.fixme applied        │
└──────────────┴──────────────────────────────────┴───────────────────────────┘

Files modified:
  src/locators/products-page-locators.ts        (2 selector updates)
  src/pages/products-page-self-healing.ts       (1 assertion text fix)
  tests/generated/Products/tc-4783-....spec.ts  (test.fixme applied)

Run result: <X> passed  |  <Y> fixed  |  <Z> tagged test.fixme
```
