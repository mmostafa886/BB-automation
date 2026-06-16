# AnalyzeTrace Skill

Extracts a Playwright `trace.zip`, reconstructs the test timeline, classifies the root cause, and applies a targeted fix to the page-object or spec file.

## Usage

```
/analyze-trace <trace path or test name>
```

Examples:

```
/analyze-trace test-results/Reagents-tc-5286-.../trace.zip
/analyze-trace TC-5286
/analyze-trace                          ← lists all available trace.zip files
```

## What it does

| Step | Action |
| --- | --- |
| 1 | Locates the trace.zip (auto-discovers under `test-results/`) |
| 2 | Extracts the zip to a temp folder |
| 3 | Parses the NDJSON `.trace` files and reconstructs the step timeline |
| 4 | Identifies the last passing step, the failing step, and the exact error |
| 5 | Classifies the root cause using a failure catalog |
| 6 | Prints a structured **TRACE ANALYSIS REPORT** |
| 7 | Applies the minimal fix to the relevant source file |
| 8 | Updates `docs/` if a new pattern was found |

## Failure catalog

| ID | Pattern |
| --- | --- |
| LOCATOR | `TimeoutError: waiting for locator(...)` |
| LOCATOR-STRICT | `strict mode violation` — selector matches multiple elements |
| TEXT | `toHaveText / toContainText` value mismatch |
| TIMING | `toBeVisible` fails immediately after an action |
| WAITFN-ARG | `waitForFunction` options passed as arg → infinite wait |
| WAITFN-NEVER | `waitForFunction` flag never set by page code |
| DOWNLOAD-MISMATCH | `showSaveFilePicker` mock installed but app uses blob-URL download |
| TIMEOUT | 30 s test-level timeout (usually a symptom of another bug above) |
| CODE | TypeScript / logic runtime error |
| AUTH | 401 / 403 on API calls |

## Key gotcha documented

`page.waitForFunction(fn, { timeout: N })` — passing the options object as the second positional
argument makes Playwright treat it as the **page-function arg**, not the options. The CDP-level
timeout becomes `0` (infinite). Always use:

```typescript
await page.waitForFunction(fn, undefined, { timeout: N });
```
