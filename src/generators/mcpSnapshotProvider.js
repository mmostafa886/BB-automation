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

const path = require('path');
const fs = require('fs');
const tcGenerateLogger = require('../utils/tc-generate-logger.js');

const AUTH_FILE = path.resolve('playwright-auth.json');
const USER_DATA_DIR = path.resolve('.playwright-profile');

// Max characters of ARIA snapshot to include in AI prompts
const MAX_SNAPSHOT_CHARS = parseInt(process.env.MCP_SNAPSHOT_MAX_CHARS) || 12000;

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

class MCPSnapshotProvider {
  constructor(baseUrl) {
    this._baseUrl = baseUrl || process.env.BASE_URL || 'http://localhost:3000';
    this._mcpClient = null;
    this._server = null;
    this._snapshotCache = new Map(); // fullUrl -> { snapshot, timestamp }
    this._initialized = false;
  }

  /**
   * Initializes the MCP browser session.
   *
   * Requires APP_IN_OPERATION=true in .env. If the flag is missing, empty,
   * or any value other than "true", the provider stays inactive and all
   * generation proceeds with text-only prompts (no browser launch).
   *
   * Uses the persistent browser profile (.playwright-profile/) if it exists,
   * otherwise falls back to storageState from playwright-auth.json.
   * If neither exists, launches without auth (snapshots may show login page).
   */
  async initialize() {
    if (this._initialized) return;

    // Gate: only launch MCP browser when the app is confirmed operational
    if (process.env.APP_IN_OPERATION !== 'true') {
      tcGenerateLogger.info(
        '[MCPSnapshot] APP_IN_OPERATION is not "true" — skipping browser launch. ' +
        'Generation will use text-only prompts.'
      );
      return;
    }

    try {
      const { createConnection } = require('@playwright/mcp');

      // Build MCP config
      const config = {
        capabilities: ['core'],
        browser: {
          browserName: 'chromium',
          launchOptions: {
            headless: process.env.MCP_BROWSER_HEADLESS !== 'false',
          },
        },
      };

      // Prefer persistent profile (has sessionStorage / MSAL tokens)
      if (fs.existsSync(USER_DATA_DIR)) {
        config.browser.userDataDir = USER_DATA_DIR;
        tcGenerateLogger.info('[MCPSnapshot] Using persistent profile: .playwright-profile/');
      } else if (fs.existsSync(AUTH_FILE)) {
        config.browser.contextOptions = { storageState: AUTH_FILE };
        tcGenerateLogger.info('[MCPSnapshot] Using storageState: playwright-auth.json');
      } else {
        tcGenerateLogger.warn('[MCPSnapshot] No auth state found — snapshots may show login page');
      }

      // createConnection without contextGetter launches its own browser
      this._server = await createConnection(config);

      // Wire MCP Client via InProcessTransport — same pattern as
      // playwright-mcp-provider.ts (test-time healing)
      const pwDir = path.dirname(require.resolve('playwright/package.json'));
      const pwcDir = path.dirname(require.resolve('playwright-core/package.json'));
      const { InProcessTransport } = require(path.join(pwDir, 'lib/mcp/sdk/inProcessTransport'));
      const { Client } = require(path.join(pwcDir, 'lib/mcpBundle'));

      const transport = new InProcessTransport(this._server);
      this._mcpClient = new Client({ name: 'generator-snapshot', version: '1.0.0' });
      await this._mcpClient.connect(transport);

      this._initialized = true;
      tcGenerateLogger.info(`[MCPSnapshot] MCP browser session initialized (baseUrl: ${this._baseUrl})`);
    } catch (err) {
      tcGenerateLogger.error(`[MCPSnapshot] Failed to initialize: ${err.message}`);
      tcGenerateLogger.warn('[MCPSnapshot] Generation will proceed without browser snapshots');
      this._initialized = false;
    }
  }

  /**
   * Navigates to a module URL and returns the ARIA accessibility snapshot.
   * Results are cached per URL for the configured TTL.
   *
   * @param {string} modulePath - e.g. '/instruments'
   * @returns {Promise<string|null>} ARIA snapshot text, or null if unavailable
   */
  async getSnapshot(modulePath) {
    if (!this._initialized) return null;

    const fullUrl = new URL(modulePath, this._baseUrl).href;

    // Check cache
    const cached = this._snapshotCache.get(fullUrl);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      tcGenerateLogger.debug(`[MCPSnapshot] Cache hit for: ${modulePath}`);
      return cached.snapshot;
    }

    try {
      // Navigate to the page
      await this._mcpClient.callTool({
        name: 'browser_navigate',
        arguments: { url: fullUrl },
      });

      // Take an ARIA snapshot
      const result = await this._mcpClient.callTool({
        name: 'browser_snapshot',
        arguments: {},
      });

      const snapshot = result.content
        .map(c => c.text || JSON.stringify(c))
        .join('\n');

      // Truncate if too large
      const truncated = snapshot.length > MAX_SNAPSHOT_CHARS
        ? snapshot.slice(0, MAX_SNAPSHOT_CHARS) + '\n\n[... snapshot truncated ...]'
        : snapshot;

      // Cache the result
      this._snapshotCache.set(fullUrl, {
        snapshot: truncated,
        timestamp: Date.now(),
      });

      tcGenerateLogger.info(`[MCPSnapshot] Captured snapshot for ${modulePath} (${truncated.length} chars)`);
      return truncated;
    } catch (err) {
      tcGenerateLogger.warn(`[MCPSnapshot] Failed to capture snapshot for ${modulePath}: ${err.message}`);
      return null;
    }
  }

  /** Clears the snapshot cache (e.g. between generation batches) */
  clearCache() {
    this._snapshotCache.clear();
  }

  /** Closes the MCP browser session */
  async close() {
    if (this._mcpClient) {
      try {
        await this._mcpClient.close();
      } catch { /* ignore close errors */ }
    }
    this._mcpClient = null;
    this._server = null;
    this._initialized = false;
    this._snapshotCache.clear();
    tcGenerateLogger.info('[MCPSnapshot] MCP browser session closed');
  }
}

module.exports = MCPSnapshotProvider;
