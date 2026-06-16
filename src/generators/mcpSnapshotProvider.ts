/**
 * MCPSnapshotProvider — Manages a Playwright MCP browser session for
 * capturing ARIA accessibility-tree snapshots of real application pages.
 *
 * Used by PlaywrightGenerator to inject live page structure into AI prompts,
 * replacing the "blind" generation approach with browser-aware context.
 *
 * Graceful fallback: if MCP fails to initialize or a page is unreachable,
 * getSnapshot() returns null and generation proceeds with text-only prompts.
 */

import path from 'path';
import fs from 'fs';
import tcGenerateLogger from '../utils/tc-generate-logger.js';

const AUTH_FILE = path.resolve('playwright-auth.json');
const USER_DATA_DIR = path.resolve('.playwright-profile');

const MAX_SNAPSHOT_CHARS = parseInt(process.env.MCP_SNAPSHOT_MAX_CHARS ?? '12000') || 12000;
const CACHE_TTL = 5 * 60 * 1000;

interface SnapshotCacheEntry {
  snapshot: string;
  timestamp: number;
}

class MCPSnapshotProvider {
  private readonly _baseUrl: string;
  private _mcpClient: unknown;
  private _server: unknown;
  private readonly _snapshotCache: Map<string, SnapshotCacheEntry>;
  _initialized: boolean;

  constructor(baseUrl?: string) {
    this._baseUrl = baseUrl || process.env.BASE_URL || 'http://localhost:3000';
    this._mcpClient = null;
    this._server = null;
    this._snapshotCache = new Map();
    this._initialized = false;
  }

  /**
   * Initializes the MCP browser session.
   *
   * Requires APP_IN_OPERATION=true in .env. If the flag is missing, empty,
   * or any value other than "true", the provider stays inactive and all
   * generation proceeds with text-only prompts (no browser launch).
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;

    if (process.env.APP_IN_OPERATION !== 'true') {
      tcGenerateLogger.info(
        '[MCPSnapshot] APP_IN_OPERATION is not "true" — skipping browser launch. ' +
        'Generation will use text-only prompts.',
      );
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createConnection } = require('@playwright/mcp') as { createConnection: (config: unknown) => Promise<unknown> };

      const config: Record<string, unknown> = {
        capabilities: ['core'],
        browser: {
          browserName: 'chromium',
          launchOptions: {
            headless: process.env.MCP_BROWSER_HEADLESS !== 'false',
          },
        },
      };

      if (fs.existsSync(USER_DATA_DIR)) {
        (config['browser'] as Record<string, unknown>)['userDataDir'] = USER_DATA_DIR;
        tcGenerateLogger.info('[MCPSnapshot] Using persistent profile: .playwright-profile/');
      } else if (fs.existsSync(AUTH_FILE)) {
        (config['browser'] as Record<string, unknown>)['contextOptions'] = { storageState: AUTH_FILE };
        tcGenerateLogger.info('[MCPSnapshot] Using storageState: playwright-auth.json');
      } else {
        tcGenerateLogger.warn('[MCPSnapshot] No auth state found — snapshots may show login page');
      }

      this._server = await createConnection(config);

      const pwDir = path.dirname(require.resolve('playwright/package.json'));
      const pwcDir = path.dirname(require.resolve('playwright-core/package.json'));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { InProcessTransport } = require(path.join(pwDir, 'lib/mcp/sdk/inProcessTransport')) as { InProcessTransport: new (server: unknown) => unknown };
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Client } = require(path.join(pwcDir, 'lib/mcpBundle')) as { Client: new (info: { name: string; version: string }) => { connect: (transport: unknown) => Promise<void>; callTool: (args: { name: string; arguments: Record<string, unknown> }) => Promise<{ content: Array<{ text?: string }> }>; close: () => Promise<void> } };

      const transport = new InProcessTransport(this._server);
      this._mcpClient = new Client({ name: 'generator-snapshot', version: '1.0.0' });
      await (this._mcpClient as { connect: (t: unknown) => Promise<void> }).connect(transport);

      this._initialized = true;
      tcGenerateLogger.info(`[MCPSnapshot] MCP browser session initialized (baseUrl: ${this._baseUrl})`);
    } catch (err) {
      tcGenerateLogger.error(`[MCPSnapshot] Failed to initialize: ${(err as Error).message}`);
      tcGenerateLogger.warn('[MCPSnapshot] Generation will proceed without browser snapshots');
      this._initialized = false;
    }
  }

  async getSnapshot(modulePath: string): Promise<string | null> {
    if (!this._initialized) return null;

    const fullUrl = new URL(modulePath, this._baseUrl).href;

    const cached = this._snapshotCache.get(fullUrl);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      tcGenerateLogger.debug(`[MCPSnapshot] Cache hit for: ${modulePath}`);
      return cached.snapshot;
    }

    try {
      const client = this._mcpClient as {
        callTool: (args: { name: string; arguments: Record<string, unknown> }) => Promise<{ content: Array<{ text?: string }> }>;
      };

      await client.callTool({ name: 'browser_navigate', arguments: { url: fullUrl } });
      const result = await client.callTool({ name: 'browser_snapshot', arguments: {} });

      const snapshot = result.content
        .map(c => c.text || JSON.stringify(c))
        .join('\n');

      const truncated = snapshot.length > MAX_SNAPSHOT_CHARS
        ? snapshot.slice(0, MAX_SNAPSHOT_CHARS) + '\n\n[... snapshot truncated ...]'
        : snapshot;

      this._snapshotCache.set(fullUrl, { snapshot: truncated, timestamp: Date.now() });

      tcGenerateLogger.info(`[MCPSnapshot] Captured snapshot for ${modulePath} (${truncated.length} chars)`);
      return truncated;
    } catch (err) {
      tcGenerateLogger.warn(`[MCPSnapshot] Failed to capture snapshot for ${modulePath}: ${(err as Error).message}`);
      return null;
    }
  }

  clearCache(): void {
    this._snapshotCache.clear();
  }

  async close(): Promise<void> {
    if (this._mcpClient) {
      try {
        await (this._mcpClient as { close: () => Promise<void> }).close();
      } catch { /* ignore close errors */ }
    }
    this._mcpClient = null;
    this._server = null;
    this._initialized = false;
    this._snapshotCache.clear();
    tcGenerateLogger.info('[MCPSnapshot] MCP browser session closed');
  }
}

export default MCPSnapshotProvider;
