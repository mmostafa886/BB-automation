import * as fs from 'fs';
import * as path from 'path';
import { type Page } from '@playwright/test';

/**
 * captureFileDownload — Intercepts a browser-initiated file download and returns its content.
 *
 * Handles two distinct download mechanisms transparently:
 *
 *  A) File System Access API (`window.showSaveFilePicker`)
 *     The API normally opens a native OS "Save As" dialog that blocks test execution.
 *     This helper mocks the API in-page so no dialog appears and the written bytes are
 *     captured directly inside the browser context — no OS-level I/O required.
 *
 *  B) Standard browser download (`<a download>`, blob URL, fetch-then-saveAs)
 *     Playwright's `waitForEvent('download')` is registered before the trigger action
 *     so no event is ever missed. The downloaded file is saved to `savePath` and read
 *     back with `fs.readFileSync`.
 *
 * Detection order:
 *  1. The showSaveFilePicker mock is installed first (covers mechanism A).
 *  2. The download event listener is registered next (covers mechanism B).
 *  3. The caller's `triggerAction` is awaited.
 *  4. A 2-second poll checks whether the showSaveFilePicker mock captured content.
 *     If yes — return that content immediately (no file system I/O needed).
 *     If no (2-second timeout) — fall through to the already-resolved download event.
 *
 * @param page          - Playwright Page instance (must be an active, loaded page).
 * @param triggerAction - Async callback that performs the UI action triggering the download
 *                        (e.g. clicking a button). Must NOT contain concurrent `test.step()` calls.
 * @param savePath      - Absolute path where the file is written on the standard-download path.
 *                        Defaults to a timestamped file under `test-results/downloads/` to avoid
 *                        conflicts between parallel workers.
 * @returns             - The downloaded file's content as a UTF-8 string.
 * @throws              - If neither mechanism produces a download within the timeouts.
 *
 * @example
 * // Verify CSV headers
 * const content = await captureFileDownload(
 *     this.page,
 *     async () => this.actions.click(await this.downloadBtn.get(), 'Click Download'),
 * );
 * await this.assert.toContain(content, 'name,type,smiles\n', 'CSV headers match');
 *
 * @example
 * // Save to a specific path
 * const content = await captureFileDownload(
 *     this.page,
 *     async () => this.actions.click(await this.downloadBtn.get(), 'Click Download'),
 *     path.join(process.cwd(), 'test-results', 'downloads', 'template.csv'),
 * );
 */
export async function captureFileDownload(
    page: Page,
    triggerAction: () => Promise<void>,
    savePath: string = path.join(process.cwd(), 'test-results', 'downloads', `download-${Date.now()}.tmp`),
): Promise<string> {

    // ── Step 1: Install the showSaveFilePicker mock ──────────────────────────
    // page.evaluate() patches the live runtime of the already-loaded page.
    // addInitScript() would only fire on the next navigation, so it cannot be used here.
    await page.evaluate(() => {
        const win = window as any;
        const chunks: string[] = [];
        win.__downloadCapture = null;

        win.showSaveFilePicker = async () => ({
            createWritable: async () => ({
                write: async (data: any) => {
                    // The File System Access API allows write() to receive either a raw chunk
                    // (string | Blob | ArrayBuffer | ArrayBufferView) or a WriteParams object
                    // { type: 'write', data: <chunk>, position?: number }.
                    const raw = (data && typeof data === 'object' && data.type === 'write')
                        ? data.data
                        : data;

                    if (typeof raw === 'string') {
                        chunks.push(raw);
                    } else if (raw instanceof Blob) {
                        chunks.push(await raw.text());
                    } else if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
                        chunks.push(new TextDecoder().decode(raw));
                    }
                },
                close:    async () => { win.__downloadCapture = chunks.join(''); },
                abort:    async () => {},
                seek:     async () => {},
                truncate: async () => {},
            }),
        });
    });

    // ── Step 2: Register the standard-download listener BEFORE the action ────
    // Registering here (not after the click) guarantees the CDP listener is in
    // place before the browser emits the download event — no race condition.
    const downloadPromise = page
        .waitForEvent('download', { timeout: 10_000 })
        .catch(() => null);

    // ── Step 3: Run the caller-supplied trigger action ───────────────────────
    await triggerAction();

    // ── Step 4: Check the showSaveFilePicker path first (resolves in < 1 s) ──
    // IMPORTANT: waitForFunction signature is page.waitForFunction(fn, arg?, options?).
    // Pass undefined as arg so { timeout } is NOT mis-placed as the page-function argument
    // (which would result in CDP-level timeout = 0, i.e. an infinite wait).
    try {
        await page.waitForFunction(
            () => (window as any).__downloadCapture !== null,
            undefined,
            { timeout: 2_000 },
        );
        return await page.evaluate<string>(() => (window as any).__downloadCapture);
    } catch {
        // showSaveFilePicker was not used — fall back to the standard download path.
    }

    // ── Step 5: Standard browser download fallback ───────────────────────────
    const download = await downloadPromise;
    if (!download) {
        throw new Error(
            'captureFileDownload: download did not complete. ' +
            'Neither showSaveFilePicker nor a standard browser download was detected ' +
            `within the timeout. Trigger action: ${triggerAction.toString().slice(0, 120)}`,
        );
    }

    await download.saveAs(savePath);
    return fs.readFileSync(savePath, 'utf-8');
}
