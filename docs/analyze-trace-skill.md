# Analyze Trace Skill

This document explains the purpose, internal mechanics, and usage of the `AnalyzeTrace` skill located at [.claude/skills/Analyze_Trace/SKILL.md](../.claude/skills/Analyze_Trace/SKILL.md).

---

## Purpose

When a Playwright test fails, `--trace retain-on-failure` (configured in [playwright.config.ts](../playwright.config.ts)) writes a `trace.zip` into `test-results/<test-folder>/`. The skill automates the full debugging loop:

1. Locate and extract the zip
2. Parse the binary `.trace` event stream
3. Reconstruct the step timeline
4. Classify the root cause from a known failure catalog
5. Print a structured report
6. Apply the minimal fix to the source file

Without this skill the same loop is done manually: open the Playwright Trace Viewer, hunt through hundreds of events, guess the category, then edit the file. The skill compresses that to a single command.

---

## How to Invoke

```
/Analyze_Trace <trace path or test name>
```

| Input | Behaviour |
| --- | --- |
| Omitted | Lists every `trace.zip` found under `test-results/` and asks which to analyse |
| Test name or TC-ID (e.g. `TC-5286`) | Filters `test-results/` by that string |
| Absolute or relative path to a `trace.zip` | Analyses that exact file |

---

## Internal Steps

### Step 1 — Locate

The skill runs `find test-results -name "trace.zip"` to discover all available traces. If more than one matches the user's filter, it lists them and waits for a selection before proceeding.

### Step 2 — Extract

Uses Python's `zipfile` module to unpack the zip into a temp folder (`d:/temp/pw-trace-analysis/`). A typical zip contains:

| File | Contents |
| --- | --- |
| `test.trace` | Playwright test-runner events: fixture setup, actions, assertions |
| `0-trace.trace` | Browser-level CDP events: network, console, page errors, JS execution |
| `0-trace.network` | Full HAR-like network request/response log |
| `0-trace.stacks` | Source-map frames mapping CDP events back to TypeScript source |
| `resources/` | Screencast JPEG frames, DOM snapshots, API response JSON bodies |

### Step 3 — Parse

Both `.trace` files are **newline-delimited JSON (NDJSON)**. The skill parses them with Python and reconstructs a chronological timeline of:

- Every `action` event (clicks, fills, navigations, `waitForFunction`, `evaluate`, etc.) with its `startTime`, `title`, and `error`
- Every browser-side event (console messages, download triggers, page errors)

### Step 4 — Identify the Failure

The skill looks for:

- The **last passing step** immediately before an error
- The **failing step** with a non-empty `error.message`
- The **stack frame** from `0-trace.stacks` mapping the error back to a TypeScript file and line number
- **Download events** — whether a `download` browser event fired, its blob URL, and the `suggestedFilename`
- **`waitForFunction` CDP parameters** — specifically whether the `"timeout"` field in the CDP call is `0` (infinite), which indicates the options were passed in the wrong argument position

### Step 5 — Classify

The skill compares the evidence against a failure catalog and assigns one of nine categories:

| Category | Signal |
| --- | --- |
| `LOCATOR` | `TimeoutError: waiting for locator(...)` |
| `LOCATOR-STRICT` | `strict mode violation` — selector matches multiple elements |
| `TEXT` | `toHaveText` / `toContainText` received value ≠ expected |
| `TIMING` | `toBeVisible` fails immediately after an action |
| `WAITFN-ARG` | CDP shows `"timeout": 0` on a `waitForFunction` call; options object appears in `arg` |
| `WAITFN-NEVER` | `waitForFunction` poll flag is never set by the page |
| `DOWNLOAD-MISMATCH` | `showSaveFilePicker` mock installed but a blob-URL download event fires instead |
| `TIMEOUT` | 30-second test-level timeout with no specific Playwright error (symptom of another bug) |
| `CODE` | TypeScript or JavaScript runtime error in the POM or spec |
| `AUTH` | 401 / 403 on API calls inside the test |

### Step 6 — Report

The skill prints a structured report before touching any code:

```
══════════════════════════════════════════════════════
TRACE ANALYSIS REPORT
══════════════════════════════════════════════════════
Test           : TC-5286 — Verify the downloaded template content
Trace file     : test-results/.../trace.zip
──────────────────────────────────────────────────────
TIMELINE (last 5 steps before failure)
  [+7.35s] PASSED  page.evaluate — inject showSaveFilePicker mock
  [+9.08s] PASSED  Self-healing: healed to getByRole('button', { name: 'Download Template' })
  [+9.18s] PASSED  Click Download Template button
  [+9.19s] FAILED  page.waitForFunction — window.__downloadCapture !== null
           Error  : Test timeout of 30000ms exceeded
           Source : src/pages/reagents-page-self-healing.ts:204
──────────────────────────────────────────────────────
CATEGORY       : WAITFN-ARG
ROOT CAUSE     : { timeout: 2000 } was passed as the page-function arg (second positional
                 parameter) instead of the options object (third parameter). CDP-level
                 timeout was 0 (infinite); the test hit the 30-second wall.
──────────────────────────────────────────────────────
DOWNLOAD EVENTS
  Fired   : yes
  URL     : blob:https://az-chem-synth.vercel.app/e884adee-...
  Filename: Reagents_Template.csv
──────────────────────────────────────────────────────
CONSOLE ERRORS
  401 /api/user/photo — non-blocking, unrelated to failure
══════════════════════════════════════════════════════
```

### Step 7 — Apply Fix

The skill applies the **minimum** change needed based on the category. It reads the source file before editing. Examples:

**WAITFN-ARG**

```typescript
// ❌ BROKEN — options treated as arg; CDP timeout = 0
await page.waitForFunction(fn, { timeout: 2_000 });

// ✅ CORRECT — explicit undefined arg; CDP timeout = 2000
await page.waitForFunction(fn, undefined, { timeout: 2_000 });
```

**DOWNLOAD-MISMATCH** — Remove or demote the `showSaveFilePicker` mock path; make the `waitForEvent('download')` path primary.

**LOCATOR** — Update the selector in `src/locators/<page>-locators.ts` or the inline `page.locator()` call.

**TEXT** — Update the expected string constant to the value shown in `Received:`.

**TIMING** — Insert `await page.waitForLoadState('networkidle')` or `await this.actions.waitForVisible(...)` before the failing assertion.

### Step 8 — Update Docs

If the fix reveals a pattern not yet documented in `docs/`, the skill appends a concise entry to the relevant file (e.g. `docs/playwright-download-pattern.md`).

---

## Key Gotcha — `waitForFunction` Argument Position

This is the most common subtle bug in this project and warrants its own section.

### Playwright's signature

```typescript
page.waitForFunction(pageFunction, arg?, options?)
```

The **second** positional parameter is `arg` — a value serialised and passed into the page function as its argument. The **third** parameter is the options object (`{ timeout, polling }`).

### The trap

```typescript
// Looks correct — but { timeout: 2000 } is arg, NOT options
await page.waitForFunction(
    () => window.__downloadCapture !== null,
    { timeout: 2000 }   // ← this is arg
);
```

TypeScript does not catch this because `arg` is typed as `any`. The CDP-level call shows `"timeout": 0` (infinite), and the test runs until Playwright's test-level timeout kills it.

### How the trace reveals it

In `0-trace.trace`, the `waitForFunction` CDP event looks like:

```json
{
  "method": "Runtime.evaluate",
  "expression": "() => window.__downloadCapture !== null",
  "arg": { "value": { "o": [{ "k": "timeout", "v": { "n": 2000 } }] } },
  "timeout": 0
}
```

The `"timeout": 0` on the CDP event and the `{ "k": "timeout" }` inside `"arg"` are the definitive fingerprint of this bug.

### The fix

```typescript
// Pass undefined explicitly as arg; options become the third parameter
await page.waitForFunction(
    () => window.__downloadCapture !== null,
    undefined,
    { timeout: 2_000 }
);
```

---

## Constraints

- The skill reads source files before editing them — it never edits blindly.
- It applies the **minimum** change; it does not refactor surrounding code.
- It does **not** run the test after fixing unless the user asks.
- It does **not** commit changes unless the user asks.

---

## Related docs

- [playwright-download-pattern.md](./playwright-download-pattern.md) — standard vs File System Access API download handling
- [.claude/skills/Analyze_Trace/SKILL.md](../.claude/skills/Analyze_Trace/SKILL.md) — the skill definition itself
