import { type Locator, type Page } from '@playwright/test';

/** Extracts the ARIA role union type directly from Playwright's getByRole signature */
type AriaRole = Parameters<Page['getByRole']>[0];
import winston from 'winston';

// ─────────────────────────────────────────────────────────────────────────────
// AI Healing Provider contract
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Any class that implements this interface can be plugged into `SelfHealingLocator`
 * as the last-resort AI healing backend (Phase 3).
 *
 * Built-in implementations (both use `@playwright/mcp` + live ARIA snapshot):
 *   - `PlaywrightMCPHealingProvider` — Claude (Anthropic)
 *   - `GeminiMCPHealingProvider`     — Gemini (Google)
 *
 * Implement this interface directly to add any other AI backend.
 */
export interface AIHealingProvider {
    /**
     * Given a plain-English description of the element to find, return a
     * Playwright selector string (CSS or XPath), or `null` / `'UNABLE_TO_HEAL'`
     * when no reliable selector can be determined.
     *
     * @param elementDescription - e.g. "submit button on the OrangeHRM login form"
     */
    suggestSelector(elementDescription: string): Promise<string | null>;

    /**
     * Given a plain-English description, return up to 3 Playwright selector
     * candidates ordered from most to least preferred (most specific first).
     *
     * The framework probes each candidate in turn and uses the first that passes
     * a visibility check. If none pass the quick probe, candidate 1 is returned
     * to the action layer, which applies the full Playwright action timeout.
     *
     * When this method is not implemented the framework falls back to calling
     * `suggestSelector()` and treating the result as a single-item list.
     *
     * @param elementDescription - e.g. "submit button on the OrangeHRM login form"
     */
    suggestSelectors?(elementDescription: string): Promise<string[]>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Element Metadata
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Semantic description of the element. Used to auto-generate Playwright built-in
 * locator strategies when the primary CSS/XPath selector fails.
 *
 * Fill only the fields that apply to the element — unused fields are silently skipped.
 */
export interface ElementMetadata {
    /**type  */
    type?: string;
    /** ARIA role, e.g. 'button', 'textbox', 'heading', 'img' */
    role?: AriaRole;
    /** Accessible name (aria-label, visible button text, heading text …) */
    name?: string;
    /** Text of the `<label>` element associated with an input */
    label?: string;
    /** `placeholder` attribute value of an input/textarea */
    placeholder?: string;
    /** Exact visible text content (buttons, links, headings, paragraphs) */
    text?: string;
    /** `alt` attribute of an `<img>` */
    altText?: string;
    /** `data-testid` attribute value */
    testId?: string;
    /**
     * Plain-English description forwarded to the AI provider when all other
     * strategies fail. Be specific: "username text input on the OrangeHRM login form".
     */
    description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Locator Definition (used by locator repositories)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Plain-data descriptor for a single self-healing locator.
 * Lives in a locator-repository file (`src/locators/*.ts`) so selector strings
 * and semantic metadata are kept separate from page-object behaviour.
 */
export interface LocatorDefinition {
    /**
     * How to locate the element. Three forms are accepted:
     *  - `string`                  — CSS or XPath selector (e.g. `'#save-btn'`)
     *  - `(page: Page) => Locator` — factory function evaluated at construction time;
     *                                use this in locator repositories when you need
     *                                Playwright built-in locators (e.g. `page.getByRole(…)`)
     *  - `Locator`                 — pre-built locator (only valid inside page objects
     *                                where a `Page` instance is already available)
     */
    selector: string | ((page: Page) => Locator) | Locator;
    /** Semantic metadata used to auto-generate healing strategies */
    metadata: ElementMetadata;
}

// ─────────────────────────────────────────────────────────────────────────────
// SelfHealingLocator
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SelfHealingLocator — A three-phase resilient locator that does NOT require
 * manually maintained fallback selector lists.
 *
 * ## Phase 1 — Primary selector
 * Tries the CSS/XPath selector you wrote. If the element is found within
 * `probeTimeout` ms, returns it immediately (no overhead).
 *
 * ## Phase 2 — Semantic auto-strategies
 * When the primary fails, derives Playwright built-in locator strategies
 * automatically from `ElementMetadata`:
 *   - `getByRole(role, { name })`
 *   - `getByLabel(label)`
 *   - `getByPlaceholder(placeholder)`
 *   - `getByText(text, { exact: true })`
 *   - `getByAltText(altText)`
 *   - `getByTestId(testId)`
 * These are semantically grounded and survive DOM restructuring, class renames,
 * or attribute changes as long as the element's accessible meaning stays the same.
 *
 * ## Phase 3 — AI healing via Playwright MCP (opt-in)
 * If all semantic strategies also fail and an `AIHealingProvider` was supplied,
 * the provider is invoked with the element description. The MCP providers spin up
 * an in-process `@playwright/mcp` server, take a live ARIA snapshot, and ask the
 * AI to return a working selector.
 *
 * ## Integration with existing helpers
 * `AdvancedActionsHelper` and `AdvancedAssertionsHelper` accept plain Playwright
 * `Locator` objects. Call `await locator.get()` in page methods to resolve the
 * self-healing locator before passing it to a helper — no changes to helpers needed.
 *
 * ## Example
 * ```typescript
 * this.usernameInput = new SelfHealingLocator(page,
 *     'input[name="username"]',          // primary — the only selector you write
 *     {
 *         role: 'textbox',
 *         label: 'Username',
 *         placeholder: 'Username',
 *         description: 'Username input on the login form',
 *     },
 *     logger,
 *     aiProvider,   // optional — omit for semantic-only healing
 * );
 *
 * // In a page method:
 * await this.actions.fill(await this.usernameInput.get(), value, 'Enter username');
 * ```
 */
export class SelfHealingLocator {
    private readonly page: Page;
    private readonly primarySelector: string;
    private readonly primaryLocatorOverride?: Locator;
    private readonly metadata: ElementMetadata;
    private readonly logger: winston.Logger;
    private readonly aiProvider?: AIHealingProvider;

    /**
     * Tracks the outcome of the last `get()` call.
     * - `pending`  → `get()` has never been called
     * - `primary`  → Phase 1 succeeded (primary selector found the element)
     * - `healed`   → Phase 2 or 3 succeeded (a fallback strategy found the element)
     * - `failed`   → All phases exhausted; element was not found by any strategy
     */
    private _resolution: 'pending' | 'primary' | 'healed' | 'failed' = 'pending';
    private _healedStrategy: string = '';
    /** Cached result of a successful Phase 2 or Phase 3 heal. Returned immediately on repeated `get()` calls. */
    private _cachedHealedLocator?: Locator;

    /**
     * @param page            - Playwright Page instance
     * @param primarySelector - CSS/XPath selector string, or a pre-built Playwright Locator
     * @param metadata        - Semantic description used to auto-generate healing strategies
     * @param logger          - Winston logger from the parent page object
     * @param aiProvider      - Optional AI backend for last-resort healing
     */
    constructor(
        page: Page,
        primarySelector: string | ((page: Page) => Locator) | Locator,
        metadata: ElementMetadata,
        logger: winston.Logger,
        aiProvider?: AIHealingProvider,
    ) {
        this.page = page;
        if (typeof primarySelector === 'string') {
            this.primarySelector = primarySelector;
        } else if (typeof primarySelector === 'function') {
            this.primarySelector = '';
            this.primaryLocatorOverride = primarySelector(page);
        } else {
            this.primarySelector = '';
            this.primaryLocatorOverride = primarySelector;
        }
        this.metadata = metadata;
        this.logger = logger;
        this.aiProvider = aiProvider;
    }

    // ─── Static factory ────────────────────────────────────────────────────────

    /**
     * Creates a `SelfHealingLocator` from a `LocatorDefinition` (locator-repository entry).
     * Keeps page constructors free of inline selector strings and metadata literals.
     *
     * ```typescript
     * this.usernameInput = SelfHealingLocator.from(page, loginLocators.usernameInput, logger);
     * ```
     */
    static from(
        page: Page,
        def: LocatorDefinition,
        logger: winston.Logger,
        aiProvider?: AIHealingProvider,
    ): SelfHealingLocator {
        return new SelfHealingLocator(page, def.selector, def.metadata, logger, aiProvider);
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns the primary Playwright `Locator` directly, without running any
     * probe or healing phase. Use this when you need to pass the locator to a
     * helper (e.g. `actions.click`) but want to avoid the `get()` probe delay
     * that can mis-fire on elements sensitive to React mount timing.
     *
     * The selector still lives in one place (the locator repository) — this
     * just skips the async probe gate.
     */
    get locator(): Locator {
        return this.primaryLocatorOverride ?? this.page.locator(this.primarySelector);
    }

    /**
     * Resolves to a working Playwright `Locator` using the three-phase strategy.
     *
     * On the first call the three phases run in order. Once a healed locator is
     * found (Phase 2 or Phase 3), it is cached and returned immediately on every
     * subsequent call — avoiding redundant Gemini/Claude API requests and
     * preventing the "primary locator failure" that occurs when a later call
     * re-runs the healing chain and Phase 3 happens to return nothing.
     *
     * @param probeTimeout - Per-strategy probe timeout in ms (default 2 000).
     *                       Keep short; the action's own Playwright timeout still applies.
     */
    async get(probeTimeout: number = 2000): Promise<Locator> {
        // ── Cache: return previously healed locator immediately ────────────────
        if (this._cachedHealedLocator) {
            this.logger.debug(
                `[SelfHealingLocator] ✓ Returning cached healed locator for "${this.metadata.description}"`
            );
            return this._cachedHealedLocator;
        }

        // ── Phase 1: Primary selector ──────────────────────────────────────────
        const primaryLocator = this.primaryLocatorOverride ?? this.page.locator(this.primarySelector);
        if (await this.probe(primaryLocator, probeTimeout)) {
            this._resolution = 'primary';
            this.logger.debug(
                `[SelfHealingLocator] ✓ Primary resolved: "${this.metadata.description}" → ${this.primarySelector}`
            );
            return primaryLocator;
        }

        this.logger.warn(
            `[SelfHealingLocator] Primary selector failed for "${this.metadata.description}": ${this.primarySelector} — starting self-healing…`
        );

        // ── Phase 2: Semantic auto-strategies ──────────────────────────────────
        const semanticStrategies = this.buildSemanticStrategies();
        this.logger.warn(
            `[SelfHealingLocator] Phase 2 — trying ${semanticStrategies.length} semantic strategies for "${this.metadata.description}"…`
        );
        for (const { locator, label } of semanticStrategies) {
            const passed = await this.probe(locator, probeTimeout);
            this.logger.warn(
                `[SelfHealingLocator] Phase 2 probe [${passed ? 'PASS' : 'FAIL'}] "${this.metadata.description}" ← ${label}`
            );
            if (passed) {
                this._resolution = 'healed';
                this._healedStrategy = `Semantic: ${label}`;
                this._cachedHealedLocator = locator;
                return locator;
            }
        }

        // ── Phase 3: AI healing via Playwright MCP (opt-in) ────────────────────
        this.logger.warn(
            `[SelfHealingLocator] Phase 2 exhausted for "${this.metadata.description}". ` +
            `AI provider: ${this.aiProvider ? 'CONFIGURED ✓' : 'NOT configured ✗ (set ANTHROPIC_API_KEY or GEMINI_API_KEY in .env to enable)'}`
        );
        if (this.aiProvider) {
            this.logger.warn(
                `[SelfHealingLocator] Invoking AI healing (Phase 3) for "${this.metadata.description}"…`
            );
            const aiLocator = await this.tryAIHealing(probeTimeout);
            if (aiLocator) {
                this._cachedHealedLocator = aiLocator;
                return aiLocator;
            }
        }

        // ── All strategies failed — mark as failed and surface natural Playwright error ──
        this._resolution = 'failed';
        this.logger.error(
            `[SelfHealingLocator] ✗ All healing strategies failed for "${this.metadata.description}". ` +
            `Returning primary selector — expect a Playwright timeout error.`
        );
        return primaryLocator;
    }

    /** `true` when `get()` resolved via a non-primary (healed) strategy */
    wasHealed(): boolean {
        return this._resolution === 'healed';
    }

    /** `true` when `get()` was called at least once during the test */
    wasUsed(): boolean {
        return this._resolution !== 'pending';
    }

    /**
     * One-line summary suitable for post-test reports.
     * Accurately reflects all four possible outcomes.
     */
    getHealingReport(): string {
        switch (this._resolution) {
            case 'pending': return `◌ NOT USED — "${this.metadata.description}"`;
            case 'primary': return `✓ PRIMARY  — "${this.metadata.description}"`;
            case 'healed':  return `⚠ HEALED   — "${this.metadata.description}" via [${this._healedStrategy}]`;
            case 'failed':  return `✗ FAILED   — "${this.metadata.description}" (all strategies exhausted)`;
        }
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    /** Returns `true` if the locator finds an attached element before `timeout` ms. */
    private async probe(locator: Locator, timeout: number): Promise<boolean> {
        try {
            await locator.waitFor({ state: 'attached', timeout });
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Builds an ordered list of Playwright semantic locators derived from
     * `ElementMetadata`. Only non-null fields contribute a strategy.
     */
    private buildSemanticStrategies(): Array<{ locator: Locator; label: string }> {
        const strategies: Array<{ locator: Locator; label: string }> = [];
        const { role, name, label, placeholder, text, altText, testId } = this.metadata;

        if (role && name) {
            strategies.push({
                locator: this.page.getByRole(role, { name, exact: true }),
                label:   `getByRole('${role}', { name: '${name}', exact: true })`,
            });
        }
        if (role && !name) {
            strategies.push({
                locator: this.page.getByRole(role),
                label:   `getByRole('${role}')`,
            });
        }
        if (label) {
            strategies.push({
                locator: this.page.getByLabel(label),
                label:   `getByLabel('${label}')`,
            });
        }
        if (placeholder) {
            strategies.push({
                locator: this.page.getByPlaceholder(placeholder),
                label:   `getByPlaceholder('${placeholder}')`,
            });
        }
        if (text) {
            strategies.push({
                locator: this.page.getByText(text, { exact: true }),
                label:   `getByText('${text}', exact)`,
            });
        }
        if (altText) {
            strategies.push({
                locator: this.page.getByAltText(altText),
                label:   `getByAltText('${altText}')`,
            });
        }
        if (testId) {
            strategies.push({
                locator: this.page.getByTestId(testId),
                label:   `getByTestId('${testId}')`,
            });
        }

        return strategies;
    }

    /**
     * Builds the description string passed to the AI provider.
     *
     * Only the ARIA `role` is appended as a structural hint — it narrows the
     * element type without risking stale content (role rarely changes).
     * Content-based fields (name, text, label, testId, placeholder) are
     * intentionally excluded: their values may be outdated, and including
     * them causes the AI to generate selectors from wrong hints rather than
     * reading the actual snapshot content.
     *
     * Example output:
     *   "Bulk Register button on the Reagents page [role: button]"
     */
    private buildEnrichedDescription(): string {
        return this.metadata.role
            ? `${this.metadata.description} [role: ${this.metadata.role}]`
            : this.metadata.description;
    }

    /**
     * Invokes the AI provider with the element description and tries up to 3
     * selector candidates in order.
     *
     * Candidate resolution:
     *   - If the provider implements `suggestSelectors()`, that is called and may
     *     return up to 3 candidates ordered from most to least specific.
     *   - Otherwise `suggestSelector()` is called and its result is treated as a
     *     single-item list (backward-compatible with custom providers).
     *
     * Probe behaviour (best-effort):
     *   Each candidate is probed for visibility within `probeTimeout` ms.
     *   The first candidate that passes is returned immediately.
     *   If no candidate passes the probe, candidate 1 is still returned to the
     *   caller — trusting AI over the known-broken primary selector — and the
     *   action's own Playwright timeout handles the wait.
     */
    private async tryAIHealing(probeTimeout: number): Promise<Locator | null> {
        try {
            // Build an enriched description that includes semantic metadata hints so
            // the AI can generate targeted ARIA-based selector candidates.
            const enrichedDescription = this.buildEnrichedDescription();

            // Collect candidates — prefer suggestSelectors() (multi), fall back to suggestSelector()
            const raw: string[] = this.aiProvider!.suggestSelectors
                ? await this.aiProvider!.suggestSelectors(enrichedDescription)
                : await this.aiProvider!
                      .suggestSelector(enrichedDescription)
                      .then(s => (s && s !== 'UNABLE_TO_HEAL' ? [s] : []));

            const candidates = raw
                .map(s => s.trim())
                .filter(s => s.length > 0 && s !== 'UNABLE_TO_HEAL');

            if (candidates.length === 0) {
                this.logger.warn(
                    `[SelfHealingLocator] AI could not suggest a selector for "${this.metadata.description}"`
                );
                return null;
            }

            const total    = candidates.length;
            const locators = candidates.map(s => this.page.locator(s));

            // Try each candidate — return the first whose probe passes
            for (let i = 0; i < total; i++) {
                if (await this.probe(locators[i], probeTimeout)) {
                    this._resolution    = 'healed';
                    this._healedStrategy = `AI[${i + 1}/${total}]: ${candidates[i]}`;
                    this.logger.warn(
                        `[SelfHealingLocator] ✨ AI-healed "${this.metadata.description}" ` +
                        `(candidate ${i + 1}/${total} probe passed): "${candidates[i]}"`
                    );
                    return locators[i];
                }
                this.logger.warn(
                    `[SelfHealingLocator] AI candidate ${i + 1}/${total} probe failed ` +
                    `for "${this.metadata.description}": "${candidates[i]}"`
                );
            }

            // No individual probe passed — build a composite OR-locator so the
            // action's own Playwright timeout can race all candidates simultaneously.
            // locator.or() resolves to whichever candidate becomes interactable first
            // without triggering strict-mode errors when only one matches.
            const composite = locators.reduce((acc, loc) => acc.or(loc));
            this._resolution    = 'healed';
            this._healedStrategy = `AI[composite ${total}]: ${candidates.join(' | ')}`;
            this.logger.warn(
                `[SelfHealingLocator] ✨ AI-healed "${this.metadata.description}" ` +
                `(no probe passed — composite OR of all ${total} candidates handed to action): ` +
                `[${candidates.map((c, i) => `${i + 1}: "${c}"`).join(', ')}]`
            );
            return composite;
        } catch (error) {
            this.logger.error(
                `[SelfHealingLocator] AI healing threw an error for "${this.metadata.description}": ${error}`
            );
        }

        return null;
    }
}
