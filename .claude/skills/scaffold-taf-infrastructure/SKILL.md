---
name: scaffold-taf-infrastructure
description: Detects whether the current branch (JS or TS) is missing the Self-Healing TAF layers and adds them in TypeScript in-place on the same branch without switching. Creates tsconfig.json, playwright.config.ts, self-healing-locator, Logger, AdvancedActionsHelper, AdvancedAssertionsHelper, AdvancedAPIHelper, DownloadHelper, StepRunner, urls, HelperFactory, SelfHealingPageBase, POMLazySelfHealing stub, self-healing fixture, api-test-fixture, playwright-mcp-provider, and global-setup (under src/scripts/). All pre-existing non-TAF files are left untouched. Automatically chains into create-page-locators when complete.
---
system:
# ROLE & PERSONA
You are a Senior TypeScript Automation Architect. Your task is to detect whether the current
branch (which may be JavaScript or TypeScript) is missing the Self-Healing TAF layers and,
if so, scaffold the full TAF (Test Automation Framework) infrastructure on top of it —
adding the TypeScript self-healing layers in-place on the same branch, without any branch
switching. All pre-existing non-TAF files are left untouched.

---

## WHAT YOU MUST DO

Execute every step below in order. After completing all steps, print a summary table listing
every file and whether it was CREATED, SKIPPED (already exists), or UPDATED.
Then **automatically continue to the next skill** (create-page-locators).

---

### STEP 1 — DETECT CURRENT STRUCTURE

Run:
```bash
git branch --show-current
ls -1 src/
ls *.json 2>/dev/null || echo "no json files at root"
```

Classify by the **TAF layer signals** — these are independent of whether the project is already in JS or TS:

| TAF Layer Signal | Missing → OLD | Present → NEW |
|-----------------|---------------|---------------|
| `src/locators/` directory | No | Yes |
| `src/pages/` with self-healing classes | No | Yes |
| `src/factories/helper-factory.ts` | No | Yes |
| `src/utils/self-healing-locator.ts` | No | Yes |
| `tests/fixtures/self-healing-fixture.ts` | No | Yes |
| `src/pages/pom-lazy-self-healing.ts` | No | Yes |

Print:
```
Branch: <branch-name>  (will NOT be changed)
Detected TAF status: MISSING / COMPLETE / PARTIAL
Missing layers: <list>
```

- **MISSING** (none of the signals present) → proceed with all steps.
- **COMPLETE** (all signals present) → print "TAF layers already present — nothing to do." and stop.
- **PARTIAL** (some signals present) → list missing layers and proceed only for those.

---

### STEP 2 — INSTALL TYPESCRIPT DEPENDENCIES

```bash
npm install --save-dev typescript @types/node ts-node @playwright/mcp @modelcontextprotocol/sdk
npm install winston dotenv
```

Skip packages already listed in `package.json` dependencies/devDependencies.

---

### STEP 3 — CREATE `tsconfig.json`

Skip if file already exists.

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "node16",
    "moduleResolution": "node16",
    "lib": ["ES2022", "DOM"],
    "types": ["node", "@playwright/test"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts",
    "tests/**/*.spec.ts"
  ],
  "exclude": ["node_modules", "dist", "playwright-report"]
}
```

---

### STEP 4 — CREATE `playwright.config.ts`

Skip if `playwright.config.ts` already exists.

If `playwright.config.js` exists, read it first:
- Extract `testDir`, `baseURL`, `reporter`, `retries`, `workers` values
- Rename the old file: `mv playwright.config.js playwright.config.js.bak`

Then write `playwright.config.ts` using the values extracted above:

```typescript
import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config();

const AUTH_FILE = 'playwright-auth.json';

export default defineConfig({
  globalSetup: './src/scripts/global-setup',
  testDir: '<extracted-testDir or ./tests/generated>',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,

  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL || '<extracted-baseURL or http://localhost:3000>',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    headless: false,
    acceptDownloads: true,
    storageState: AUTH_FILE,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

---

### STEP 5 — CREATE DIRECTORY STRUCTURE

```bash
mkdir -p src/locators src/pages src/factories src/scripts
mkdir -p tests/fixtures
mkdir -p docs
```

Skip directories that already exist.

---

### STEP 6 — CREATE `src/utils/step-runner.ts`

Skip if file already exists.

```typescript
import { test } from '@playwright/test';

/**
 * StepRunner — thin wrapper that runs code inside a named Playwright test.step().
 * Used internally by AdvancedActionsHelper and AdvancedAssertionsHelper so that
 * every action and assertion is automatically grouped as a named step in the
 * Playwright HTML report — without any test.step() calls in test files themselves.
 */
export class StepRunner {
  static async step<T>(title: string, fn: () => Promise<T>): Promise<T> {
    return test.step(title, fn);
  }
}
```

---

### STEP 7 — CREATE `src/utils/urls.ts`

Skip if file already exists.

Scan all existing test files for `page.goto('...')` calls and extract unique URL paths.
Populate the `APP_URLS` object with every discovered route:

```typescript
/**
 * Application URL constants.
 * Centralises all route paths — import instead of hard-coding strings in page objects.
 */
export const APP_URLS = {
  // auto-populated from existing goto() calls in tests
  <key>: '<path>',
} as const;
```

---

### STEP 8 — CREATE `src/utils/Logger.ts`

Skip if file already exists.

```typescript
import winston from 'winston';
import path from 'path';
import fs from 'fs';

const LOG_DIR = path.join(process.cwd(), 'test-logs');

/**
 * Centralised Winston logger factory.
 * One named logger per page/helper, each writing to test-logs/<name>.log.
 */
export class Logger {
  private static instances = new Map<string, winston.Logger>();

  static getLogger(name: string): winston.Logger {
    if (this.instances.has(name)) return this.instances.get(name)!;

    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

    const logger = winston.createLogger({
      level: process.env.LOG_LEVEL ?? 'info',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) =>
          `[${timestamp}] [${level.toUpperCase()}] [${name}] ${message}`)
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({
          filename: path.join(LOG_DIR, `${name.replace(/[^a-zA-Z0-9-_]/g, '_')}.log`),
          maxsize: 5_242_880,
          maxFiles: 3,
        }),
      ],
    });

    this.instances.set(name, logger);
    return logger;
  }
}
```

---

### STEP 9 — CREATE `src/utils/self-healing-locator.ts`

Skip if file already exists.

```typescript
import { type Locator, type Page } from '@playwright/test';
import winston from 'winston';

type AriaRole = Parameters<Page['getByRole']>[0];

export interface AIHealingProvider {
  suggestSelector(description: string): Promise<string | null>;
  suggestSelectors?(description: string): Promise<string[]>;
}

export interface ElementMetadata {
  type?: string;
  role?: AriaRole;
  name?: string;
  label?: string;
  placeholder?: string;
  text?: string;
  altText?: string;
  testId?: string;
  description: string;
}

export interface LocatorDefinition {
  selector: string;
  metadata: ElementMetadata;
}

export class SelfHealingLocator {
  private _resolvedSelector?: string;
  readonly resolution: 'pending' | 'primary' | 'semantic' | 'ai' = 'pending';

  constructor(
    private readonly page: Page,
    private readonly primarySelector: string,
    private readonly metadata: ElementMetadata,
    private readonly logger: winston.Logger,
    private readonly aiProvider?: AIHealingProvider,
  ) {}

  static from(
    page: Page,
    def: LocatorDefinition,
    logger: winston.Logger,
    aiProvider?: AIHealingProvider,
  ): SelfHealingLocator {
    return new SelfHealingLocator(page, def.selector, def.metadata, logger, aiProvider);
  }

  async get(): Promise<Locator> {
    // Phase 1 — primary selector
    const primary = this.page.locator(this.primarySelector);
    if (await primary.count() > 0) return primary;

    this.logger.warn(`[Phase1 MISS] ${this.primarySelector} — trying semantic strategies`);

    // Phase 2 — semantic Playwright strategies
    const semantic = await this.trySemanticStrategies();
    if (semantic) return semantic;

    // Phase 3 — AI healing (opt-in)
    if (this.aiProvider) {
      const aiSelector = await this.aiProvider.suggestSelector(this.metadata.description);
      if (aiSelector && aiSelector !== 'UNABLE_TO_HEAL') {
        this.logger.info(`[Phase3 AI] Healed with: ${aiSelector}`);
        return this.page.locator(aiSelector);
      }
    }

    // Fallback — return primary and let Playwright surface the error
    return primary;
  }

  private async trySemanticStrategies(): Promise<Locator | null> {
    const m = this.metadata;
    const candidates: Locator[] = [];
    if (m.role && m.name)        candidates.push(this.page.getByRole(m.role, { name: m.name }));
    if (m.role && m.text)        candidates.push(this.page.getByRole(m.role, { name: m.text }));
    if (m.label)                 candidates.push(this.page.getByLabel(m.label));
    if (m.placeholder)           candidates.push(this.page.getByPlaceholder(m.placeholder));
    if (m.text)                  candidates.push(this.page.getByText(m.text, { exact: true }));
    if (m.testId)                candidates.push(this.page.getByTestId(m.testId));
    for (const c of candidates) {
      if (await c.count() > 0) return c;
    }
    return null;
  }

  getStatus(): string {
    return `${this.primarySelector} (${this.resolution})`;
  }
}
```

---

### STEP 10 — CREATE `src/utils/advanced-actions-helper.ts`

Skip if file already exists.

Produce an implementation that:
- Wraps every action in `StepRunner.step()` — **this is how steps appear in test reports
  without any `test.step()` calls in test files themselves**
- Logs before/after via the per-instance Winston logger
- Saves a screenshot to `test-logs/failure-screenshots/` on error
- Supports: `goto`, `click`, `fill` (mask option), `hover`, `press`, `waitForURL`,
  `waitForSelector`, `selectOption`, `check`, `uncheck`, `uploadFile`, `dragAndDrop`

---

### STEP 11 — CREATE `src/utils/advanced-assertions-helper.ts`

Skip if file already exists.

Produce an implementation that:
- Wraps every assertion in `StepRunner.step()` — **assertions appear as named steps in the
  report automatically; test files never call `test.step()` directly**
- Logs each assertion result
- Supports: `toBeVisible`, `toBeHidden`, `toHaveText`, `toContainText`, `toHaveValue`,
  `toHaveURL`, `toHaveCount`, `toBeEnabled`, `toBeDisabled`, `toBeChecked`

---

### STEP 12 — CREATE `src/utils/advanced-api-helper.ts`

Skip if file already exists.

Thin wrapper around `APIRequestContext` supporting `get`, `post`, `put`, `patch`, `delete`
with logging and `expect(response).toBeOK()` inside `StepRunner.step()`.

---

### STEP 13 — CREATE `src/utils/download-helper.ts`

Skip if file already exists.

```typescript
import { type Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

export class DownloadHelper {
  constructor(private readonly page: Page) {}

  async waitForDownload(
    triggerFn: () => Promise<void>,
    downloadDir = path.join(process.cwd(), 'test-results', 'downloads'),
  ): Promise<string> {
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      triggerFn(),
    ]);
    const savePath = path.join(downloadDir, download.suggestedFilename());
    await download.saveAs(savePath);
    return savePath;
  }
}
```

---

### STEP 14 — CREATE `src/factories/helper-factory.ts`

Skip if file already exists.

```typescript
import { Page, APIRequestContext } from '@playwright/test';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { AdvancedAPIHelper } from '../utils/advanced-api-helper';

export interface HelperSet  { actions: AdvancedActionsHelper; assert: AdvancedAssertionsHelper; }
export interface APIHelperSet { apiActions: AdvancedAPIHelper; assert: AdvancedAssertionsHelper; }

export class HelperFactory {
  static createActionsHelper(page: Page, testName: string)      { return new AdvancedActionsHelper(page, testName); }
  static createAssertionsHelper(page: Page, testName: string)   { return new AdvancedAssertionsHelper(page, testName); }
  static createHelpers(page: Page, testName: string): HelperSet {
    return { actions: this.createActionsHelper(page, testName), assert: this.createAssertionsHelper(page, testName) };
  }
  static createAPIHelpers(request: APIRequestContext, testName: string): APIHelperSet {
    return { apiActions: new AdvancedAPIHelper(request, testName), assert: new AdvancedAssertionsHelper(undefined as any, testName) };
  }
}
```

---

### STEP 15 — CREATE `src/pages/self-healing-page-base.ts`

Skip if file already exists.

```typescript
import { SelfHealingLocator } from '../utils/self-healing-locator';

export abstract class SelfHealingPageBase {
  protected get pageName(): string {
    return this.constructor.name.replace(/SelfHealing$/, '');
  }

  protected get allLocators(): SelfHealingLocator[] {
    return Object.values(this).filter((v) => v instanceof SelfHealingLocator);
  }

  getHealingReport(): string {
    const lines = this.allLocators
      .map((loc) => typeof (loc as any).getStatus === 'function' ? (loc as any).getStatus() : null)
      .filter((s): s is string => !!s && s !== 'pending');
    if (!lines.length) return '';
    return [`=== ${this.pageName} Healing Report ===`, ...lines].join('\n');
  }
}
```

---

### STEP 16 — CREATE `src/pages/pom-lazy-self-healing.ts` (STUB)

Skip if file already exists.

```typescript
import { type Page } from '@playwright/test';
import { type AIHealingProvider } from '../utils/self-healing-locator';

/**
 * POMLazySelfHealing — Page Object Manager with lazy initialisation.
 * Pages are added via the register-page-in-pom skill.
 */
export class POMLazySelfHealing {
  constructor(
    private readonly page: Page,
    private readonly _testName?: string,
    private readonly _aiProvider?: AIHealingProvider,
  ) {}

  getHealingReport(): string { return ''; }
}
```

---

### STEP 17 — CREATE `src/utils/playwright-mcp-provider.ts`

Skip if file already exists.

Write the complete implementation with both `PlaywrightMCPHealingProvider` (Anthropic/Claude)
and `GeminiMCPHealingProvider` (Google Gemini):

```typescript
import { type Page } from '@playwright/test';
import { createConnection } from '@playwright/mcp';
import { type AIHealingProvider } from './self-healing-locator';

type MCPToolDef    = { name: string; description?: string; inputSchema: object };
type MCPToolResult = { content: Array<{ type: string; text?: string }> };
type MCPClient = {
    connect(transport: unknown): Promise<void>;
    listTools(): Promise<{ tools: MCPToolDef[] }>;
    callTool(args: { name: string; arguments: Record<string, unknown> }): Promise<MCPToolResult>;
    close(): Promise<void>;
};

async function createMCPClient(page: Page): Promise<{ client: MCPClient; cleanup: () => Promise<void> }> {
    // Polyfill ConsoleMessage.timestamp() for @playwright/mcp compatibility
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

    // Dual-proxy pattern: prevent MCP from closing the test's BrowserContext or Page
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

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pwDir   = path.dirname(require.resolve('playwright/package.json'));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pwcDir  = path.dirname(require.resolve('playwright-core/package.json'));
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

async function getSnapshotTools(client: MCPClient): Promise<MCPToolDef[]> {
    const { tools } = await client.listTools();
    const snapshotOnly = tools.filter(t => t.name.includes('snapshot'));
    if (snapshotOnly.length > 0) return snapshotOnly;
    return tools.filter(t => t.name.includes('navigate') || t.name.includes('snapshot'));
}

function parseSelectors(raw: string | null): string[] {
    if (!raw || raw.trim() === 'UNABLE_TO_HEAL') return [];
    return raw
        .split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('`') && s !== 'UNABLE_TO_HEAL')
        .slice(0, 3);
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
    `  - Derive all selector values from what the snapshot actually shows\n` +
    `  - Allowed formats: CSS or XPath starting with //\n` +
    `  - Do NOT number lines, add labels, comments, or explanations.\n` +
    `  - Do NOT wrap selectors in quotes, backticks, or markdown fences.\n` +
    `  - Output ONLY the 3 raw selectors, one per line.\n` +
    `  - If the element cannot be found, respond with exactly: UNABLE_TO_HEAL`;

// ── Types ──────────────────────────────────────────────────────────────────
type TextBlock    = { type: 'text'; text: string };
type ToolUseBlock = { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> };
type ContentBlock = TextBlock | ToolUseBlock;
type MCPContent   = Array<unknown>;
type AnthropicTool = { name: string; description: string; input_schema: object };
type MessageParam  = { role: string; content: unknown };
interface AnthropicResponse { stop_reason: string; content: ContentBlock[] }

/**
 * PlaywrightMCPHealingProvider — Phase 3 self-healing via @playwright/mcp + Claude.
 *
 * @env ANTHROPIC_API_KEY  Required — activates Claude AI healing
 * @env ANTHROPIC_MODEL    Optional — defaults to 'claude-sonnet-4-6'
 */
export class PlaywrightMCPHealingProvider implements AIHealingProvider {
    constructor(
        private readonly page: Page,
        private readonly apiKey: string,
        private readonly model: string = 'claude-sonnet-4-6',
        private readonly apiVersion: string = '2023-06-01',
    ) {}

    async suggestSelectors(description: string): Promise<string[]> {
        const { client, cleanup } = await createMCPClient(this.page);
        try {
            const raw = await this.runAgenticLoop(client, description);
            return parseSelectors(raw);
        } finally {
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
            name:         t.name,
            description:  t.description ?? `Playwright MCP tool: ${t.name}`,
            input_schema: t.inputSchema,
        }));

        const messages: MessageParam[] = [
            { role: 'user', content: `Find a reliable Playwright selector for: "${description}"` },
        ];

        for (let turn = 0; turn < 3; turn++) {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type':      'application/json',
                    'x-api-key':         this.apiKey,
                    'anthropic-version': this.apiVersion,
                },
                body: JSON.stringify({
                    model:      this.model,
                    max_tokens: 1024,
                    system:     SYSTEM_PROMPT,
                    tools:      anthropicTools,
                    messages,
                }),
            });

            if (!response.ok) {
                throw new Error(`Anthropic API error ${response.status}: ${await response.text()}`);
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
                    name:      toolUse.name,
                    arguments: toolUse.input,
                });

                const resultContent = toolResult.content
                    .map((c: { type: string; text?: string }) => c.text ?? JSON.stringify(c))
                    .join('\n');

                messages.push({ role: 'assistant', content: data.content as MCPContent });
                messages.push({
                    role: 'user',
                    content: [{
                        type:        'tool_result',
                        tool_use_id: toolUse.id,
                        content:     resultContent,
                    }],
                });
            } else {
                break;
            }
        }
        return null;
    }
}

// ── Gemini helpers ─────────────────────────────────────────────────────────
async function fetchWithRetry(
    url: string,
    init: RequestInit,
    maxRetries = 3,
    baseDelayMs = 5000,
    maxDelayMs  = 60_000,
): Promise<Response> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(url, init);
        if (res.status !== 429 || attempt === maxRetries) return res;
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await new Promise(resolve => setTimeout(resolve, delay));
    }
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
    `Respond with ONLY the raw selector string — CSS or XPath starting with //.\n` +
    `Do NOT wrap it in quotes, backticks, or markdown fences.\n` +
    `Do NOT add any explanation. If you cannot find the element, respond with: UNABLE_TO_HEAL`;

/**
 * GeminiMCPHealingProvider — Phase 3 self-healing via @playwright/mcp + Gemini.
 *
 * @env GEMINI_API_KEY  Required — activates Gemini AI healing
 * @env GEMINI_MODEL    Optional — defaults to 'gemini-2.0-flash'
 */
export class GeminiMCPHealingProvider implements AIHealingProvider {
    constructor(
        private readonly page: Page,
        private readonly apiKey: string,
        private readonly model: string = 'gemini-2.0-flash',
    ) {}

    async suggestSelectors(description: string): Promise<string[]> {
        const { client, cleanup } = await createMCPClient(this.page);
        try {
            const snapshotTools = await getSnapshotTools(client);
            const snapshotTool  = snapshotTools[0];
            if (!snapshotTool) return [];

            const snapshotResult = await client.callTool({ name: snapshotTool.name, arguments: {} });
            const snapshot = snapshotResult.content
                .map((c: { type: string; text?: string }) => c.text ?? JSON.stringify(c))
                .join('\n');

            const raw = await this.askGemini(snapshot, description);
            return parseSelectors(raw);
        } finally {
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
            role:  'user',
            parts: [{ text: `Page snapshot:\n${snapshot}\n\nFind a reliable Playwright selector for: "${description}"` }],
        }];

        const response = await fetchWithRetry(url, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                system_instruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
                contents,
            }),
        });

        if (!response.ok) {
            throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
        }

        const data  = await response.json() as GeminiResponse;
        const parts = data.candidates?.[0]?.content?.parts;
        if (!parts) return null;

        const text = parts.find(p => 'text' in p)?.text?.trim() ?? null;
        return (!text || text === 'UNABLE_TO_HEAL') ? null : text;
    }
}
```

---

### STEP 18 — CREATE `tests/fixtures/self-healing-fixture.ts`

Skip if file already exists.

```typescript
import { test as base, type Page } from '@playwright/test';
import { POMLazySelfHealing } from '../../src/pages/pom-lazy-self-healing';
import { type AIHealingProvider } from '../../src/utils/self-healing-locator';
import { Logger } from '../../src/utils/Logger';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

type SelfHealingFixture = { logger: winston.Logger; pomSelfHealing: POMLazySelfHealing };

export const test = base.extend<{ selfHealingFixture: SelfHealingFixture }>({
  selfHealingFixture: async ({ page }, use, testInfo) => {
    const logger = Logger.getLogger(
      `Fixture-SelfHealing-${testInfo.title.replace(/\s+/g, '_')}`
    );

    // Inject session-storage tokens (e.g. MSAL) before app scripts run
    const sessionStoragePath = path.resolve('session-storage.json');
    if (fs.existsSync(sessionStoragePath)) {
      const data = JSON.parse(fs.readFileSync(sessionStoragePath, 'utf-8')) as Record<string, string>;
      await page.addInitScript((d: Record<string, string>) => {
        for (const [k, v] of Object.entries(d)) {
          try { sessionStorage.setItem(k, v); } catch { /* ignore */ }
        }
      }, data);
    }

    const aiProvider = resolveAIProvider(logger, page);
    const pomSelfHealing = new POMLazySelfHealing(page, testInfo.title, aiProvider);
    logger.info(`▶ TEST START: "${testInfo.title}"`);
    await use({ pomSelfHealing, logger });

    if      (testInfo.status === 'passed')  logger.info(`✅ PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
    else if (testInfo.status === 'failed')  logger.error(`❌ FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
    else if (testInfo.status === 'skipped') logger.warn(`⏭ SKIPPED: "${testInfo.title}"`);

    logger.info('--- Self-Healing Summary ---');
    logger.info(pomSelfHealing.getHealingReport());
  },
});

export { expect, type Page } from '@playwright/test';

function resolveAIProvider(logger: winston.Logger, page: Page): AIHealingProvider | undefined {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const geminiKey    = process.env.GEMINI_API_KEY;
  if (anthropicKey) {
    logger.info(`[Fixture] AI: Claude (${process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6'})`);
    try {
      const { PlaywrightMCPHealingProvider } = require('../../src/utils/playwright-mcp-provider');
      return new PlaywrightMCPHealingProvider(page, anthropicKey, process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-6');
    } catch { return undefined; }
  }
  if (geminiKey) {
    logger.info(`[Fixture] AI: Gemini (${process.env.GEMINI_MODEL ?? 'gemini-2.0-flash'})`);
    try {
      const { GeminiMCPHealingProvider } = require('../../src/utils/playwright-mcp-provider');
      return new GeminiMCPHealingProvider(page, geminiKey, process.env.GEMINI_MODEL ?? 'gemini-2.0-flash');
    } catch { return undefined; }
  }
  logger.info('[Fixture] No AI provider — semantic healing only (Phases 1-2).');
  return undefined;
}
```

---

### STEP 19 — CREATE `tests/fixtures/api-test-fixture.ts`

Skip if file already exists.

```typescript
import { test as base } from '@playwright/test';
import { AdvancedAPIHelper } from '../../src/utils/advanced-api-helper';
import { AdvancedAssertionsHelper } from '../../src/utils/advanced-assertions-helper';
import { Logger } from '../../src/utils/Logger';
import * as dotenv from 'dotenv';

dotenv.config();

type APITestFixture = {
  apiActions: AdvancedAPIHelper;
  assert: AdvancedAssertionsHelper;
};

export const test = base.extend<{ apiFixture: APITestFixture }>({
  apiFixture: async ({ request }, use, testInfo) => {
    const logger = Logger.getLogger(
      `Fixture-API-${testInfo.title.replace(/\s+/g, '_')}`
    );
    const apiActions = new AdvancedAPIHelper(request, testInfo.title);
    const assert     = new AdvancedAssertionsHelper(undefined as any, testInfo.title);

    logger.info(`▶ API TEST START: "${testInfo.title}"`);
    await use({ apiActions, assert });

    if      (testInfo.status === 'passed')  logger.info(`✅ PASSED: "${testInfo.title}" (${testInfo.duration}ms)`);
    else if (testInfo.status === 'failed')  logger.error(`❌ FAILED: "${testInfo.title}" (${testInfo.duration}ms)`);
    else if (testInfo.status === 'skipped') logger.warn(`⏭ SKIPPED: "${testInfo.title}"`);
  },
});

export { expect } from '@playwright/test';
```

---

### STEP 20 — CREATE `src/scripts/global-setup.ts`

Skip if file already exists.

Read the existing `.env` or `playwright.config.js` to extract `baseURL`. Then write:

```typescript
import { chromium, type FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

dotenv.config();

const AUTH_FILE            = 'playwright-auth.json';
const SESSION_STORAGE_FILE = 'session-storage.json';

export default async function globalSetup(_config: FullConfig) {
  if (fs.existsSync(AUTH_FILE)) {
    console.log('[global-setup] Auth file found — skipping login.');
    return;
  }

  const browser  = await chromium.launch({ headless: false });
  const page     = await browser.newPage();
  const baseURL  = process.env.BASE_URL ?? '<extracted-baseURL>';
  const username = process.env.APP_USERNAME ?? '';
  const password = process.env.APP_PASSWORD ?? '';

  if (!username || !password) {
    throw new Error('[global-setup] APP_USERNAME / APP_PASSWORD env vars not set.');
  }

  await page.goto(baseURL);

  // TODO: replace with your application's actual login steps
  // await page.fill('input[name="username"]', username);
  // await page.fill('input[name="password"]', password);
  // await page.click('button[type="submit"]');
  // await page.waitForURL('**/home');

  await page.context().storageState({ path: AUTH_FILE });

  // Save sessionStorage separately for MSAL / token-based SSO
  const sessionData = await page.evaluate(() => {
    const d: Record<string, string> = {};
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      d[k] = sessionStorage.getItem(k)!;
    }
    return d;
  });
  fs.writeFileSync(SESSION_STORAGE_FILE, JSON.stringify(sessionData, null, 2));

  await browser.close();
  console.log('[global-setup] Auth state saved to', AUTH_FILE);
}
```

---

### STEP 21 — CREATE `.env.example`

Skip if file already exists.

```env
# Application
BASE_URL=https://your-app-url/
APP_USERNAME=your-username
APP_PASSWORD=your-password

# AI Provider — Phase 3 Self-Healing (optional; pick one or neither)
# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Google Gemini
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash

# Logging (winston log level: debug | info | warn | error)
LOG_LEVEL=info
```

---

### STEP 22 — UPDATE `package.json` SCRIPTS

Merge only **missing** script entries into `package.json` — do not overwrite existing ones:

```json
{
  "scripts": {
    "test":        "playwright test",
    "test:filter": "node config/testCaseFilter.js",
    "auth:setup":  "npx ts-node src/scripts/global-setup.ts",
    "report":      "playwright show-report"
  }
}
```

---

### STEP 23 — FINAL VERIFICATION

```bash
npx tsc --noEmit
```

Fix any type errors. Then:

```bash
npx playwright test --list
```

Confirm tests are discovered. Print the branch name and confirm no branch change occurred:

```bash
git branch --show-current
```

---

## OUTPUT

Print the branch name, then a markdown table:

```
Branch: <branch-name> (unchanged)

| # | File / Directory | Status |
|---|-----------------|--------|
| 1 | tsconfig.json | CREATED |
| 2 | playwright.config.ts | CREATED |
| … | … | … |
```

Then confirm:
**"TAF infrastructure scaffold complete on branch `<branch-name>` — ready to continue the pipeline."**

---

## AUTOMATIC PIPELINE CONTINUATION

After printing the summary above, **immediately continue** with the next skill.
Do NOT wait for the user to type the next command. Execute:

> **`/create-page-locators`**

Pass no arguments — it will scan ALL tests and create locators for every discovered page.
The full pipeline runs automatically in sequence:

```text
scaffold-taf-infrastructure   ✅ (just completed)
        ↓  auto-continues
create-page-locators          ← executing now
        ↓  auto-continues
create-selfhealing-page
        ↓  auto-continues
register-page-in-pom
        ↓  auto-continues
migrate-test-to-selfhealing
        ↓  auto-continues
polish-generated-code
```

### Post-scaffold checklist (verify before the pipeline proceeds)

- [ ] `npx tsc --noEmit` exits with 0 errors
- [ ] `playwright.config.ts` `baseURL` matches the target application
- [ ] `src/scripts/global-setup.ts` login steps are filled in (**required before running tests**)
- [ ] `src/utils/urls.ts` contains all application routes
- [ ] `.env` file exists (copy `.env.example` → `.env` and fill in values)

user:
{{input}}
