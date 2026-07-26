---
name: add-method-to-page
description: Adds a new verification method to an existing self-healing page object by wiring a locator entry, property declaration, constructor initialization, and async method in one pass. Use when the user wants to add a single new verification/assertion method to an already-existing *-page-self-healing.ts file, supplying --page, --locator, and --method arguments.
---

# ROLE & PERSONA

You are a Senior QA Automation Engineer performing a targeted augmentation of an existing
self-healing page object. Your sole job is to wire one new locator and expose it as a
verification method — touching exactly the locators file and the page object file, nothing
else.

---

## EXECUTION CHECKLIST

Copy and track progress:

```
- [ ] Step 0: Resolve file paths
- [ ] Step 1: Guard against duplicates
- [ ] Step 2: Add locator entry
- [ ] Step 3: Add property declaration
- [ ] Step 4: Initialize in constructor
- [ ] Step 5: Implement verification method
- [ ] Step 6: Check POM registration
- [ ] Step 7: Print summary
```

---

# INPUTS

The user invokes this skill with named arguments:

| Argument | Required | Description | Example |
|---|---|---|---|
| `--page` | ✅ | PascalCase page name (without "PageSelfHealing") | `ReactionClass` |
| `--locator` | ✅ | CSS or XPath selector for the target element | `p:has-text('Add reagent slots first')` |
| `--method` | ✅ | camelCase name of the verification method to create | `verifyAddReagentSlotsFirstHintDisplayed` |
| `--description` | ❌ | Human-readable description used in metadata and step label | `Hint shown before adding a protocol step` |
| `--locatorName` | ❌ | camelCase property name for the locator (auto-derived from `--method` if omitted) | `addReagentSlotsFirstHint` |

**Deriving `locatorName` automatically:** strip the leading `verify` from `--method` and
lowercase the first character. E.g. `verifyAddReagentSlotsFirstHintDisplayed` →
`addReagentSlotsFirstHintDisplayed`. If the result is verbose, prefer the shorter form the
user would naturally choose — but do not guess; use the auto-derived value unless
`--locatorName` is explicitly supplied.

---

# TASK

## Step 0 — Resolve file paths

Derive the two target file paths from `--page`:

- Convert PascalCase to kebab-case: `ReactionClass` → `reaction-class`
- Locators file: `src/locators/<kebab>-page-locators.ts`
- Page object file: `src/pages/<kebab>-page-self-healing.ts`

Verify both files exist. If either is missing, abort with a clear message naming the
missing file.

## Step 1 — Guard against duplicates

Read both files. If `locatorName:` already appears in the locators file **or**
`readonly <locatorName>` already appears in the page object, print a warning and skip
the affected step rather than overwriting. Continue with any steps that are not yet done.

## Step 2 — Add locator entry

In `src/locators/<kebab>-page-locators.ts`, insert the new entry **before** the closing
`} satisfies Record<string, LocatorDefinition>;` line:

```typescript
    <locatorName>: {
        selector: '<selector>',
        metadata: {
            role: 'note',
            description: '<description>',
        },
    },
```

Use the exact `--locator` value as the selector string. Use the `--description` value (or
a sensible default derived from `--method`) as the description.

## Step 3 — Add property declaration

In `src/pages/<kebab>-page-self-healing.ts`, insert the property declaration immediately
before the line `private readonly page: Page;`:

```typescript
readonly <locatorName>: SelfHealingLocator;
```

## Step 4 — Initialize in constructor

Locate the constructor body. Find the last `this.<anything> = SelfHealingLocator.from(`
line. Insert the new initialization on the next line:

```typescript
this.<locatorName> = SelfHealingLocator.from(page, <camelCaseLocatorsVar>.<locatorName>, logger, aiProvider);
```

`<camelCaseLocatorsVar>` is the name of the imported locator object — derive it from the
locators file's export name (e.g. `reactionClassLocators`).

## Step 5 — Implement verification method

Append the new method inside the class body, immediately before the final closing `}` of
the class:

```typescript
async <methodName>(): Promise<void> {
    await test.step('<description>', async () => {
        await this.assert.toBeVisible(await this.<locatorName>.get(), '<description>');
    });
}
```

Use the `--description` value (or the auto-derived step label) for both the `test.step`
label and the assertion message.

## Step 6 — Check POM registration

Read `src/pages/pom-lazy-self-healing.ts`. If `<PageName>PageSelfHealing` is not
referenced, print:

```
⚠  <PageName>PageSelfHealing is not registered in pom-lazy-self-healing.ts.
   Run /register-page-in-pom to add it.
```

Do not modify the POM file — only report.

## Step 7 — Print summary

```
✔ add-method-to-page complete
  Locator added     : <locatorName>  →  src/locators/<kebab>-page-locators.ts
  Property declared : <locatorName>  →  src/pages/<kebab>-page-self-healing.ts
  Method created    : <methodName>() →  src/pages/<kebab>-page-self-healing.ts
  POM registered    : ✓ / ✗ (see warning above)

Usage in tests:
  await pomSelfHealing.<camelCasePage>Page.<methodName>();
```

---

# RULES

1. **Touch exactly two files** — only the locators file and the page object file. Never
   modify the POM, specs, fixtures, or any other file.
2. **Idempotent** — if any artifact already exists, warn and skip that step; never
   overwrite or duplicate.
3. **Selector verbatim** — insert the `--locator` value exactly as supplied; do not
   reformat or escape it.
4. **No emoji in generated code** — generated TypeScript must be clean; emoji are
   only permitted in the console summary.
5. **No logic beyond visibility** — the generated method calls `this.assert.toBeVisible`
   only. Do not add waits, fills, clicks, or conditional logic.
6. **One method per invocation** — this skill creates exactly one locator and one method
   per run. For multiple methods, the user re-invokes the skill.
7. **test.step label matches assertion message** — the string passed to `test.step()` and
   to `this.assert.toBeVisible()` must be identical.
8. **Property placement** — always insert the `readonly` declaration directly before
   `private readonly page: Page;`, not at the end of the file or after the private block.
9. **Preserve indentation** — match the surrounding code's indentation style (4 spaces).
10. **Do not chain into another skill** — this skill ends after printing the Step 7 summary.
