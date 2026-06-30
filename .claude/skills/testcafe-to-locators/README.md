# testcafe-to-locators

> Converts a legacy **TestCafe** JavaScript page/selector file (a class of `Selector(...)`
> properties — e.g. `RevenuesPopUp.js`) into a project-format TypeScript **locator
> repository** at `src/locators/<page>-page-locators.ts`. Every TestCafe selector chain
> becomes one `LocatorDefinition`, enriched with semantic metadata for self-healing.
> Input is a `.js` file path or pasted class code.

---

## What this skill does

1. Reads the TestCafe class and lists every `this.<prop> = Selector(...)` line **in order**
2. Derives the output file name (`<kebab-page>-page-locators.ts`) and `export const`
3. Converts each selector chain to a `LocatorDefinition` (string when clean, `(page) => Locator`
   factory when needed)
4. Enriches entries with `role` / `name` / `placeholder` / `text` and a mandatory `description`
5. **Preserves and flags** source quirks (wrong attribute names, `undefined-*` values, odd tags)
   instead of silently fixing them
6. Appends to the file if it already exists; creates it otherwise
7. Type-checks the new file and prints a conversion summary

---

## Conversion map

| TestCafe chain | Playwright `selector` | Extra metadata |
| --- | --- | --- |
| `Selector('#id'/'.cls'/'tag')` | same string | — |
| `.withAttribute('data-automation-test','X')` | `'tag[data-automation-test="X"]'` | — |
| `.withAttribute('placeholder','X')` | `'tag[placeholder="X"]'` | `placeholder: 'X'` |
| `.withAttribute('aria-label','X')` | `'tag[aria-label="X"]'` | `name: 'X'` |
| `.withText('X')` | `(page) => page.getByText('X')` | `text: 'X'` |
| `.withExactText('X')` | `(page) => page.getByText('X', { exact: true })` | `text: 'X'` |
| `.filterVisible()` | append `:visible` to the CSS string | — |
| `.nth(n)` | `(page) => page.locator('<css>').nth(n)` | — |
| `.parent()/.find()/.sibling()` | `(page) => page.locator(...).locator(...)` or XPath | — |

**Default to a clean string selector; use a factory only when the chain has no clean CSS
equivalent** (index, exact/substring text, parent/child traversal, or `filterVisible + nth`).

---

## Quirk handling (faithful conversion)

The skill **never silently corrects** a buggy TestCafe selector. It converts it verbatim and
adds a `// NOTE: … — preserved verbatim. Verify on the live app.` comment. Real cases from
this project:

- `.withAttribute('app-white-panel', …)` (wrong attribute name) → kept as-is
- `.withAttribute('data-automation-test','undefined-switch')` (literal `undefined-*`) → kept as-is
- A growth switch on `<input>` where siblings use `<div>` → tag kept as-is

This surfaces app/test bugs to the engineer instead of hiding them.

---

## When to use

When migrating a TestCafe suite into this Playwright project. Run it once **per** TestCafe
page file. It slots in just before `create-selfhealing-page`:

```text
RevenuesPopUp.js  (TestCafe)
        ↓
testcafe-to-locators          ← you are here (one file at a time)
        ↓  (suggested next, not auto-run)
create-selfhealing-page       (locators file → page object class)
        ↓
register-page-in-pom
        ↓
migrate-test-to-selfhealing
```

Unlike `create-page-locators` (which scans existing **Playwright** specs), this skill takes
**TestCafe** source as input and does **not** auto-chain — you review the flagged quirks first.

---

## How to invoke

```text
/testcafe-to-locators src/legacy/RevenuesPopUp.js
```

Or paste the TestCafe class body directly after the command.

---

## Output structure

```typescript
import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for <PageName>SelfHealing — <purpose>.
 * Converted from the legacy TestCafe page object `<SourceFile>.js`.
 */
export const <camelCasePage>Locators = {

    // ─── <Group> ───────────────────────────────────────────────
    <name>: {
        selector: 'tag[data-automation-test="X"]',   // or (page) => page.getByText('Y', { exact: true })
        metadata: {
            description: '<specific plain-English description>',
        },
    },

} satisfies Record<string, LocatorDefinition>;
```

---

## Summary output

```text
Converted: RevenuesPopUp.js → src/locators/revenues-popup-page-locators.ts
Export const: revenuesPopUpLocators
Entries: 92 (string: 81, factory: 11)
⚠ Quirks preserved & flagged: 5  (commision, commissionGrowth*, rateGrowthSwitch …)
Type-check: PASS
```

---

## Related skills

| Skill | Purpose |
| ----- | ------- |
| [create-page-locators](../create-page-locators/README.md) | Same output, but from existing **Playwright** specs |
| [create-selfhealing-page](../create-selfhealing-page/README.md) | Next step — locators file → page object class |
| [register-page-in-pom](../register-page-in-pom/README.md) | Wire the new page into the POM |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Migrate specs to the self-healing fixture |
