import { test as base, type Page } from '@playwright/test';
import { POMLazySelfHealing } from '../../src/pages/pom-lazy-self-healing';
import { GeminiMCPHealingProvider, PlaywrightMCPHealingProvider } from '../../src/utils/playwright-mcp-provider';
import { type AIHealingProvider } from '../../src/utils/self-healing-locator';
import winston from 'winston';
import { Logger } from '../../src/utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Ensure .env vars are available inside the worker process.
// playwright.config.ts runs in the main/config-loader process; env changes
// made there are NOT inherited by Playwright's spawned worker processes.
dotenv.config();

type SelfHealingFixture = {
    logger: winston.Logger;
    pomSelfHealing: POMLazySelfHealing;
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
export const test = base.extend<{ selfHealingFixture: SelfHealingFixture }>({
    selfHealingFixture: async ({ page }, use, testInfo) => {
        const logger = Logger.getLogger(
            `Fixture-SelfHealing-${testInfo.title.replace(/\s+/g, '_')}`
        );

        // ── Inject sessionStorage (MSAL tokens not captured by storageState) ─
        // globalSetup saves session-storage.json alongside playwright-auth.json.
        // page.addInitScript runs before the app's own scripts on every navigation,
        // so MSAL finds its tokens already populated in sessionStorage.
        const sessionStoragePath = path.resolve('session-storage.json');
        if (fs.existsSync(sessionStoragePath)) {
            const sessionData = JSON.parse(
                fs.readFileSync(sessionStoragePath, 'utf-8')
            ) as Record<string, string>;
            await page.addInitScript((data: Record<string, string>) => {
                for (const [key, value] of Object.entries(data)) {
                    try { sessionStorage.setItem(key, value); } catch { /* ignore */ }
                }
            }, sessionData);
        }

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
