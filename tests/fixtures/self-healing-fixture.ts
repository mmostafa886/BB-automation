import { test as base, type Page } from '@playwright/test';
import { POMLazySelfHealing } from '../../src/pages/pom-lazy-self-healing';
import { GeminiMCPHealingProvider, PlaywrightMCPHealingProvider } from '../../src/utils/playwright-mcp-provider';
import { type AIHealingProvider } from '../../src/utils/self-healing-locator';
import winston from 'winston';
import { Logger } from '../../src/utils/Logger';
import * as dotenv from 'dotenv';
import { readRunContext, type SeedRunContext } from '../../src/utils/seed-run-context';

// Ensure .env vars are available inside the worker process.
// playwright.config.ts runs in the main/config-loader process; env changes
// made there are NOT inherited by Playwright's spawned worker processes.
dotenv.config();

type SelfHealingFixture = {
    logger: winston.Logger;
    pomSelfHealing: POMLazySelfHealing;
};

type TestFixtures = {
    selfHealingFixture: SelfHealingFixture;
};

type WorkerFixtures = {
    /**
     * The forecast seeded via `npm run seed:forecast` before the suite ran (see
     * `src/scripts/seed-forecast.ts` and `src/utils/seed-run-context.ts`). Worker-scoped since the
     * run context is created once, outside Playwright entirely, and is the same for every test.
     */
    seededForecast: SeedRunContext;
};

/**
 * Self-Healing Playwright Fixture
 *
 * Extends the base test with `POMLazySelfHealing` and a logger.
 * Mirrors `pom-lazy-fixture.ts` in lifecycle, and adds:
 *
 * 1. **AI provider auto-configuration** — reads env vars and wires up a
 *    `@playwright/mcp`-backed provider. Priority: `ANTHROPIC_API_KEY` →
 *    `GEMINI_API_KEY` → none (semantic-only healing).
 *
 * 2. **Playwright MCP healing (Phase 3)** — the MCP server spins up in-process,
 *    attached to the test's own browser context (no new browser, no re-navigation).
 *    The AI calls `browser_snapshot` to inspect the live ARIA tree and returns
 *    a working Playwright selector.
 *
 * 3. **Post-test healing summary** — logs which locators used their primary
 *    selector and which healed (semantic or AI).
 *
 * ## .env configuration (all optional)
 * ```
 * ANTHROPIC_API_KEY=sk-ant-...        # → PlaywrightMCPHealingProvider (MCP + Claude)
 * ANTHROPIC_MODEL=claude-sonnet-4-6   # override model (default: claude-sonnet-4-6)
 * GEMINI_API_KEY=AIza...              # → GeminiMCPHealingProvider (MCP + Gemini)
 * GEMINI_MODEL=gemini-2.0-flash       # override Gemini model
 * ```
 *
 * ## Usage
 * ```typescript
 * import { test, expect } from '../../fixtures/self-healing-fixture';
 *
 * test('login', async ({ selfHealingFixture: { pomSelfHealing } }) => {
 *     await pomSelfHealing.loginPage.navigateToLogin();
 *     await pomSelfHealing.loginPage.login('Admin', 'admin123');
 *     await pomSelfHealing.homePage.assertProfileIcon();
 * });
 * ```
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
    seededForecast: [async ({}, use) => {
        const context = readRunContext();
        if (!context) {
            throw new Error(
                'Seeded forecast not found — run "npm run seed:forecast" before the suite ' +
                '(and "npm run seed:forecast:delete" once all modules have finished).',
            );
        }
        await use(context);
    }, { scope: 'worker' }],

    selfHealingFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(
            `Fixture-SelfHealing-${testInfo.title.replace(/\s+/g, '_')}`
        );

        // ── Resolve AI provider from env vars ────────────────────────────────
        const aiProvider = resolveAIProvider(logger, page);

        const pomSelfHealing = new POMLazySelfHealing(page, testInfo.title, aiProvider);

        logger.info(`▶ TEST START: "${testInfo.title}"`);

        await use({ pomSelfHealing, logger });

        // ── Log test outcome ──────────────────────────────────────────────────
        if (testInfo.status === 'passed') {
            logger.info(`✅ TEST PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
        } else if (testInfo.status === 'failed') {
            logger.error(`❌ TEST FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
            if (testInfo.error) {
                logger.error(`   Error: ${testInfo.error.message}`);
            }
        } else if (testInfo.status === 'skipped') {
            logger.warn(`⏭ TEST SKIPPED: "${testInfo.title}"`);
        }

        // ── Log self-healing summary ──────────────────────────────────────────
        logger.info('--- Self-Healing Locator Summary ---');
        logger.info(pomSelfHealing.getHealingReport());
    }
});

export { expect, type Page } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve AI provider from environment
// ─────────────────────────────────────────────────────────────────────────────

function resolveAIProvider(logger: winston.Logger, page: Page): AIHealingProvider | undefined {
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (anthropicKey) {
        const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6';
        logger.info(`[SelfHealingFixture] AI provider: Playwright MCP + Claude (${model})`);
        return new PlaywrightMCPHealingProvider(page, anthropicKey, model);
    }

    if (geminiKey) {
        const model = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
        logger.info(`[SelfHealingFixture] AI provider: Playwright MCP + Gemini (${model})`);
        return new GeminiMCPHealingProvider(page, geminiKey, model);
    }

    logger.info('[SelfHealingFixture] No AI provider configured — using semantic auto-healing only (Phases 1-2).');
    return undefined;
}
