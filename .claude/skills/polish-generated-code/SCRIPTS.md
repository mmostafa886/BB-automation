# polish-generated-code — Script & Report Templates

Supporting templates referenced from the skill's workflow document. This file holds the
longer copy-paste blocks so the workflow document stays readable.

---

## Final Summary Report Template (Step 7)

Print this exact box after all six tasks have run, filling in the real counts and detail
rows gathered during Steps 1–6:

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ polish-generated-code — Summary                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ Task 1 — Stray Backslash Removal                                               │
│   Files scanned: <N>   Fixed: <M>   Replacements: <F>                          │
│                                                                                │
│ Task 5 — Hallucinated Helper Name Fixes                                        │
│   Pages scanned: <N>   Pages fixed: <M>   Replacements: <R>                   │
│                                                                                │
│ Task 4 — Missing Method Scaffolding                                            │
│   Pages scanned: <N>   Stubs added: <S>   Aliases added: <A>   Skipped: <K>   │
│                                                                                │
│ Task 3 — Inline Locator Extraction                                             │
│   Files scanned: <N>   Extracted: <M>   Already clean: <K>                     │
│                                                                                │
│ Task 2 — Page Method Re-arrangement                                            │
│   Files scanned: <N>   Reordered: <M>   Already ordered: <K>                   │
│                                                                                │
│ Task 6 — Unused Import Removal                                                 │
│   Files scanned: <N>   Files cleaned: <M>   Specifiers removed: <R>            │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ Missing Method Detail (Task 4)                                                 │
├──────────────────────────────────┬──────────────────────────────────┬──────────┤
│ Page                             │ Method                           │ Kind     │
├──────────────────────────────────┼──────────────────────────────────┼──────────┤
│ products-page-self-healing.ts    │ verifySearchResultsDisplayed     │ stub     │
│ products-page-self-healing.ts    │ verifyNoSearchResultsMessage...  │ alias    │
│ products-page-self-healing.ts    │ clickLotsTabOnProductDetails     │ stub     │
│ products-page-self-healing.ts    │ ensureProductsPageHasMinimum...  │ stub     │
└──────────────────────────────────┴──────────────────────────────────┴──────────┘
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ Locator Extraction Detail (Task 3)                                             │
├──────────────────────────────────┬──────────┬──────────┬──────────┬────────────┤
│ Page File                        │ Before   │ After    │ New      │ Remaining  │
├──────────────────────────────────┼──────────┼──────────┼──────────┼────────────┤
│ products-page-self-healing.ts    │ 1        │ 15       │ 14       │ 3 inline   │
│ instruments-page-self-healing.ts │ 5        │ 22       │ 17       │ 8 inline   │
└──────────────────────────────────┴──────────┴──────────┴──────────┴────────────┘
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│ Page Method Order (Task 2)                                                     │
├────────────────────────────────┬──────────┬──────────┬──────────┬─────────────┤
│ Page File                      │ Nav      │ Actions  │ Asserts  │ Combined    │
├────────────────────────────────┼──────────┼──────────┼──────────┼─────────────┤
│ products-page-self-healing.ts  │ 1        │ 4        │ 14       │ 0           │
│ login-page-self-healing.ts     │ 1        │ 1        │ 2        │ 0           │
└────────────────────────────────┴──────────┴──────────┴──────────┴─────────────┘
```

---

## Task 4 — Method Implementation Patterns

Reference bodies used when scaffolding a missing page-object method. Pick the pattern that
matches the method's classification (Navigation / Action / Assertion / Precondition /
External-integration) as determined by the Task 4 classification rules.

**Alias pattern (near-match exists):**

```typescript
/** Alias for {@link <existingMethodName>} — delegates to the existing implementation. */
async <newMethodName>(<params>): Promise<void> {
    await this.<existingMethodName>(<forwardedParams>);
}
```

**Assertion method implementation:**

```typescript
/**
 * <Description from test comment, or derived from method name>.
 * @generated-impl polish-generated-code Task 4
 */
async <methodName>(<params>): Promise<void> {
    await this.assert.toBeVisible(await this.<relevantLocator>.get(), '<human-readable step description>');
    // Add additional assertions as needed based on what the test expects.
}
```

**Action method implementation:**

```typescript
/**
 * <Description from test comment, or derived from method name>.
 * @generated-impl polish-generated-code Task 4
 */
async <methodName>(<params>): Promise<void> {
    await this.actions.click(await this.<relevantLocator>.get(), '<human-readable step description>');
}
```

**Navigation method implementation:**

```typescript
/**
 * <Description from test comment, or derived from method name>.
 * @generated-impl polish-generated-code Task 4
 */
async <methodName>(): Promise<void> {
    await this.actions.goto('<route>', '<human-readable step description>');
}
```

**Precondition / setup method implementation** (e.g. `ensureMinimumItemsExist(count)`):

```typescript
/**
 * <Description>.
 * @generated-impl polish-generated-code Task 4
 */
async <methodName>(count: number): Promise<void> {
    await this.actions.goto('<route>', 'Navigate to verify precondition');
    await this.assert.toBeVisible(await this.<itemLocator>.get(), 'Items should be visible');
    const items = await this.<itemLocator>.get();
    const actualCount = await items.count();
    await this.assert.toBeGreaterThan(actualCount, count - 1, `Page has at least ${count} items (found ${actualCount})`);
}
```

**External integration method (partial implementation)** — when the method requires API
calls or external data that cannot be inferred:

```typescript
/**
 * <Description>.
 * @generated-impl polish-generated-code Task 4
 */
async <methodName>(): Promise<void> {
    // Verify the page has loaded with valid data
    await this.assert.toBeVisible(await this.<relevantLocator>.get(), '<element> should be visible');
    const displayedValue = await (await this.<dataLocator>.get()).textContent();
    expect(displayedValue).toBeTruthy();

    // FIXME: Complete <ExternalService> API integration
    // To fully implement, add an API call and compare:
    //   const apiResponse = await this.page.request.get(`${API_URL}/endpoint`);
    //   const apiData = await apiResponse.json();
    //   await this.assert.toEqual(displayedValue, apiData.field, 'Displayed data matches API');
}
```
