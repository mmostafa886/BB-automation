# add-method-to-page — Quick Reference Card

## One-Liner Template

```bash
/add-method-to-page --page <PageName> --locator "<selector>" --method "<methodName>"
```

## Common Patterns

### Pattern 1: Text Content (has-text)

```bash
/add-method-to-page \
  --page ReactionClass \
  --locator "p:has-text('Add reagent slots first')" \
  --method "verifyAddReagentSlotsFirstHintDisplayed"
```

### Pattern 2: Data Attribute

```bash
/add-method-to-page \
  --page ReactionClass \
  --locator "[data-testid='step-duration-input']" \
  --method "verifyStepDurationInputVisible" \
  --locatorName "stepDurationInput"
```

### Pattern 3: Button by Text

```bash
/add-method-to-page \
  --page Reagents \
  --locator "button:has-text('Add Reagent')" \
  --method "verifyAddReagentButtonVisible"
```

### Pattern 4: Complex Selector

```bash
/add-method-to-page \
  --page LibraryManagement \
  --locator "button[aria-label='Delete']:not([disabled])" \
  --method "verifyDeleteButtonEnabled"
```

### Pattern 5: XPath (Last Resort)

```bash
/add-method-to-page \
  --page Products \
  --locator "//table[@role='table']//tr[1]//button[normalize-space()='Edit']" \
  --method "verifyFirstRowEditButtonVisible"
```

## Parameter Cheatsheet

```
--page        Name of page (PascalCase)     →  ReactionClass, Reagents, Products
--locator     CSS/XPath selector            →  [data-testid='id'], p:has-text('text'), //xpath
--method      Method name (camelCase)       →  verifyFieldVisible, verifyErrorMessage
--description Optional human text          →  "Shown when user does X"
--locatorName Optional property name        →  Optional (auto-derived from method)
```

## What Gets Created

For each run:
- ✅ 1 locator entry added to `src/locators/<page>-page-locators.ts`
- ✅ 1 property added to `src/pages/<page>-page-self-healing.ts`
- ✅ 1 method added to `src/pages/<page>-page-self-healing.ts`

## Result in Tests

```typescript
// Use like this:
await pomSelfHealing.reactionClassPage.verifyAddReagentSlotsFirstHintDisplayed();
```

## Common Selector Recipes

| Element | Selector | Example |
|---------|----------|---------|
| By text (button/link) | `button:has-text('text')` | `button:has-text('Add')` |
| By test ID | `[data-testid='id']` | `[data-testid='submit']` |
| By aria-label | `[aria-label='label']` | `[aria-label='Close']` |
| By role + text | `[role='tab']:has-text('x')` | `[role='tab']:has-text('Details')` |
| NOT disabled | `button:not([disabled])` | `button:has-text('Save'):not([disabled])` |
| Inside parent | `div.container >> button` | `[data-testid='form'] >> button` |

## Selector Builder Tool

**CSS Selector:**
```
<tag> [ . class | # id | [attr='val'] | :not(x) | :has-text('x') ]
```

**Examples:**
- `button` → all buttons
- `button.primary` → buttons with class "primary"
- `#submit-btn` → element with id "submit-btn"
- `[data-testid='save']` → element with data-testid="save"
- `button:not([disabled])` → enabled buttons
- `p:has-text('Error')` → p with text "Error"

## Naming Conventions

✅ **DO:**
- `verifyFieldVisible` (starts with verify)
- `verifyErrorMessageDisplayed` (clear, specific)
- `stepDurationInput` (locator name is lowercase)

❌ **DON'T:**
- `checkFieldVisible` (use verify)
- `verify_field_visible` (use camelCase)
- `StepDurationInput` (locator should be camelCase)

## Troubleshooting

| Error | Fix |
|-------|-----|
| "Locators file not found" | Check `--page` parameter (should be PascalCase) |
| "Quote parsing error" | Use single quotes inside double: `"p:has-text('x')"` |
| "Already exists" | Safe to re-run; won't create duplicates |
| "Page not in POM" | Run `/register-page-in-pom` after (if new page) |

## Examples by Module

### ReactionClass
```bash
/add-method-to-page --page ReactionClass --locator "p:has-text('Add reagent slots first')" --method "verifyAddReagentSlotsFirstHintDisplayed"
/add-method-to-page --page ReactionClass --locator "[data-testid='no-protocol-steps-error']" --method "verifyNoProtocolStepsErrorDisplayed"
/add-method-to-page --page ReactionClass --locator "[data-testid='step-action-dropdown']" --method "verifyStepActionDropdownVisible"
```

### Reagents
```bash
/add-method-to-page --page Reagents --locator "button:has-text('Add Reagent')" --method "verifyAddReagentButtonVisible"
/add-method-to-page --page Reagents --locator "[data-testid='reagent-table']" --method "verifyReagentTableVisible"
```

### Projects
```bash
/add-method-to-page --page Projects --locator "button:has-text('New Project')" --method "verifyNewProjectButtonVisible"
```

### Products
```bash
/add-method-to-page --page Products --locator "[data-testid='products-list']" --method "verifyProductsListVisible"
```

## Full Syntax Reference

```bash
/add-method-to-page \
  --page ReactionClass \                          # Required: Page name (PascalCase)
  --locator "p:has-text('text')" \                # Required: CSS/XPath selector
  --method "verifyAddReagentSlotsFirstHint" \     # Required: Method name (camelCase)
  --description "Hint shown before..." \          # Optional: Human description
  --locatorName "addReagentSlotsFirstHint"        # Optional: Property name (auto-derived)
```

## After Running

1. **Files updated automatically:**
   - ✅ `src/locators/reaction-class-page-locators.ts` (new entry)
   - ✅ `src/pages/reaction-class-page-self-healing.ts` (property + method)

2. **Verify with TypeScript:**
   ```bash
   npm run build
   # or
   tsc --noEmit
   ```

3. **Use in test:**
   ```typescript
   await pomSelfHealing.reactionClassPage.verifyAddReagentSlotsFirstHintDisplayed();
   ```

4. **Run test:**
   ```bash
   npm test -- tc-xxx.spec.ts
   ```

## Self-Healing Behavior

Generated method automatically tries (in order):
1. **Primary:** Exact CSS/XPath from locator
2. **Semantic:** Playwright role/label/text strategies
3. **AI:** Live DOM inspection via Claude/Gemini

If selector breaks, test self-heals without manual fix!

## Related Skills

- `/create-selfhealing-page` — Create entire page objects
- `/register-page-in-pom` — Register page in POM
- `/create-page-locators` — Extract locators from tests

## Documentation

- Full docs: `.claude/skills/add-method-to-page-README.md`
- Summary: `.claude/skills/SKILL-SUMMARY.md`
- This card: `.claude/skills/add-method-to-page-QUICKREF.md`

---

**Print this card for quick reference!**
