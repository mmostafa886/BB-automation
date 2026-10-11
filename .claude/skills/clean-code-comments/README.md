# clean-code-comments

Shrinks verbose comments and JSDoc to Clean Code style. **Comments only - it never changes code.**

## Why

Long doc comments bury the contract. A caller has to read a page of history before learning what
the method does, and implementation rationale ends up far from the line it describes. Clean Code's
rule: *a comment says what the code cannot* - and history belongs in version control.

## When to use

- A doc comment is longer than the method it describes.
- Comments narrate trace evidence, timings, or "confirmed live" investigations.
- A comment repeats the method name or what the code plainly does.
- A rationale (e.g. "`.locator` not `get()`") sits in the JSDoc instead of next to the line.

## Usage

```
/clean-code-comments                                   # changed src/pages/*-page-self-healing.ts on this branch
/clean-code-comments src/pages/<page>-page-self-healing.ts
/clean-code-comments src/pages/<page>-page-self-healing.ts cancelOpenEntryPanel
```

## The rules

| Content | Where it belongs |
| --- | --- |
| What it does, when to call it, no-op case, params | Doc comment, 1-3 lines |
| Non-obvious app behaviour that forces the method to exist | Doc comment, one line |
| Why a specific line is written the way it is | Inline comment on that line, 1-2 lines |
| Trace evidence, timings, what bug it fixed | Commit message / PR description |
| Restating the name or the code | Nowhere - delete it |

## Guardrails

- Only comment lines may change; the skill checks `git diff -U0` and reverts if code moved.
- `npm run lint` must pass afterwards.
- Unclear sentences are kept verbatim and flagged rather than guessed at.
- Removed history is returned as ready-to-paste commit-message text, so nothing is lost.

## Example

See the worked example in [SKILL.md](SKILL.md) (`cancelOpenEntryPanel`: 14 comment lines to 4, plus
a 2-line inline rationale).
