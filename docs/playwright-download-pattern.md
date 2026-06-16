# Playwright File Download Pattern

This document covers the two distinct download mechanisms encountered in this project, why each requires a different approach, and how to use the shared `captureFileDownload` utility that abstracts both.

---

## Two Types of Downloads

| Mechanism | How to detect | Playwright approach |
| --- | --- | --- |
| Standard browser download (`<a download>`, `fetch` + Blob URL) | No OS dialog; file goes to the browser's download folder | `page.waitForEvent('download')` |
| File System Access API (`showSaveFilePicker()`) | Native OS "Save As" dialog appears | Mock `window.showSaveFilePicker` via `page.evaluate()` |

> **This project's Download Template button** uses a standard blob-URL download confirmed by trace analysis. The `showSaveFilePicker` mock is installed as a defensive fallback in case the app changes implementation.

---

## The `captureFileDownload` Utility

All download handling is centralized in [src/utils/download-helper.ts](../src/utils/download-helper.ts).
Page objects call a single function instead of re-implementing the detection logic.

### Signature

```typescript
captureFileDownload(
    page: Page,
    triggerAction: () => Promise<void>,
    savePath?: string,          // defaults to test-results/downloads/download-<timestamp>.tmp
): Promise<string>              // returns file content as UTF-8 string
```

### Usage in a page object

```typescript
import { captureFileDownload } from '../utils/download-helper';

// Verify file content
async clickDownloadTemplateAndVerifyContent(): Promise<void> {
    const savePath = path.join(process.cwd(), 'test-results', 'downloads', 'template.csv');
    const fileContent = await captureFileDownload(
        this.page,
        async () => this.actions.click(await this.templateDownloadButton.get(), 'Click Download Template button'),
        savePath,
    );

    const expectedHeaders = 'reagent_name,reagent_type,smiles\n';
    await this.assert.toContain(fileContent, expectedHeaders, 'Downloaded template CSV headers match expected format');
}

// Verify only that a download was triggered (content not needed)
async clickDownloadTemplateButton(): Promise<void> {
    await captureFileDownload(
        this.page,
        async () => this.actions.click(await this.templateDownloadButton.get(), 'Click Download Template button'),
    );
    await this.assert.toBeTruthy(true, 'Template file download was triggered successfully');
}
```

### Why a shared utility

- **Single fix point** — bugs in detection logic (e.g. `waitForFunction` arg-position, `WriteParams` unwrap) are fixed once, not per page object.
- **Parallel-safe** — the default `savePath` includes a timestamp, preventing workers from overwriting each other's files.
- **Future-proof** — any page that needs a download import one function.

---

## Why `Promise.all` Must Be Avoided

A common but flawed pattern from older Playwright docs:

```typescript
// ❌ DO NOT USE
const [download] = await Promise.all([
    page.waitForEvent('download'),
    locator.click(),   // direct .click() — bypasses this.actions
]);
```

**Problem 1 — bypasses `this.actions.click()`**: calling `locator.click()` directly skips `AdvancedActionsHelper`, losing Winston logging, Playwright `test.step()` integration in the HTML report, and automatic failure screenshots.

**Problem 2 — concurrent `test.step()` calls**: `this.actions.click()` delegates to `StepRunner.run()`, which wraps every action in `test.step()`. Running `test.step()` concurrently inside `Promise.all` breaks Playwright's step-tree and produces malformed nesting in the HTML report.

---

## How `captureFileDownload` Works Internally

### Detection order

```text
1. Install showSaveFilePicker mock via page.evaluate()
        │
2. Register page.waitForEvent('download', { timeout: 10_000 })
        │                           (before triggerAction — no race)
3. await triggerAction()            (the caller's click / interaction)
        │
        ├─── showSaveFilePicker path (app calls window.showSaveFilePicker)
        │         │
        │         ▼
        │    mock captures write chunks → sets window.__downloadCapture
        │         │
        │    waitForFunction polls for 2 s → returns captured string
        │
        └─── standard download path (app triggers blob-URL download)
                  │
                  ▼
             2-second waitForFunction times out (no capture)
                  │
                  ▼
             await downloadPromise (already resolved)
                  │
                  ▼
             download.saveAs(savePath) → fs.readFileSync → return string
```

### The `showSaveFilePicker` mock

```text
app code calls showSaveFilePicker()
        │
        ▼
mock returns a fake FileSystemFileHandle
        │
        ▼
app calls handle.createWritable()
        │
        ▼
mock returns a fake FileSystemWritableFileStream
        │
        ├── write(data) → unwrap WriteParams if needed → append to chunks[]
        │
        └── close()     → join chunks → store in window.__downloadCapture
                                │
                                ▼
                    waitForFunction polls until not null
                                │
                                ▼
                    page.evaluate() reads the captured string
```

### Key decisions

| Decision | Reason |
| --- | --- |
| `page.evaluate()` not `addInitScript` | The page is already loaded when the utility is called. `addInitScript` only runs at page-load time; `evaluate()` patches the live runtime. |
| `window.__downloadCapture = null` sentinel | `waitForFunction` needs a falsy initial value to poll against. `null` is cleaner than `undefined`. |
| Five `write()` branches (four data types + WriteParams unwrap) | The File System Access API spec allows `write()` to receive a raw `string`, `Blob`, `ArrayBuffer`, or `ArrayBufferView`, **and** a `WriteParams` object `{ type: 'write', data: ..., position?: number }`. The mock unwraps WriteParams first, then dispatches on the four data types. |
| `waitForFunction(fn, undefined, { timeout })` not `waitForFunction(fn, { timeout })` | Playwright's signature is `(fn, arg?, options?)`. Passing `{ timeout }` as the second argument places it in the `arg` slot — the CDP-level timeout becomes `0` (infinite). Always pass `undefined` as arg when no page-function argument is needed. |
| 2-second poll then fallback | `showSaveFilePicker` (if used) sets `__downloadCapture` in < 100 ms. A 2-second window is generous without adding unnecessary delay when the app uses a standard download. |
| `acceptDownloads: true` in playwright.config.ts | Required for Playwright to auto-save standard browser downloads. Has no effect on the `showSaveFilePicker` path (intercepted before the browser sees it). |
| Timestamp in default `savePath` | Prevents parallel workers from overwriting each other's downloaded files. |
| `seek` / `truncate` / `abort` are no-ops | Required to satisfy the `FileSystemWritableFileStream` interface shape; the app doesn't call them for a simple one-shot write. |

---

## Never Use Inline `require()`

```typescript
// ❌ old pattern — avoid
const downloadPath = require('path').join(__dirname, 'template.csv');
const fs = require('fs');
```

Problems:

- `__dirname` resolves to `src/pages/` (source directory), writing a CSV next to source files
- Defeats TypeScript type inference
- Makes static analysis and tree-shaking impossible
