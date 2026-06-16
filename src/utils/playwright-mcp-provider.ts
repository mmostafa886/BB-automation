import { type Page } from '@playwright/test';
import { createConnection } from '@playwright/mcp';
import { type AIHealingProvider } from './self-healing-locator';

type MCPToolDef = { name: string; description?: string; inputSchema: object };
type MCPToolResult = { content: Array<{ type: string; text?: string }> };
type MCPClient = {
    connect(transport: unknown): Promise<void>;
    listTools(): Promise<{ tools: MCPToolDef[] }>;
    callTool(args: { name: string; arguments: Record<string, unknown> }): Promise<MCPToolResult>;
    close(): Promise<void>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Shared MCP setup helper
// Both providers (Anthropic + Gemini) spin up the same in-process MCP server.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a `@playwright/mcp` server attached to the test's existing
 * `BrowserContext`, wires it to a `Client` via Playwright's own
 * `InProcessTransport`, and returns both the ready client and a cleanup
 * function.
 *
 * Uses `playwright-core/lib/mcpBundle` (Client) and
 * `playwright/lib/mcp/sdk/inProcessTransport` (transport) — the same internal
 * bundle that `createConnection` uses for its server — so the message protocol
 * is guaranteed to be compatible.
 */
async function createMCPClient(page: Page): Promise<{ client: MCPClient; cleanup: () => Promise<void> }> {
    // ── Polyfill ConsoleMessage.timestamp() ────────────────────────────────────
    // @playwright/mcp 0.0.68 bundles playwright@1.59.0-alpha which calls
    // message.timestamp() in its Tab class when the browser emits console events.
    // playwright-core@1.58.x does not have this method, so every console log
    // during MCP healing throws "TypeError: message.timestamp is not a function"
    // which Playwright captures as an unhandled rejection and fails the test.
    // The guard ensures this one-time patch is idempotent.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const _path = require('path') as typeof import('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const _pwcDir = _path.dirname(require.resolve('playwright-core/package.json'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConsoleMessage } = require(_path.join(_pwcDir, 'lib/client/consoleMessage')) as {
        ConsoleMessage: { prototype: Record<string, unknown> };
    };
    if (typeof ConsoleMessage.prototype['timestamp'] !== 'function') {
        ConsoleMessage.prototype['timestamp'] = () => Date.now();
    }

    // @playwright/mcp's SimpleBrowserContextFactory wraps the context we provide with
    // `close: () => browserContext.close()` and calls it when the MCP server shuts down
    // (triggered by mcpClient.close()). We intercept that via a Proxy so the test's
    // BrowserContext is never closed by MCP teardown.
    //
    // Gap in the original single-proxy approach:
    //   MCP also stores a reference to the test page (via context.pages()[0]) and may
    //   call page.close() directly during teardown, bypassing the context proxy.
    //   It may also do page.context().close(), which returns the *real* context (not
    //   the proxy) and would close it for real.
    //
    // Fix: build two mutually-referencing proxies so every close path is intercepted.
    //   • proxyPage.close()    → no-op   (prevents MCP from closing the live test page)
    //   • proxyPage.context()  → contextProxy (ensures page.context().close() is also
    //                                          intercepted and stays a no-op)
    //   • contextProxy.close() → no-op   (prevents MCP's SimpleBrowserContextFactory teardown)
    //   • contextProxy.pages() → [proxyPage] (MCP gets a guarded page ref, not the real one)
    //
    // 'let' is required for the circular reference: proxyPage's 'context' closure
    // captures contextProxy before it is assigned, but closures are only called at
    // runtime — after both proxies are fully constructed.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const realContext = page.context() as any;

    // eslint-disable-next-line prefer-const
    let contextProxy: typeof realContext;

    const proxyPage = new Proxy(page as any, {
        get(target, prop) {
            if (prop === 'close') return () => Promise.resolve();
            if (prop === 'context') return () => contextProxy;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const val = (target as any)[prop];
            return typeof val === 'function' ? val.bind(target) : val;
        },
    });

    contextProxy = new Proxy(realContext, {
        get(target, prop) {
            if (prop === 'close') return () => Promise.resolve();
            if (prop === 'pages') return () => [proxyPage];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const val = (target as any)[prop];
            return typeof val === 'function' ? val.bind(target) : val;
        },
    });

    const contextGetter = () => Promise.resolve(contextProxy);
    const server = await createConnection({ capabilities: ['core'] }, contextGetter);

    // Use Playwright's own bundled Client + InProcessTransport so the message
    // format matches the Server returned by createConnection.
    // We resolve absolute paths via require.resolve() because the `playwright`
    // and `playwright-core` packages restrict their `exports` map and block
    // direct subpath requires like `playwright/lib/mcp/sdk/inProcessTransport`.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pwDir = path.dirname(require.resolve('playwright/package.json'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pwcDir = path.dirname(require.resolve('playwright-core/package.json'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { InProcessTransport } = require(path.join(pwDir, 'lib/mcp/sdk/inProcessTransport')) as {
        InProcessTransport: new (server: unknown) => unknown;
    };
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Client } = require(path.join(pwcDir, 'lib/mcpBundle')) as {
        Client: new (info: { name: string; version: string }) => MCPClient;
    };

    const transport = new InProcessTransport(server);
    const mcpClient = new Client({ name: 'self-healing-client', version: '1.0.0' });
    await mcpClient.connect(transport);

    return { client: mcpClient, cleanup: () => mcpClient.close() };
}

/** Returns only snapshot-related tools from the MCP server. */
async function getSnapshotTools(client: MCPClient): Promise<MCPToolDef[]> {
    const { tools } = await client.listTools();
    const snapshotOnly = tools.filter(t => t.name.includes('snapshot'));
    if (snapshotOnly.length > 0) return snapshotOnly;
    // Fallback: include navigate tools so the model can reach the page first
    return tools.filter(t => t.name.includes('navigate') || t.name.includes('snapshot'));
}

const SYSTEM_PROMPT =
    `You are a Playwright test automation expert with access to browser tools.\n` +
    `Use the snapshot tool to inspect the current page, then return 3 Playwright selector candidates.\n\n` +
    `TASK\n` +
    `Use the element description to locate the element in the snapshot, then output EXACTLY 3 raw selectors — one per line:\n` +
    `  Line 1 — most stable unique selector (data-testid, id, or unique attribute found in snapshot)\n` +
    `  Line 2 — role + visible-text selector (based on what the snapshot actually shows)\n` +
    `  Line 3 — text-content or structural fallback (exact text match, parent–child path, or class)\n\n` +
    `RULES\n` +
    `  - Use the description (including any text and role hints) to find the element in the snapshot\n` +
    `  - Derive all selector values from what the snapshot actually shows — not from the description text\n` +
    `  - Allowed formats: CSS (e.g. button[data-testid="x"]) or XPath starting with // (e.g. //button[.="Submit"])\n` +
    `  - Do NOT number the lines. Do NOT add labels, comments, or explanations.\n` +
    `  - Do NOT wrap selectors in quotes, backticks, or markdown fences.\n` +
    `  - Output ONLY the 3 raw selectors, one per line.\n` +
    `  - If the element cannot be found at all, respond with exactly: UNABLE_TO_HEAL`;

// ─────────────────────────────────────────────────────────────────────────────
// Shared selector parser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns true only when the string looks like a CSS or XPath selector.
 * Rejects natural-language apology/explanation text that the AI may emit
 * instead of UNABLE_TO_HEAL when it cannot access the browser snapshot.
 *
 * Valid patterns:
 *   XPath  — starts with // or /
 *   CSS    — starts with . # [ * or a lowercase HTML tag name
 */
function looksLikeSelector(s: string): boolean {
    if (s.startsWith('//') || s.startsWith('/')) return true;
    if (/^[.#\[*]/.test(s)) return true;
    // Lowercase tag name optionally followed by a CSS combinator or attribute
    if (/^[a-z][a-zA-Z0-9-]*(?:[\[.#:\s>~+*]|$)/.test(s)) return true;
    return false;
}

/**
 * Splits a raw multi-line AI response into up to 3 usable selector strings.
 * Strips blank lines, trims whitespace, discards UNABLE_TO_HEAL markers, and
 * rejects lines that do not look like CSS or XPath selectors (e.g. apology
 * messages the AI emits when it cannot access the browser snapshot).
 * Returns an empty array when the AI indicated it could not find the element.
 */
function parseSelectors(raw: string | null): string[] {
    if (!raw || raw.trim() === 'UNABLE_TO_HEAL') return [];
    return raw
        .split('\n')
        .map(s => s.trim())
        // Strip markdown code fence markers (``` alone, ```css, ```xpath, etc.)
        .filter(s => s.length > 0 && !s.startsWith('`') && s !== 'UNABLE_TO_HEAL' && looksLikeSelector(s))
        .slice(0, 3);
}

// ─────────────────────────────────────────────────────────────────────────────
// PlaywrightMCPHealingProvider  (Anthropic / Claude)
// ─────────────────────────────────────────────────────────────────────────────

type TextBlock = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ContentBlock = TextBlock | ToolUseBlock;
type MCPContent = Array<unknown>;
type AnthropicTool = { name: string; description: string; input_schema: object };
type MessageParam = { role: string; content: unknown };
interface AnthropicResponse { stop_reason: string; content: ContentBlock[] }

/**
 * PlaywrightMCPHealingProvider — Phase 3 self-healing via `@playwright/mcp` + Claude.
 *
 * Spins up an in-process MCP server attached to the test's own browser context,
 * exposes `browser_snapshot` (ARIA accessibility tree) to Claude via Anthropic
 * tool_use, and returns the selector Claude suggests.
 *
 * ## Configuration
 * ```env
 * ANTHROPIC_API_KEY=sk-ant-...          # required
 * ANTHROPIC_MODEL=claude-sonnet-4-6     # optional (default)
 * ```
 */
export class PlaywrightMCPHealingProvider implements AIHealingProvider {
    constructor(
        private readonly page: Page,
        private readonly apiKey: string,
        private readonly model: string = 'claude-sonnet-4-6',
        private readonly apiVersion: string = '2023-06-01',
    ) { }

    async suggestSelectors(description: string): Promise<string[]> {
        const { client, cleanup } = await createMCPClient(this.page);
        try {
            const raw = await this.runAgenticLoop(client, description);
            return parseSelectors(raw);
        } finally {
            // Swallow close errors — mcpClient.close() fires async internal
            // handlers that can throw (e.g. message.timestamp protocol errors)
            // after the result is already obtained. These are not actionable.
            await cleanup().catch(() => { /* ignore close errors */ });
        }
    }

    async suggestSelector(description: string): Promise<string | null> {
        const candidates = await this.suggestSelectors(description);
        return candidates[0] ?? null;
    }

    private async runAgenticLoop(mcpClient: MCPClient, description: string): Promise<string | null> {
        const snapshotTools = await getSnapshotTools(mcpClient);

        const anthropicTools: AnthropicTool[] = snapshotTools.map(t => ({
            name: t.name,
            description: t.description ?? `Playwright MCP tool: ${t.name}`,
            input_schema: t.inputSchema,
        }));

        const messages: MessageParam[] = [
            { role: 'user', content: `Find a reliable Playwright selector for: "${description}"` },
        ];

        for (let turn = 0; turn < 3; turn++) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': this.apiVersion,
                },
                body: JSON.stringify({
                    model: this.model,
                    max_tokens: 1024,
                    system: SYSTEM_PROMPT,
                    tools: anthropicTools,
                    messages,
                }),
            });

            if (!response.ok) {
                throw new Error(`Anthropic API (MCP provider) error ${response.status}: ${await response.text()}`);
            }

            const data = await response.json() as AnthropicResponse;

            if (data.stop_reason === 'end_turn') {
                const text = (data.content.find(b => b.type === 'text') as TextBlock | undefined)
                    ?.text?.trim() ?? null;
                return (!text || text === 'UNABLE_TO_HEAL') ? null : text;
            }

            if (data.stop_reason === 'tool_use') {
                const toolUse = data.content.find(b => b.type === 'tool_use') as ToolUseBlock | undefined;
                if (!toolUse) break;

                const toolResult: MCPToolResult = await mcpClient.callTool({
                    name: toolUse.name,
                    arguments: toolUse.input,
                });

                const resultContent = toolResult.content
                    .map((c: { type: string; text?: string }) => c.text ?? JSON.stringify(c))
                    .join('\n');

                messages.push({ role: 'assistant', content: data.content as MCPContent });
                messages.push({
                    role: 'user',
                    content: [{
                        type: 'tool_result',
                        tool_use_id: toolUse.id,
                        content: resultContent,
                    }],
                });
            } else {
                break;
            }
        }

        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GeminiMCPHealingProvider  (Google Gemini)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calls `fetch` with exponential-backoff retry on HTTP 429 (rate limit).
 * Waits `baseDelayMs * 2^attempt` ms between retries (capped at `maxDelayMs`).
 */
async function fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries = 3,
    baseDelayMs = 5000,
    maxDelayMs = 60_000,
): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, init);
        if (res.status !== 429 || attempt === maxRetries) return res;

        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
    // unreachable — satisfies TypeScript
    return fetch(url, init);
}

type GeminiContent = { role: string; parts: Array<{ text: string }> };
interface GeminiResponse {
    candidates?: Array<{ content?: GeminiContent }>;
}

const GEMINI_SYSTEM_PROMPT =
    `You are a Playwright test automation expert.\n` +
    `You will be given an ARIA accessibility-tree snapshot of the current page.\n` +
    `Use it to find the element described and return a Playwright selector.\n\n` +
    `Respond with ONLY the raw selector string — one of:\n` +
    `  - CSS selector (e.g. input[name="username"], button[aria-label="Submit"])\n` +
    `  - XPath starting with // (e.g. //button[normalize-space()="Submit"])\n` +
    `Do NOT wrap it in quotes, backticks, or markdown fences.\n` +
    `Do NOT add any explanation, label, or formatting — just the raw selector.\n` +
    `If you cannot find the element, respond with exactly: UNABLE_TO_HEAL`;

/**
 * GeminiMCPHealingProvider — Phase 3 self-healing via `@playwright/mcp` + Gemini.
 *
 * Takes an ARIA snapshot directly via the MCP client (no function-calling),
 * embeds it in the prompt, and asks Gemini to return a selector in a single
 * text turn. This avoids Gemini's unreliable function-calling behaviour.
 *
 * - The MCP server attaches to the test's existing `BrowserContext` — same auth,
 *   same DOM, no extra navigation.
 *
 * ## Configuration
 * ```env
 * GEMINI_API_KEY=AIza...                # required
 * GEMINI_MODEL=gemini-2.0-flash         # optional (default)
 * ```
 */
export class GeminiMCPHealingProvider implements AIHealingProvider {
    constructor(
        private readonly page: Page,
        private readonly apiKey: string,
        private readonly model: string = 'gemini-2.0-flash',
    ) { }

    async suggestSelectors(description: string): Promise<string[]> {
        const { client, cleanup } = await createMCPClient(this.page);
        try {
            // Take the ARIA snapshot ourselves — no function-calling needed
            const snapshotTools = await getSnapshotTools(client);
            const snapshotTool = snapshotTools[0];
            if (!snapshotTool) return [];

            const snapshotResult = await client.callTool({ name: snapshotTool.name, arguments: {} });
            const snapshot = snapshotResult.content
                .map((c: { type: string; text?: string }) => c.text ?? JSON.stringify(c))
                .join('\n');

            const raw = await this.askGemini(snapshot, description);
            return parseSelectors(raw);
        } finally {
            // Swallow close errors — mcpClient.close() fires async internal
            // handlers that can throw (e.g. message.timestamp protocol errors)
            // after the result is already obtained. These are not actionable.
            await cleanup().catch(() => { /* ignore close errors */ });
        }
    }

    async suggestSelector(description: string): Promise<string | null> {
        const candidates = await this.suggestSelectors(description);
        return candidates[0] ?? null;
    }

    private async askGemini(snapshot: string, description: string): Promise<string | null> {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

        const contents: GeminiContent[] = [{
            role: 'user',
            parts: [{ text: `Page snapshot:\n${snapshot}\n\nFind a reliable Playwright selector for: "${description}"` }],
        }];

        const response = await fetchWithRetry(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
                contents,
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API (MCP provider) error ${response.status}: ${await response.text()}`);
        }

        const data = await response.json() as GeminiResponse;
        const parts = data.candidates?.[0]?.content?.parts;
        if (!parts) return null;

        const text = parts.find(p => 'text' in p)?.text?.trim() ?? null;
        return (!text || text === 'UNABLE_TO_HEAL') ? null : text;
    }
}
