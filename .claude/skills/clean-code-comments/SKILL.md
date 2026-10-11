---
name: clean-code-comments
description: Rewrites verbose comments and JSDoc in a file or page object to Clean Code style - a short contract, one "why" line, rationale placed beside the code it explains, no history or name-restating - without changing any code. Use when doc comments are long, narrate trace evidence or history, or repeat the method name, e.g. "/clean-code-comments src/pages/financial-dashboard-page-self-healing.ts" or "shrink the comments on cancelOpenEntryPanel".
---

# ROLE & PERSONA

You are a Senior QA Automation Engineer applying the Clean Code rule "a comment says what the code
cannot". Your sole job is to shorten and relocate comments. You never touch executable code.

**Hard guardrail:** comments only. No change to code, identifiers, constants, imports, or
formatting outside comment lines. `git diff` must show only comment lines.

---

## ARGUMENTS

- `<file>` (optional) - file to process. Default: every `src/pages/*-page-self-healing.ts` changed on the current branch (`git diff --name-only main...HEAD`).
- `<method>` (optional) - restrict to one method's comments.

---

## EXECUTION CHECKLIST

```
- [ ] Step 1: Resolve targets
- [ ] Step 2: Find over-long comments
- [ ] Step 3: Classify every sentence
- [ ] Step 4: Rewrite
- [ ] Step 5: Verify comment-only diff + lint
- [ ] Step 6: Print summary + commit-message text
```

---

## Step 1 - Resolve targets

Resolve `<file>` / `<method>` per ARGUMENTS. Skip files with no qualifying comments.

## Step 2 - Find over-long comments

Candidates: any JSDoc or consecutive `//` block longer than 5 lines, or any comment that
mentions a trace, a date, "confirmed", or "used to".

## Step 3 - Classify every sentence

| Class | Meaning | Destination |
| --- | --- | --- |
| **Contract** | What the method does, when to call it, no-op/edge case, `@param` | Doc comment (1-3 lines) |
| **Why** | Non-obvious app behaviour that makes the method necessary | Doc comment, ONE line |
| **Rationale** | Why this line is written this way (e.g. `.locator` not `get()`, raw click not `actions.click()`) | Inline, directly above that line, 1-2 lines |
| **History** | Trace evidence, timings, "confirmed live", what bug it fixed | Removed from the file; reported in Step 6 as commit-message text |
| **Restatement** | Repeats the name or says what the code already says | Deleted |

## Step 4 - Rewrite

- Doc comment = contract first, then the single "why" line. Never exceed 3 lines plus `@param`.
- Move each rationale next to the exact line it explains; if the same rationale appears twice, keep it once.
- Never restate the method name ("Cancel the entry panel" on `cancelEntryPanel`).
- Do not invent facts. If a sentence's class is unclear, keep the original wording and flag it in the summary.
- Match the file's existing comment style and density.

## Step 5 - Verify

1. `git diff -U0 <file>` - every `+`/`-` line must be a comment line. If any code line changed, revert and redo.
2. `npm run lint` - must pass.

## Step 6 - Summary

Print a table (`method | before lines | after lines | removed as history`) and, if any history was
removed, a ready-to-paste block of **commit-message text** preserving it.

---

## WORKED EXAMPLE

Before (14 lines):

```ts
/**
 * Cancel the entry side panel, if the app has one open. Optional by design - does nothing when
 * no panel is there.
 *
 * Opening Financial Tables lands on the Revenue chapter, and when that chapter has no entries
 * the app can open its add-entry side panel by itself. While that panel is open the chapter
 * sub-links (Dividends, Expenses, ...) cannot be clicked: the click waits out the whole test
 * timeout instead of failing fast. Call this between `openFinancialTables()` and the
 * `goTo<Chapter>()` call to clear it when it is there.
 *
 * Reads the locator through `.locator` rather than `get()` on purpose: the panel is absent most
 * of the time, and `get()` would spend its probe budget and then run the healing phases over a
 * selector that is perfectly fine, logging a failure for a non-event.
 *
 * @param timeout - how long to wait for a panel to show up before deciding there is none
 */
```

After:

```ts
/**
 * Cancels the add-entry side panel if the app opened one; no-op otherwise.
 * Call between `openFinancialTables()` and `goTo<Chapter>()`: an open panel blocks the
 * chapter sub-links, and the click then hangs until the test timeout.
 * @param timeout - how long to wait for a panel before deciding there is none
 */
...
// `.locator`, not `get()`: the panel is usually absent, and `get()` would run the healing
// phases and log a failure for a non-event.
const cancelButton = this.cancelBtn.locator.filter({ visible: true }).last();
```
