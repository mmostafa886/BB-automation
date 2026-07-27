import * as fs from 'fs';
import * as path from 'path';

/**
 * seed-run-context.ts
 *
 * File-based handoff between `npm run seed:forecast`, the Playwright test processes,
 * and `npm run seed:forecast:delete`. A forecast is created once (by `seed-forecast.ts create`)
 * before any test runs — whether that's a single module or all of them — and deleted once
 * (`seed-forecast.ts delete`) after every module has finished. The file is the only channel
 * between those commands, since they run as separate processes (and, in CI, separate
 * Playwright invocations per module).
 *
 * Tests never create or delete through this file — they only read it, via the
 * `seededForecast` fixture in `tests/fixtures/self-healing-fixture.ts`.
 */

const RUN_CONTEXT_FILE = path.resolve('.seed', 'run-context.json');

export interface SeedRunContext {
    forecastId: number | string;
    forecastName: string;
    companyId: number | string;
    createdAt: string;
}

/** Returns the current run context, or `null` if none has been seeded yet. */
export function readRunContext(): SeedRunContext | null {
    try {
        const raw = fs.readFileSync(RUN_CONTEXT_FILE, 'utf-8');
        return JSON.parse(raw) as SeedRunContext;
    } catch {
        return null;
    }
}

/** Writes the run context, creating the `.seed/` directory if needed. */
export function writeRunContext(context: SeedRunContext): void {
    fs.mkdirSync(path.dirname(RUN_CONTEXT_FILE), { recursive: true });
    fs.writeFileSync(RUN_CONTEXT_FILE, JSON.stringify(context, null, 2));
}

/** Removes the run context file. Safe to call even if it doesn't exist. */
export function clearRunContext(): void {
    try {
        fs.unlinkSync(RUN_CONTEXT_FILE);
    } catch {
        // Already gone — nothing to do.
    }
}
