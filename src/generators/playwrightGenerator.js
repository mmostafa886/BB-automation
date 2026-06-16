const tcGenerateLogger = require('../utils/tc-generate-logger.js');
const fs = require('fs');
const path = require('path');
const MCPSnapshotProvider = require('./mcpSnapshotProvider');

// ─────────────────────────────────────────────────────────────────────────────
// Provider detection
// ─────────────────────────────────────────────────────────────────────────────

/** @type {Record<string, 'openai'|'anthropic'|'gemini'>} */
const MODEL_PREFIX_TO_PROVIDER = {
  'gpt-':    'openai',
  'o1':      'openai',
  'o3':      'openai',
  'claude-': 'anthropic',
  'gemini-': 'gemini',
};

/**
 * Infers the AI provider from the model name.
 * Falls back to 'openai' when no prefix matches.
 * @param {string} model
 * @returns {'openai'|'anthropic'|'gemini'}
 */
function detectProvider(model) {
  for (const [prefix, provider] of Object.entries(MODEL_PREFIX_TO_PROVIDER)) {
    if (model.startsWith(prefix)) return provider;
  }
  return 'openai';
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Property names that belong inside a LocatorDefinition entry and must never
 * be used as a top-level locator key. The AI sometimes confuses these with
 * locator key names, producing entries like `metadata: { role: ... }` which
 * corrupt the file structure.
 */
const RESERVED_LOCATOR_KEYS = new Set([
  'metadata', 'selector', 'description', 'role',
  'name', 'label', 'placeholder', 'text',
]);

/**
 * Mapping from normalised module name → pomSelfHealing property name.
 * Keys are lower-cased; values match the getters in pom-lazy-self-healing.ts.
 */
const MODULE_TO_POM_PROPERTY = {
  'instruments':              'instrumentsPage',
  'instrument':               'instrumentsPage',
  'reagents':                 'reagentsPage',
  'reagent':                  'reagentsPage',
  'bulk register reagents':   'bulkRegisterReagentsPage',
  'bulk-register-reagents':   'bulkRegisterReagentsPage',
  'bulk register':            'bulkRegisterReagentsPage',
  'plate layouts':            'plateLayoutsPage',
  'plate-layouts':            'plateLayoutsPage',
  'plate layout':             'plateLayoutsPage',
  'projects':                 'projectsPage',
  'project':                  'projectsPage',
  'reaction templates':       'reactionTemplatesPage',
  'reaction-templates':       'reactionTemplatesPage',
  'reaction template':        'reactionTemplatesPage',
  'library management':       'libraryManagementPage',
  'library-management':       'libraryManagementPage',
  'audit trail':              'auditTrailPage',
  'audit-trail':              'auditTrailPage',
  'audit':                    'auditTrailPage',
  'login':                    'loginPage',
  'auth':                     'loginPage',
  'authentication':           'loginPage',
  'dashboard':                'homePage',
  'home':                     'homePage',
};

/**
 * Mapping from normalised module name → app URL path.
 * Used to tell the AI the correct route to navigate to.
 */
const MODULE_TO_URL = {
  'instruments':              '/instruments',
  'instrument':               '/instruments',
  'reagents':                 '/reagents',
  'reagent':                  '/reagents',
  'bulk register reagents':   '/building-blocks-upload',
  'bulk-register-reagents':   '/building-blocks-upload',
  'bulk register':            '/building-blocks-upload',
  'plate layouts':            '/plate-layouts',
  'plate-layouts':            '/plate-layouts',
  'plate layout':             '/plate-layouts',
  'projects':                 '/projects',
  'project':                  '/projects',
  'reaction templates':       '/reaction-templates',
  'reaction-templates':       '/reaction-templates',
  'reaction template':        '/reaction-templates',
  'library management':       '/library-management',
  'library-management':       '/library-management',
  'audit trail':              '/audit-trail',
  'audit-trail':              '/audit-trail',
  'audit':                    '/audit-trail',
  'login':                    '/',
  'auth':                     '/',
  'dashboard':                '/dashboard',
  'home':                     '/dashboard',
};

// ─────────────────────────────────────────────────────────────────────────────
// Class
// ─────────────────────────────────────────────────────────────────────────────

/** Hardcoded fallback model for each provider (used only when no env var is set). */
const DEFAULT_MODELS = {
  openai:    'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  gemini:    'gemini-2.0-flash',
};

/** Per-provider env variable name that holds the preferred model string. */
const MODEL_ENV_VARS = {
  openai:    'OPENAI_MODEL',
  anthropic: 'ANTHROPIC_MODEL',
  gemini:    'GEMINI_MODEL',
};

class PlaywrightGenerator {
  /**
   * @param {string} apiKey   - API key for the chosen provider.
   * @param {string} [model]  - Model name. When omitted, resolved from the
   *   matching env variable (OPENAI_MODEL / ANTHROPIC_MODEL / GEMINI_MODEL),
   *   then falls back to the provider's hardcoded default.
   *   Provider is auto-detected from the model name prefix:
   *     gpt-* / o1 / o3  → openai
   *     claude-*          → anthropic
   *     gemini-*          → gemini
   * @param {'openai'|'anthropic'|'gemini'} [provider] - Explicit provider
   *   override. Use this when you haven't passed a model name yet.
   *
   * @example OpenAI — backward-compatible, model from env or default
   *   new PlaywrightGenerator(process.env.OPENAI_API_KEY)
   *
   * @example OpenAI — explicit model
   *   new PlaywrightGenerator(process.env.OPENAI_API_KEY, 'gpt-4o')
   *
   * @example Anthropic — model auto-detected from name
   *   new PlaywrightGenerator(process.env.ANTHROPIC_API_KEY, 'claude-sonnet-4-6')
   *
   * @example Anthropic — model from ANTHROPIC_MODEL env var
   *   new PlaywrightGenerator(process.env.ANTHROPIC_API_KEY, null, 'anthropic')
   *
   * @example Gemini — model auto-detected from name
   *   new PlaywrightGenerator(process.env.GEMINI_API_KEY, 'gemini-2.0-flash')
   *
   * @example Gemini — model from GEMINI_MODEL env var
   *   new PlaywrightGenerator(process.env.GEMINI_API_KEY, null, 'gemini')
   */
  constructor(apiKey, model, provider) {
    // ── 1. Resolve provider ──────────────────────────────────────────────
    // Explicit param > prefix from supplied model name > default 'openai'
    this.provider = provider ?? (model ? detectProvider(model) : 'openai');

    // ── 2. Resolve model ─────────────────────────────────────────────────
    // Explicit param > env var for this provider > hardcoded default
    this.model =
      model ??
      process.env[MODEL_ENV_VARS[this.provider]] ??
      DEFAULT_MODELS[this.provider];

    // ── 3. Initialize provider client ────────────────────────────────────
    if (this.provider === 'openai') {
      let OpenAI;
      try {
        OpenAI = require('openai');
      } catch {
        throw new Error(
          'Package openai is not installed. ' +
          'Run: npm install openai',
        );
      }
      this.client = new OpenAI({ apiKey });

    } else if (this.provider === 'anthropic') {
      let Anthropic;
      try {
        Anthropic = require('@anthropic-ai/sdk');
      } catch {
        throw new Error(
          'Package @anthropic-ai/sdk is not installed. ' +
          'Run: npm install @anthropic-ai/sdk',
        );
      }
      this.client = new Anthropic({ apiKey });

    } else if (this.provider === 'gemini') {
      let GoogleGenerativeAI;
      try {
        ({ GoogleGenerativeAI } = require('@google/generative-ai'));
      } catch {
        throw new Error(
          'Package @google/generative-ai is not installed. ' +
          'Run: npm install @google/generative-ai',
        );
      }
      this.client = new GoogleGenerativeAI(apiKey);

    } else {
      throw new Error(
        `Unknown provider "${this.provider}". Valid values: 'openai', 'anthropic', 'gemini'.`,
      );
    }

    // Lazy-initialized MCP snapshot provider for browser-aware generation
    this._snapshotProvider = null;
    this._mcpInitAttempted = false;

    tcGenerateLogger.info(
      `PlaywrightGenerator ready — provider: ${this.provider}, model: ${this.model}`,
    );
  }

  /**
   * Auto-detects the AI provider from environment variables and returns a
   * ready-to-use PlaywrightGenerator instance.
   *
   * Resolution order (first key found wins):
   *   1. OPENAI_API_KEY    → provider 'openai',    model from OPENAI_MODEL
   *   2. ANTHROPIC_API_KEY → provider 'anthropic', model from ANTHROPIC_MODEL
   *   3. GEMINI_API_KEY    → provider 'gemini',    model from GEMINI_MODEL
   *
   * Throws if no provider key is set in the environment.
   *
   * @returns {PlaywrightGenerator}
   */
  static fromEnv() {
    if (process.env.OPENAI_API_KEY) {
      return new PlaywrightGenerator(process.env.OPENAI_API_KEY, null, 'openai');
    }
    if (process.env.ANTHROPIC_API_KEY) {
      return new PlaywrightGenerator(process.env.ANTHROPIC_API_KEY, null, 'anthropic');
    }
    if (process.env.GEMINI_API_KEY) {
      return new PlaywrightGenerator(process.env.GEMINI_API_KEY, null, 'gemini');
    }
    throw new Error(
      'No AI provider API key found in environment. ' +
      'Set OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY in your .env file.',
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MCP Snapshot helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns the initialized MCPSnapshotProvider, creating it on first call.
   * Gated by APP_IN_OPERATION=true inside the provider's initialize().
   */
  async _getSnapshotProvider() {
    // Once we tried in this session, return the cached result
    if (this._mcpInitAttempted) return this._snapshotProvider?._initialized ? this._snapshotProvider : null;
    this._mcpInitAttempted = true;

    this._snapshotProvider = new MCPSnapshotProvider();
    await this._snapshotProvider.initialize();
    return this._snapshotProvider._initialized ? this._snapshotProvider : null;
  }

  /**
   * Fetches the ARIA snapshot for a module's page via Playwright MCP.
   * Returns null if MCP is unavailable or the page can't be reached.
   * @param {string} moduleName
   * @returns {Promise<string|null>}
   */
  async _getModuleSnapshot(moduleName) {
    const provider = await this._getSnapshotProvider();
    if (!provider) return null;
    const moduleUrl = this.getModuleUrl(moduleName);
    return provider.getSnapshot(moduleUrl);
  }

  /**
   * Closes the MCP browser session. Should be called when the QAAgent stops
   * or when manual sync completes.
   */
  async closeMCPSession() {
    if (this._snapshotProvider) {
      await this._snapshotProvider.close();
      this._snapshotProvider = null;
    }
    this._mcpInitAttempted = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Path / naming helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** "instrumentsPage" → "instruments-page" */
  propertyToFileStem(propertyName) {
    return propertyName.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
  }

  /** "instrumentsPage" → "src/locators/instruments-page-locators.ts" */
  getLocatorsPath(propertyName) {
    const stem = this.propertyToFileStem(propertyName);   // "instruments-page"
    return `src/locators/${stem}-locators.ts`;
  }

  /** "instruments-page" → absolute path to the page class TS file */
  getPagePath(propertyName) {
    const stem = this.propertyToFileStem(propertyName);
    return `src/pages/${stem}-self-healing.ts`;
  }

  /**
   * Returns the pomSelfHealing property name for a given module string.
   * Falls back to a best-effort camelCase derivation when not in the map.
   */
  getPagePropertyName(module) {
    if (!module) return 'homePage';
    const key = module.trim().toLowerCase();
    if (MODULE_TO_POM_PROPERTY[key]) return MODULE_TO_POM_PROPERTY[key];
    return key.replace(/[-\s]+(.)/g, (_, c) => c.toUpperCase()) + 'Page';
  }

  /** Module string → app URL path, e.g. "Instruments" → "/instruments" */
  getModuleUrl(module) {
    if (!module) return '/';
    const key = module.trim().toLowerCase();
    return MODULE_TO_URL[key] || `/${key.replace(/\s+/g, '-')}`;
  }

  /**
   * "instrumentsPage" → "instrumentsLocators"
   * Matches the export name convention in *-page-locators.ts files.
   */
  getLocatorsVarName(propertyName) {
    return propertyName.replace(/Page$/, '') + 'Locators';
  }

  /**
   * "instrumentsPage" → "InstrumentsPageSelfHealing"
   * Matches the class name convention in *-self-healing.ts files.
   */
  getClassName(propertyName) {
    return propertyName.charAt(0).toUpperCase() + propertyName.slice(1) + 'SelfHealing';
  }

  /**
   * Returns the sub-folder name inside tests/generated/ for the given module.
   * "library management" → "Library-Management"
   */
  getOutputFolder(module) {
    return (module || 'General')
      .trim()
      .split(/[\s-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('-');
  }

  /**
   * Returns the suggested output path for the test spec.
   * "tests/generated/Instruments/tc-4975-verify-add-new-instrument.spec.ts"
   */
  getOutputPath(testCase) {
    const folder    = this.getOutputFolder(testCase.module);
    const idPart    = `tc-${testCase.id}`;
    const titlePart = (testCase.title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
    return `tests/generated/${folder}/${idPart}-${titlePart}.spec.ts`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Skeleton builders (deterministic, no AI calls)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns the TypeScript source for a minimal locators file.
   * Contains only the pageContainer entry — all test-specific entries
   * are appended later by generateAdditionalLocators().
   */
  _buildSkeletonLocatorsCode(pageProperty, moduleName) {
    const stem      = this.propertyToFileStem(pageProperty);
    const varName   = this.getLocatorsVarName(pageProperty);
    const className = this.getClassName(pageProperty);

    return [
      `import type { LocatorDefinition } from '../utils/self-healing-locator';`,
      ``,
      `/**`,
      ` * Locator repository for ${className}.`,
      ` *`,
      ` * Contains only pure data (selector strings + semantic metadata).`,
      ` * No Playwright Page dependency — safe to import anywhere.`,
      ` */`,
      `export const ${varName} = {`,
      ``,
      `    pageContainer: {`,
      `        selector: '[data-testid="${stem}"]',`,
      `        metadata: {`,
      `            description: '${moduleName} page root container',`,
      `        },`,
      `    },`,
      ``,
      `} satisfies Record<string, LocatorDefinition>;`,
      ``,
    ].join('\n');
  }

  /**
   * Returns the TypeScript source for a minimal self-healing page class.
   * Contains only the constructor wiring and navigateTo() — all test-specific
   * methods are appended later by generateAdditionalMethods().
   */
  _buildSkeletonPageCode(pageProperty, moduleName, locatorEntries) {
    const stem      = this.propertyToFileStem(pageProperty);
    const className = this.getClassName(pageProperty);
    const varName   = this.getLocatorsVarName(pageProperty);
    const moduleUrl = this.getModuleUrl(moduleName);

    const fieldsBlock = locatorEntries
      .map((l) => `    readonly ${l.key}: SelfHealingLocator;`)
      .join('\n');

    const wiringBlock = locatorEntries
      .map((l) => `        this.${l.key} = SelfHealingLocator.from(page, ${varName}.${l.key}, logger, aiProvider);`)
      .join('\n');

    return [
      `import { type Page } from '@playwright/test';`,
      `import { SelfHealingPageBase } from './self-healing-page-base';`,
      `import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';`,
      `import { ${varName} } from '../locators/${stem}-locators';`,
      `import { Logger } from '../utils/Logger';`,
      `import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';`,
      `import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';`,
      ``,
      `/**`,
      ` * ${className} — Page Object for the ${moduleName} module.`,
      ` *`,
      ` * Extends \`SelfHealingPageBase\` and wires every locator from`,
      ` * \`${varName}\` through \`SelfHealingLocator.from()\`.`,
      ` */`,
      `export class ${className} extends SelfHealingPageBase {`,
      ``,
      `    // ── Locator fields ─────────────────────────────────────────────────────────`,
      fieldsBlock,
      ``,
      `    // ── Private helpers ────────────────────────────────────────────────────────`,
      `    private readonly page: Page;`,
      `    private readonly actions: AdvancedActionsHelper;`,
      `    private readonly assert: AdvancedAssertionsHelper;`,
      ``,
      `    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {`,
      `        super();`,
      `        this.page    = page;`,
      `        this.actions = new AdvancedActionsHelper(page, testName);`,
      `        this.assert  = new AdvancedAssertionsHelper(page, testName);`,
      `        const logger = Logger.getLogger(\`${className}-\${testName}\`);`,
      ``,
      `        // Wire every locator through SelfHealingLocator.from()`,
      wiringBlock,
      `    }`,
      ``,
      `    // ── Page Actions ───────────────────────────────────────────────────────────`,
      ``,
      `    /** Navigate to the ${moduleName} page */`,
      `    async navigateTo(): Promise<void> {`,
      `        await this.actions.goto('${moduleUrl}', 'Navigate to ${moduleName} page');`,
      `    }`,
      `}`,
      ``,
    ].join('\n');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Layer loaders  (locators, page methods, POM)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Layer 1 — Reads src/locators/<stem>-page-locators.ts and extracts every
   * locator key plus its description metadata.
   * Returns Array<{ key: string, description: string }>.
   */
  loadLocators(propertyName) {
    try {
      const absPath = path.join(__dirname, '../..', this.getLocatorsPath(propertyName));
      if (!fs.existsSync(absPath)) {
        tcGenerateLogger.debug(`No locators file for "${propertyName}": ${absPath}`);
        return [];
      }
      const content = fs.readFileSync(absPath, 'utf-8');
      return this._parseLocatorEntries(content);
    } catch (err) {
      tcGenerateLogger.warn(`Could not load locators for "${propertyName}":`, err.message);
      return [];
    }
  }

  /**
   * Parses a TypeScript locators source string and returns
   * Array<{ key, description }> for every top-level entry.
   * Used both by loadLocators() and to introspect freshly generated code.
   */
  _parseLocatorEntries(content) {
    // Find every 4-space-indented key block, then slice to next key to extract description
    const keyMatches = [...content.matchAll(/^ {4}(\w+):\s*\{/gm)];
    return keyMatches
      .filter((m) => !RESERVED_LOCATOR_KEYS.has(m[1]))
      .map((m, i, arr) => {
        const key        = m[1];
        const blockStart = m.index;
        const blockEnd   = arr[i + 1] ? arr[i + 1].index : content.length;
        const block      = content.slice(blockStart, blockEnd);
        const descMatch  = /description:\s*['"`](.*?)['"`]/.exec(block);
        return { key, description: descMatch ? descMatch[1] : key };
      });
  }

  /**
   * Extracts public async method names from a TypeScript page class source
   * string (in-memory). Mirrors loadPageMethods() but operates on a string
   * so it works before the file has been written to disk.
   * Returns string[].
   */
  _parsePageMethods(content) {
    const matches = [...content.matchAll(/^ {4}async\s+(\w+)\s*\(/gm)];
    return matches.map((m) => m[1]).filter((n) => n !== 'constructor');
  }

  /**
   * Layer 2 — Reads src/pages/<stem>-self-healing.ts and extracts all public
   * async method names declared at 4-space class-body indent.
   * Returns string[].
   */
  loadPageMethods(propertyName) {
    try {
      const absPath = path.join(__dirname, '../..', this.getPagePath(propertyName));
      if (!fs.existsSync(absPath)) {
        tcGenerateLogger.debug(`No page file for "${propertyName}": ${absPath}`);
        return [];
      }
      const content = fs.readFileSync(absPath, 'utf-8');
      const matches = [...content.matchAll(/^ {4}async\s+(\w+)\s*\(/gm)];
      return matches.map((m) => m[1]).filter((n) => n !== 'constructor');
    } catch (err) {
      tcGenerateLogger.warn(`Could not load page methods for "${propertyName}":`, err.message);
      return [];
    }
  }

  /**
   * Layer 3 — Reads pom-lazy-self-healing.ts and extracts all registered
   * getter property names. Returns string[].
   */
  loadPomProperties() {
    try {
      const absPath = path.join(__dirname, '../../src/pages/pom-lazy-self-healing.ts');
      if (!fs.existsSync(absPath)) return [];
      const content = fs.readFileSync(absPath, 'utf-8');
      return [...content.matchAll(/^\s+get\s+(\w+)\s*\(\)/gm)].map((m) => m[1]);
    } catch (err) {
      tcGenerateLogger.warn('Could not load POM properties:', err.message);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core generation — test spec
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @param {object}                    testCase
   * @param {Array<{key,description}>}  [overrideLocators] - in-memory locator
   *   entries to use instead of reading from disk. Pass when the locators file
   *   was just generated but not yet written (e.g. inside generateAll).
   * @param {string[]}                  [overrideMethods]  - in-memory page method
   *   names to use instead of reading from disk. Pass when the page file was just
   *   generated but not yet written (e.g. inside generateAll).
   */
  async generateTest(testCase, overrideLocators, overrideMethods, ariaSnapshot) {
    tcGenerateLogger.info(`Generating test spec for: ${testCase.title}`);
    try {
      const code = this.extractCode(
        (await this._aiCall(this.buildTestPrompt(testCase, overrideLocators, overrideMethods, ariaSnapshot))).choices[0].message.content,
      );
      tcGenerateLogger.info(`Test spec generated. Path: ${this.getOutputPath(testCase)}`);
      return code;
    } catch (err) {
      tcGenerateLogger.error(`Error generating test for ${testCase.title}`, err);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core generation — locators file
  // ─────────────────────────────────────────────────────────────────────────

  async generateLocatorsFile(testCase, ariaSnapshot) {
    const pageProperty = this.getPagePropertyName(testCase.module);
    tcGenerateLogger.info(`Generating locators file for: ${pageProperty}`);
    try {
      const code = this.extractCode(
        (await this._aiCall(this.buildLocatorsPrompt(testCase, ariaSnapshot))).choices[0].message.content,
      );
      tcGenerateLogger.info(`Locators file generated. Path: ${this.getLocatorsPath(pageProperty)}`);
      return code;
    } catch (err) {
      tcGenerateLogger.error(`Error generating locators for ${testCase.module}`, err);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core generation — self-healing page class
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates the *-self-healing.ts page class.
   * @param {object} testCase
   * @param {Array<{key,description}>} [locatorEntries] - pre-parsed locator keys
   *   to inject into the prompt. If omitted, loaded from the existing locators file.
   */
  async generatePageFile(testCase, locatorEntries, ariaSnapshot) {
    const pageProperty = this.getPagePropertyName(testCase.module);
    tcGenerateLogger.info(`Generating self-healing page class for: ${pageProperty}`);
    try {
      const entries = locatorEntries ?? this.loadLocators(pageProperty);
      const code = this.extractCode(
        (await this._aiCall(this.buildPagePrompt(testCase, entries, ariaSnapshot))).choices[0].message.content,
      );
      tcGenerateLogger.info(`Page class generated. Path: ${this.getPagePath(pageProperty)}`);
      return code;
    } catch (err) {
      tcGenerateLogger.error(`Error generating page class for ${testCase.module}`, err);
      throw err;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Orchestrator — create files first, then populate
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates (or updates) all three artifacts for a test case.
   *
   * Processing order — files are created first, then populated:
   *
   *   1. Ensure src/locators/<page>-locators.ts exists.
   *      • New  → deterministic skeleton written to disk (no AI call).
   *      • Existing → left as-is.
   *
   *   2. Ensure src/pages/<page>-self-healing.ts exists.
   *      • New  → deterministic skeleton written to disk (no AI call).
   *      • Existing → left as-is.
   *
   *   3. Ensure the page is registered in pom-lazy-self-healing.ts.
   *      • Missing → import, field, lazy getter, and healing-report entry added.
   *      • Already registered → skipped.
   *
   *   4. Generate additional locators needed by THIS test case.
   *      • Appended to the locators file; page constructor is synced with
   *        any new locator fields automatically.
   *
   *   5. Generate additional page methods needed by THIS test case.
   *      • Appended to the page class.
   *
   *   6. Generate the test spec (always).
   *      • Returned as code — the caller writes it to disk.
   *
   * All file I/O for artifacts 1–3 is handled internally.
   *
   * @returns {{
   *   locators : { path: string, action: 'created'|'updated'|'unchanged' },
   *   page     : { path: string, action: 'created'|'updated'|'unchanged' },
   *   test     : { code: string, path: string },
   *   pomRegistered: boolean,
   *   success  : boolean,
   * }}
   */
  async generateAll(testCase) {
    const pageProperty    = this.getPagePropertyName(testCase.module);
    const locatorsPath    = this.getLocatorsPath(pageProperty);
    const pagePath        = this.getPagePath(pageProperty);
    const testPath        = this.getOutputPath(testCase);
    const locatorsAbsPath = path.join(process.cwd(), locatorsPath);
    const pageAbsPath     = path.join(process.cwd(), pagePath);
    const moduleName      = testCase.module || 'General';

    // ── 1. Ensure locators file exists (deterministic skeleton) ─────
    let locatorsAction = 'unchanged';
    let locatorEntries;

    if (!fs.existsSync(locatorsAbsPath)) {
      const skeleton = this._buildSkeletonLocatorsCode(pageProperty, moduleName);
      fs.mkdirSync(path.dirname(locatorsAbsPath), { recursive: true });
      fs.writeFileSync(locatorsAbsPath, skeleton, 'utf-8');
      locatorEntries = this._parseLocatorEntries(skeleton);
      locatorsAction = 'created';
      tcGenerateLogger.info(`Locators skeleton created: ${locatorsPath}`);
    } else {
      locatorEntries = this.loadLocators(pageProperty);
    }

    // ── 2. Ensure page file exists (deterministic skeleton) ─────────
    let pageAction = 'unchanged';
    let pageMethods;

    if (!fs.existsSync(pageAbsPath)) {
      const skeleton = this._buildSkeletonPageCode(pageProperty, moduleName, locatorEntries);
      fs.mkdirSync(path.dirname(pageAbsPath), { recursive: true });
      fs.writeFileSync(pageAbsPath, skeleton, 'utf-8');
      pageMethods = this._parsePageMethods(skeleton);
      pageAction  = 'created';
      tcGenerateLogger.info(`Page skeleton created: ${pagePath}`);
    } else {
      pageMethods = this.loadPageMethods(pageProperty);
    }

    // ── 3. POM registration (guaranteed before any AI calls) ────────
    let pomRegistered = false;
    if (!this._isRegisteredInPom(pageProperty)) {
      this._registerPageInPom(pageProperty);
      pomRegistered = true;
      tcGenerateLogger.info(`Registered ${pageProperty} in pom-lazy-self-healing.ts`);
    }

    // ── 3.5. Capture ARIA snapshot of the module page (MCP-powered) ──
    const ariaSnapshot = await this._getModuleSnapshot(moduleName);
    if (ariaSnapshot) {
      tcGenerateLogger.info(`ARIA snapshot captured for ${moduleName} (${ariaSnapshot.length} chars)`);
    } else {
      tcGenerateLogger.debug(`No ARIA snapshot available for ${moduleName} — using text-only prompts`);
    }

    // ── 4. Generate and append additional locators for this test ─────
    const locatorAdditions = await this.generateAdditionalLocators(testCase, locatorEntries, ariaSnapshot);
    if (locatorAdditions) {
      this._appendToLocatorsFile(locatorsAbsPath, locatorAdditions);
      locatorEntries = this.loadLocators(pageProperty);   // re-read with additions
      if (locatorsAction === 'unchanged') locatorsAction = 'updated';
      tcGenerateLogger.info(`Locators updated with test-specific entries: ${locatorsPath}`);
    }

    // ── 5. Sync page constructor with any new locator fields ────────
    // (skip when step 4 added nothing — page already has all fields)
    if (locatorAdditions) {
      this._syncPageLocatorFields(pageAbsPath, pageProperty, locatorEntries);
      pageMethods = this.loadPageMethods(pageProperty);   // re-read after sync
    }

    // ── 6. Generate and append additional page methods ───────────────
    const methodAdditions = await this.generateAdditionalMethods(testCase, pageMethods, locatorEntries, ariaSnapshot);
    if (methodAdditions) {
      this._appendToPageFile(pageAbsPath, methodAdditions);
      pageMethods = this.loadPageMethods(pageProperty);   // re-read with additions
      if (pageAction === 'unchanged') pageAction = 'updated';
      tcGenerateLogger.info(`Page updated with test-specific methods: ${pagePath}`);
    }

    // ── 7. Generate test spec ────────────────────────────────────────────────────
    const rawTestCode = await this.generateTest(testCase, locatorEntries, pageMethods, ariaSnapshot);

    // ── 8. Post-validate test spec (sanitize strings, check phantom methods) ──
    const testCode = this._postValidateTestSpec(rawTestCode, pageProperty, pageMethods);

    return {
      locators : { path: locatorsPath, action: locatorsAction },
      page     : { path: pagePath,     action: pageAction },
      test     : { code: testCode,     path: testPath },
      pomRegistered,
      success  : true,
    };
  }
  // ─────────────────────────────────────────────────────────────────────────
  // Batch helpers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Generates all three artifacts for every test case.
   * Locators/page files for a module are skipped after the first test case
   * creates them (generateAll checks fs.existsSync on each call).
   */
  async generateAllMultiple(testCases) {
    const results = [];
    for (const testCase of testCases) {
      try {
        const result = await this.generateAll(testCase);
        results.push({ testCase, ...result, success: true });
      } catch (err) {
        const prop = this.getPagePropertyName(testCase.module);
        results.push({
          testCase,
          error    : err.message,
          locators : { path: this.getLocatorsPath(prop), action: 'unchanged' },
          page     : { path: this.getPagePath(prop),     action: 'unchanged' },
          test     : { code: null, path: this.getOutputPath(testCase) },
          pomRegistered: false,
          success  : false,
        });
      }
      await this.delay(300);
    }
    return results;
  }

  /** Legacy: generates test specs only (backward compatible). */
  async generateMultipleTests(testCases) {
    const results = [];
    for (const testCase of testCases) {
      try {
        const code = await this.generateTest(testCase);
        results.push({ testCase, code, path: this.getOutputPath(testCase), success: true });
      } catch (err) {
        results.push({ testCase, error: err.message, path: this.getOutputPath(testCase), success: false });
      }
      await this.delay(300);
    }
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Incremental generators (additions to existing files)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Asks the AI for any locator entries that are needed by this test case
   * but are NOT already present in the locators file.
   * Returns the raw entry snippet (ready to append) or null when nothing new
   * is required.
   */
  async generateAdditionalLocators(testCase, existingEntries, ariaSnapshot) {
    tcGenerateLogger.info(`Checking for additional locators needed for TC-${testCase.id}`);
    try {
      const raw = (
        await this._aiCall(this.buildAdditionalLocatorsPrompt(testCase, existingEntries, ariaSnapshot))
      ).choices[0].message.content;
      // Strip code fences the AI may have wrapped around the snippet
      const stripped = raw
        .replace(/```(?:typescript|ts)?\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      if (!stripped || stripped === 'NO_ADDITIONS') return null;
      return stripped;
    } catch (err) {
      tcGenerateLogger.warn(`Could not check additional locators for TC-${testCase.id}: ${err.message}`);
      return null;
    }
  }

  /**
   * Asks the AI for any page methods needed by this test case that are NOT
   * already present in the page class file.
   * Returns the raw method snippet (ready to append) or null when nothing new
   * is required.
   */
  async generateAdditionalMethods(testCase, existingMethods, locatorEntries, ariaSnapshot) {
    tcGenerateLogger.info(`Checking for additional methods needed for TC-${testCase.id}`);
    try {
      const raw = (
        await this._aiCall(this.buildAdditionalMethodsPrompt(testCase, existingMethods, locatorEntries, ariaSnapshot))
      ).choices[0].message.content;
      const stripped = raw
        .replace(/```(?:typescript|ts)?\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      if (!stripped || stripped === 'NO_ADDITIONS') return null;

      // Enforce framework rules (no raw expect, fix promise chains)
      return this._sanitizeMethodBodies(stripped);
    } catch (err) {
      tcGenerateLogger.warn(`Could not check additional methods for TC-${testCase.id}: ${err.message}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI output sanitizers
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Post-processes AI-generated page method bodies to enforce framework rules:
   *  1. Replaces raw `expect(…).toBe/toEqual/…` with `this.assert.toBeTruthy`
   *  2. Fixes `await this.X.get().locator(…)` → `(await this.X.get()).locator(…)`
   *     (calling .locator() on an unresolved Promise)
   */
  _sanitizeMethodBodies(code) {
    let sanitized = code;

    // 1. Replace bare expect(expr).toXxx(val) with this.assert.toBeTruthy(expr, 'description')
    //    Matches: expect(someVar).toBe(15)  expect(count).toEqual(expected)  etc.
    sanitized = sanitized.replace(
      /expect\(([^)]+)\)\.(toBe|toEqual|toBeTruthy|toBeFalsy|toContain|toMatch)\(([^)]*)\)/g,
      (match, expr, matcher, val) => {
        tcGenerateLogger.debug(`Replaced raw expect(${expr}).${matcher}(${val}) with this.assert.toBeTruthy`);
        return `await this.assert.toBeTruthy(${expr} === ${val || 'true'}, 'Verify ${expr.trim()} equals ${val || 'expected value'}')`;
      },
    );

    // 2. Fix unresolved promise chain: await this.X.get().locator(…)
    //    → (await this.X.get()).locator(…)
    sanitized = sanitized.replace(
      /await (this\.\w+\.get\(\))\.(\w+)\(/g,
      (match, getCall, chain) => {
        tcGenerateLogger.debug(`Fixed unresolved promise chain: ${getCall}.${chain}(`);
        return `(await ${getCall}).${chain}(`;
      },
    );

    return sanitized;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // File-append utilities
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Appends new locator entries to an existing *-locators.ts file.
   * Inserts the snippet immediately before the closing
   * `} satisfies Record<string, LocatorDefinition>;` line.
   */
  _appendToLocatorsFile(absPath, newEntriesCode) {
    const content = fs.readFileSync(absPath, 'utf-8');
    const marker  = '} satisfies Record<string, LocatorDefinition>';
    const idx     = content.indexOf(marker);
    if (idx === -1) {
      tcGenerateLogger.warn(`Cannot append locators — marker not found in: ${absPath}`);
      return;
    }

    // Deduplicate: strip entry blocks whose key already exists in the file
    const existingKeys = new Set(this._parseLocatorEntries(content).map((e) => e.key));
    const filtered = this._stripDuplicateLocatorBlocks(newEntriesCode, existingKeys);
    if (!filtered) {
      tcGenerateLogger.debug('All proposed locator entries already exist — skipping append');
      return;
    }

    const updated = content.slice(0, idx) + '\n' + filtered + '\n\n' + content.slice(idx);
    fs.writeFileSync(absPath, updated, 'utf-8');
  }

  /**
   * Parses raw AI-generated locator entry text into blocks keyed by their
   * 4-space-indented identifier, then removes any whose key is in `existingKeys`.
   * Returns the filtered text or null when nothing remains.
   */
  _stripDuplicateLocatorBlocks(rawCode, existingKeys) {
    const keyPattern = /^ {4}(\w+):\s*\{/gm;
    const matches = [...rawCode.matchAll(keyPattern)];
    if (matches.length === 0) return rawCode.trim() || null;

    const kept = [];
    const seen = new Set();
    for (let i = 0; i < matches.length; i++) {
      const key   = matches[i][1];
      const start = matches[i].index;
      const end   = matches[i + 1] ? matches[i + 1].index : rawCode.length;
      const block = rawCode.slice(start, end);

      // Skip reserved LocatorDefinition property names used as keys
      if (RESERVED_LOCATOR_KEYS.has(key)) {
        tcGenerateLogger.warn(`Rejected locator entry with reserved key "${key}" — AI confused a property name for a locator key`);
        continue;
      }

      // Structural check: a valid entry must contain both selector: and metadata:
      if (!/selector\s*:/.test(block) || !/metadata\s*:\s*\{/.test(block)) {
        tcGenerateLogger.warn(`Rejected malformed locator entry "${key}" — missing selector or metadata block`);
        continue;
      }

      if (!existingKeys.has(key) && !seen.has(key)) {
        kept.push(block);
        seen.add(key);
      }
    }
    const result = kept.join('').replace(/^\n+/, '').replace(/\n+$/, '');
    return result || null;
  }

  /**
   * Appends new method bodies to an existing *-self-healing.ts page class.
   * Inserts the snippet before the final `}` that closes the class.
   */
  _appendToPageFile(absPath, newMethodsCode) {
    const content = fs.readFileSync(absPath, 'utf-8');
    // Find the last standalone `}` line — the class-closing brace
    const lastBrace = content.lastIndexOf('\n}');
    if (lastBrace === -1) {
      tcGenerateLogger.warn(`Cannot append methods — class closing brace not found in: ${absPath}`);
      return;
    }

    // Deduplicate: strip methods whose name already exists in the page class
    const existingMethods = new Set(this._parsePageMethods(content));
    const filtered = this._stripDuplicateMethodBlocks(newMethodsCode, existingMethods);
    if (!filtered) {
      tcGenerateLogger.debug('All proposed page methods already exist — skipping append');
      return;
    }

    // Normalize indentation: if methods arrive at 0-indent, add 4-space class-body indent
    const normalized = this._normalizeMethodIndent(filtered);

    const updated = content.slice(0, lastBrace) + '\n\n' + normalized + '\n' + content.slice(lastBrace);
    fs.writeFileSync(absPath, updated, 'utf-8');
  }

  /**
   * Parses raw AI-generated method text into blocks keyed by their async
   * method name, then removes any whose name is in `existingMethods`.
   * Returns the filtered text or null when nothing remains.
   */
  _stripDuplicateMethodBlocks(rawCode, existingMethods) {
    const methodPattern = /^ {4}async\s+(\w+)\s*\(/gm;
    const matches = [...rawCode.matchAll(methodPattern)];
    if (matches.length === 0) return rawCode.trim() || null;

    const kept = [];
    const seen = new Set();
    for (let i = 0; i < matches.length; i++) {
      const name  = matches[i][1];
      // Each block starts at the method's JSDoc (look back for /**) or at the match
      let start = matches[i].index;
      const preceding = rawCode.slice(0, start);
      const jsdocIdx = preceding.lastIndexOf('    /**');
      if (jsdocIdx !== -1 && preceding.slice(jsdocIdx, start).trim().endsWith('*/')) {
        start = jsdocIdx;
      }
      const end = matches[i + 1]
        ? (() => {
            let e = matches[i + 1].index;
            const pre = rawCode.slice(0, e);
            const j = pre.lastIndexOf('    /**');
            return (j !== -1 && j > start && pre.slice(j, e).trim().endsWith('*/')) ? j : e;
          })()
        : rawCode.length;
      if (!existingMethods.has(name) && !seen.has(name)) {
        kept.push(rawCode.slice(start, end));
        seen.add(name);
      }
    }
    const result = kept.join('').replace(/^\n+/, '').replace(/\n+$/, '');
    return result || null;
  }

  /**
   * Normalizes indentation of AI-generated method bodies.
   * If the first `async` keyword sits at column 0 instead of column 4
   * (i.e. missing class-body indent), prepend 4 spaces to every line.
   */
  _normalizeMethodIndent(code) {
    // Check if the first method definition is at 0-indent
    if (/^async\s/m.test(code) && !/^ {4}async\s/m.test(code)) {
      tcGenerateLogger.debug('Normalizing 0-indent method bodies to 4-space class-body indent');
      return code.split('\n').map((line) => (line.trim() ? '    ' + line : line)).join('\n');
    }
    return code;
  }


  /**
   * Ensures every locator entry from the locators file has a corresponding
   * readonly field declaration and SelfHealingLocator.from() wiring in the
   * page class constructor. Adds only missing entries.
   */
  _syncPageLocatorFields(pageAbsPath, pageProperty, locatorEntries) {
    if (!fs.existsSync(pageAbsPath)) return;
    let content = fs.readFileSync(pageAbsPath, 'utf-8');
    const varName = this.getLocatorsVarName(pageProperty);

    const existingFields = new Set(
      [...content.matchAll(/readonly\s+(\w+)\s*:\s*SelfHealingLocator/g)].map((m) => m[1]),
    );

    // Deduplicate locatorEntries by key (guards against duplicate entries
    // in the locators file) and exclude keys already declared in the page.
    const seen = new Set();
    const newEntries = locatorEntries.filter((l) => {
      if (existingFields.has(l.key) || seen.has(l.key)) return false;
      seen.add(l.key);
      return true;
    });
    if (newEntries.length === 0) return;

    // ── Insert field declarations before "Private helpers" section ───
    let fieldsMarker = content.indexOf('    // ── Private helpers');
    if (fieldsMarker === -1) fieldsMarker = content.indexOf('    private readonly page: Page;');
    if (fieldsMarker > 0) {
      const newFields = newEntries
        .map((l) => `    readonly ${l.key}: SelfHealingLocator;`)
        .join('\n') + '\n';
      content = content.slice(0, fieldsMarker) + newFields + content.slice(fieldsMarker);
    }

    // ── Insert constructor wiring after last SelfHealingLocator.from line ─
    // (re-search in modified content so indices are correct)
    const wiringMatches = [...content.matchAll(/.*SelfHealingLocator\.from\(.+\);.*\n/g)];
    if (wiringMatches.length > 0) {
      const last = wiringMatches[wiringMatches.length - 1];
      const pos  = last.index + last[0].length;
      const newWiring = newEntries
        .map((l) => `        this.${l.key} = SelfHealingLocator.from(page, ${varName}.${l.key}, logger, aiProvider);`)
        .join('\n') + '\n';
      content = content.slice(0, pos) + newWiring + content.slice(pos);
    }

    fs.writeFileSync(pageAbsPath, content, 'utf-8');
    tcGenerateLogger.info(`Synced ${newEntries.length} new locator field(s) into page class`);
  }
  // ─────────────────────────────────────────────────────────────────────────
  // POM registration
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Returns true when the given page property already has a lazy getter
   * registered inside pom-lazy-self-healing.ts.
   */
  _isRegisteredInPom(pageProperty) {
    try {
      const pomPath = path.join(__dirname, '../../src/pages/pom-lazy-self-healing.ts');
      if (!fs.existsSync(pomPath)) return false;
      const content = fs.readFileSync(pomPath, 'utf-8');
      return new RegExp(`\\bget\\s+${pageProperty}\\s*\\(`).test(content);
    } catch {
      return false;
    }
  }

  /**
   * Adds the given page class to pom-lazy-self-healing.ts:
   *   1. Import statement (before the AIHealingProvider import)
   *   2. Private backing field (before the constructor)
   *   3. Lazy getter (before the Healing Report section)
   *   4. Entry in the getHealingReport() pages array
   */
  _registerPageInPom(pageProperty) {
    const pomPath = path.join(__dirname, '../../src/pages/pom-lazy-self-healing.ts');
    if (!fs.existsSync(pomPath)) {
      tcGenerateLogger.warn('pom-lazy-self-healing.ts not found — skipping POM registration');
      return;
    }

    let content     = fs.readFileSync(pomPath, 'utf-8');
    const className = this.getClassName(pageProperty);        // "LibraryManagementPageSelfHealing"
    const stem      = this.propertyToFileStem(pageProperty);  // "library-management-page"
    const fieldName = `_${pageProperty}`;                     // "_libraryManagementPage"

    // ── 1. Import ──────────────────────────────────────────────────────────
    const aiImport  = `import { type AIHealingProvider } from '../utils/self-healing-locator';`;
    const newImport = `import { ${className} } from './${stem}-self-healing';\n`;
    content = content.replace(aiImport, newImport + aiImport);

    // ── 2. Private backing field (insert before the constructor) ──────────
    const constructorLine = '\n    constructor(page:';
    const fieldDecl       = `\n    private ${fieldName}?:                   ${className};`;
    content = content.replace(constructorLine, fieldDecl + constructorLine);

    // ── 3. Lazy getter (insert before the Healing Report section) ─────────
    const healingMarker = '\n    // ===================== Healing Report =====================';
    const getter = `
    /** Returns the ${className} instance, creating it on first access */
    get ${pageProperty}(): ${className} {
        if (!this.${fieldName}) {
            this.${fieldName} = new ${className}(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this.${fieldName};
    }
`;
    content = content.replace(healingMarker, getter + healingMarker);

    // ── 4. Healing report array entry (insert before the closing `];`) ────
    const arrayClose    = '\n        ];';
    const reportEntry   = `\n            this.${fieldName},`;
    content = content.replace(arrayClose, reportEntry + arrayClose);

    fs.writeFileSync(pomPath, content, 'utf-8');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Prompt builders
  // ─────────────────────────────────────────────────────────────────────────

  buildLocatorsPrompt(testCase, ariaSnapshot) {
    const steps        = this.parseTestSteps(testCase.steps);
    const moduleName   = testCase.module || 'General';
    const pageProperty = this.getPagePropertyName(moduleName);
    const stem         = this.propertyToFileStem(pageProperty);   // "instruments-page"
    const varName      = this.getLocatorsVarName(pageProperty);   // "instrumentsLocators"
    const moduleUrl    = this.getModuleUrl(moduleName);

    const snapshotSection = ariaSnapshot
      ? `\n${'═'.repeat(64)}
LIVE PAGE STRUCTURE (ARIA accessibility snapshot from ${moduleUrl})
${'═'.repeat(64)}
The following is the actual ARIA tree of the ${moduleName} page as seen by the browser.
Use this to derive REAL selectors (roles, names, labels, text content) instead of guessing.

${ariaSnapshot}

IMPORTANT: Prefer selectors derived from the actual snapshot above over guessed
data-testid values. Use the ARIA roles, names, and text content you can see.\n`
      : '';

    return `Generate a TypeScript locator repository file for the ${moduleName} page.

${'═'.repeat(64)}
TEST CASE (use the steps to infer which UI elements exist)
${'═'.repeat(64)}
- ID       : ${testCase.id}
- Title    : ${testCase.title}
- Module   : ${moduleName}
- App URL  : ${moduleUrl}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}
${snapshotSection}
${'═'.repeat(64)}
LOCATOR FILE RULES
${'═'.repeat(64)}
1. PRIMARY SELECTOR — ${ariaSnapshot
      ? `derive selectors from the actual ARIA snapshot when available. Use
   role-based selectors (e.g. button[name="Create"]), aria-label, data-testid,
   or text-based selectors that match what the snapshot shows. Fall back to
   \`[data-testid="<kebab-case-id>"]\` only when no real selector can be derived.`
      : `use \`[data-testid="<kebab-case-id>"]\` as the primary
   selector for every element. Derive the test ID from the element's semantic
   role (e.g. "create-new-instrument-button", "instrument-name-input").`}

2. METADATA — include semantic hints to enable self-healing fallbacks:
   - role        : ARIA role string (button, textbox, combobox, table, row, …)
   - name        : visible button/link label text
   - label       : form field label text
   - placeholder : input placeholder text
   - text        : exact visible text content
   - description : plain-English description used for AI Phase-3 healing

3. KEYS — use camelCase key names that describe the element
   (e.g. createNewInstrumentButton, instrumentNameInput, statusFilter).

4. COVERAGE — create a key for every interactive element and every
   significant assertion target mentioned in the test steps.

5. EXPORT NAME — must be exactly \`${varName}\`.

6. FILE PATH — this file will be saved at: src/locators/${stem}-locators.ts

${'═'.repeat(64)}
EXACT FILE STRUCTURE (follow this precisely)
${'═'.repeat(64)}
\`\`\`typescript
import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for ${this.getClassName(pageProperty)}.
 *
 * Contains only pure data (selector strings + semantic metadata).
 * No Playwright Page dependency — safe to import anywhere.
 */
export const ${varName} = {

    pageContainer: {
        selector: '[data-testid="${stem}"]',
        metadata: {
            description: '${moduleName} page root container',
        },
    },

    someButton: {
        selector: '[data-testid="some-button"]',
        metadata: {
            role:        'button',
            name:        'Button Label',
            text:        'Button Label',
            description: 'Some button on the ${moduleName} page',
        },
    },

    someInput: {
        selector: '[data-testid="some-input"]',
        metadata: {
            role:        'textbox',
            label:       'Field Label',
            placeholder: 'Enter value',
            description: 'Some text input on the ${moduleName} page',
        },
    },

    someDropdown: {
        selector: '[data-testid="some-dropdown"]',
        metadata: {
            role:        'combobox',
            label:       'Dropdown Label',
            description: 'Some dropdown on the ${moduleName} page',
        },
    },

} satisfies Record<string, LocatorDefinition>;
\`\`\`

Return ONLY the TypeScript code block. Generate all locators needed to cover
every element referenced in the test steps.`;
  }

  buildPagePrompt(testCase, locatorEntries, ariaSnapshot) {
    const steps        = this.parseTestSteps(testCase.steps);
    const moduleName   = testCase.module || 'General';
    const pageProperty = this.getPagePropertyName(moduleName);
    const stem         = this.propertyToFileStem(pageProperty);     // "instruments-page"
    const className    = this.getClassName(pageProperty);            // "InstrumentsPageSelfHealing"
    const varName      = this.getLocatorsVarName(pageProperty);     // "instrumentsLocators"
    const moduleUrl    = this.getModuleUrl(moduleName);

    const locatorsBlock = locatorEntries.length > 0
      ? locatorEntries.map((l) => `    readonly ${l.key}: SelfHealingLocator; // ${l.description}`).join('\n')
      : '    // (derive locator field names from the test steps)';

    const wiringBlock = locatorEntries.length > 0
      ? locatorEntries.map((l) => `        this.${l.key} = SelfHealingLocator.from(page, ${varName}.${l.key}, logger, aiProvider);`).join('\n')
      : '        // Wire locators: this.<key> = SelfHealingLocator.from(page, <varName>.<key>, logger, aiProvider);';

    return `Generate a TypeScript self-healing page class for the ${moduleName} module.

${'═'.repeat(64)}
TEST CASE (use the steps to generate matching page methods)
${'═'.repeat(64)}
- ID       : ${testCase.id}
- Title    : ${testCase.title}
- Module   : ${moduleName}
- App URL  : ${moduleUrl}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}

${'═'.repeat(64)}
LOCATORS AVAILABLE (from src/locators/${stem}-locators.ts)
${'═'.repeat(64)}
${locatorEntries.length > 0
  ? locatorEntries.map((l) => `- this.${l.key}  — ${l.description}`).join('\n')
  : '(derive from test steps — locators file will be created alongside this file)'}

Use \`await this.<locatorField>.get()\` to resolve any locator to a Playwright
Locator, then pass the result to \`this.actions.*\` or \`this.assert.*\`.
${ariaSnapshot
  ? `\n${'═'.repeat(64)}
LIVE PAGE STRUCTURE (ARIA accessibility snapshot from ${moduleUrl})
${'═'.repeat(64)}
The following is the actual ARIA tree of the ${moduleName} page as seen by the browser.
Use this to understand which interactive elements exist and what actions are possible.

${ariaSnapshot}
`
  : ''}
${'═'.repeat(64)}
HELPER API (AdvancedActionsHelper / AdvancedAssertionsHelper)
${'═'.repeat(64)}
Actions  (this.actions.*):
  await this.actions.goto(url, description)
  await this.actions.click(locator, description)
  await this.actions.fill(locator, value, description)
  await this.actions.select(locator, value, description)
  await this.actions.hover(locator, description)
  await this.actions.press(locator, key, description)

Assertions  (this.assert.*):
  await this.assert.toBeVisible(locator, description)
  await this.assert.toHaveText(locator, expected, description)
  await this.assert.toHaveValue(locator, expected, description)
  await this.assert.toHaveURL(urlOrPattern, description)
  await this.assert.toBeEnabled(locator, description)
  await this.assert.toBeDisabled(locator, description)
  await this.assert.toHaveCount(locator, count, description)
  await this.assert.toHaveAttribute(locator, attr, value, description)
  await this.assert.toBeTruthy(value, description)

The \`locator\` argument is always a Playwright \`Locator\` — either
\`await this.<field>.get()\` or \`this.page.locator(selector)\` for one-off
elements that do not need a named locator field.

${'═'.repeat(64)}
PAGE CLASS RULES
${'═'.repeat(64)}
1. ONE METHOD PER STEP GROUP — create one public async method for each
   logical group of steps (navigate, fill form, verify content, etc.).
   Name methods using: verb + noun + context (e.g. navigateToInstrumentsPage,
   fillAndSaveNewInstrument, verifyInstrumentsPageContent).

2. JSDoc on every method — single-line /** … */ above each method.

3. SELF-HEALING LOCATORS — always call \`await this.<locator>.get()\` to
   resolve a locator through the three-phase healing chain. Never use raw
   selectors inside page methods.

4. NAVIGATION — use \`this.actions.goto('${moduleUrl}', 'Navigate to ${moduleName} page')\`.

5. FILE PATH — this file will be saved at: src/pages/${stem}-self-healing.ts

${'═'.repeat(64)}
EXACT FILE STRUCTURE (follow this precisely)
${'═'.repeat(64)}
\`\`\`typescript
import { type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { ${varName} } from '../locators/${stem}-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * ${className} — Page Object for the ${moduleName} module.
 *
 * Extends \`SelfHealingPageBase\` and wires every locator from
 * \`${varName}\` through \`SelfHealingLocator.from()\`.
 */
export class ${className} extends SelfHealingPageBase {

    // ── Locator fields ───────────────────────────────────────────────
${locatorsBlock}

    // ── Private helpers ──────────────────────────────────────────────
    private readonly page: Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);
        const logger = Logger.getLogger(\`${className}-\${testName}\`);

        // Wire every locator through SelfHealingLocator.from()
${wiringBlock}
    }

    // ── Page Actions ─────────────────────────────────────────────────

    /** Navigate to the ${moduleName} page */
    async navigateTo(): Promise<void> {
        await this.actions.goto('${moduleUrl}', 'Navigate to ${moduleName} page');
    }

    // ── Step Methods ─────────────────────────────────────────────────
    // (generate one method per logical step group from the test case)

}
\`\`\`

Return ONLY the TypeScript code block. Generate all step methods needed to
cover every step in the test case.`;
  }

  /**
   * Builds a prompt asking the AI to generate ONLY the locator entries that
   * are needed by this test case and are NOT already in the locators file.
   */
  buildAdditionalLocatorsPrompt(testCase, existingEntries, ariaSnapshot) {
    const steps      = this.parseTestSteps(testCase.steps);
    const moduleName = testCase.module || 'General';
    const moduleUrl  = this.getModuleUrl(moduleName);
    const existingList = existingEntries.map((e) => `- ${e.key}: ${e.description}`).join('\n');

    const snapshotSection = ariaSnapshot
      ? `\n${'═'.repeat(64)}
LIVE PAGE STRUCTURE (ARIA accessibility snapshot from ${moduleUrl})
${'═'.repeat(64)}
${ariaSnapshot}

Use the snapshot above to derive real selectors for new locator entries.
Prefer role-based, aria-label, or text-based selectors visible in the snapshot.\n`
      : '';

    return `The ${moduleName} page locators file already contains these entries:

${existingList || '(none yet)'}

Based on the test steps below, determine if any additional UI element locators are
needed that are NOT already covered by an entry in the list above.

${'═'.repeat(64)}
TEST CASE
${'═'.repeat(64)}
- ID    : ${testCase.id}
- Title : ${testCase.title}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}
${snapshotSection}
${'═'.repeat(64)}
OUTPUT RULES — READ CAREFULLY
${'═'.repeat(64)}
• If new locators ARE needed, output ONLY the new entries in this exact format.
  No import statement. No export declaration. No variable name. No code fences.
${ariaSnapshot
  ? `  Derive selectors from the actual ARIA snapshot when possible.`
  : `  Use data-testid selectors as the primary selector.`}

    newLocatorKey: {
        selector: '[data-testid="new-locator"]',
        metadata: {
            role:        'button',
            name:        'Button Label',
            description: 'Plain-English description for AI healing',
        },
    },

• If NO new locators are needed, output ONLY the exact text: NO_ADDITIONS`;
  }

  /**
   * Builds a prompt asking the AI to generate ONLY the page methods that are
   * needed by this test case and are NOT already in the page class.
   */
  buildAdditionalMethodsPrompt(testCase, existingMethods, locatorEntries, ariaSnapshot) {
    const steps      = this.parseTestSteps(testCase.steps);
    const moduleName = testCase.module || 'General';
    const moduleUrl  = this.getModuleUrl(moduleName);

    const locatorsBlock = locatorEntries.length > 0
      ? locatorEntries.map((l) => `- this.${l.key}  — ${l.description}`).join('\n')
      : '(see locators file)';

    const snapshotSection = ariaSnapshot
      ? `\n${'═'.repeat(64)}
LIVE PAGE STRUCTURE (ARIA accessibility snapshot from ${moduleUrl})
${'═'.repeat(64)}
${ariaSnapshot}

Use the snapshot above to understand what interactions and assertions are possible.\n`
      : '';

    return `The ${moduleName} page class already has these async methods:
${existingMethods.join(', ')}

Based on the test steps below, determine if any additional async page methods are
needed that are NOT already covered by an existing method in the list above.

${'═'.repeat(64)}
TEST CASE
${'═'.repeat(64)}
- ID    : ${testCase.id}
- Title : ${testCase.title}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}

${'═'.repeat(64)}
AVAILABLE LOCATORS (use await this.<field>.get() to resolve)
${'═'.repeat(64)}
${locatorsBlock}
${snapshotSection}
Helper APIs:
  this.actions.goto('${moduleUrl}', 'description')
  this.actions.click(locator, 'description')
  this.actions.fill(locator, value, 'description')
  this.actions.select(locator, value, 'description')
  this.assert.toBeVisible(locator, 'description')
  this.assert.toHaveText(locator, expected, 'description')
  this.assert.toHaveURL(urlPattern, 'description')

${'═'.repeat(64)}
OUTPUT RULES — READ CAREFULLY
${'═'.repeat(64)}
• If new methods ARE needed, output ONLY the method bodies. No class declaration.
  No import statements. No code fences.

    /** JSDoc description */
    async newMethod(): Promise<void> {
        await this.actions.click(await this.someLocator.get(), 'Click something');
    }

• If NO new methods are needed, output ONLY the exact text: NO_ADDITIONS`;
  }

  /**
   * @param {object}                    testCase
   * @param {Array<{key,description}>}  [overrideLocators] - use instead of loadLocators()
   * @param {string[]}                  [overrideMethods]  - use instead of loadPageMethods()
   */
  buildTestPrompt(testCase, overrideLocators, overrideMethods, ariaSnapshot) {
    const steps        = this.parseTestSteps(testCase.steps);
    const moduleName   = testCase.module || 'General';
    const pageProperty = this.getPagePropertyName(moduleName);
    const moduleTag    = moduleName.toLowerCase().replace(/[\s-]+/g, '-');
    const outputPath   = this.getOutputPath(testCase);
    const generatedAt  = new Date().toISOString();

    // Prefer in-memory overrides (freshly generated but not yet on disk),
    // fall back to disk reads (files already existed before this run).
    const locators = overrideLocators ?? this.loadLocators(pageProperty);
    const methods  = overrideMethods  ?? this.loadPageMethods(pageProperty);
    const pomProps = this.loadPomProperties();

    // Layer 1 — element inventory (reference only — never accessed directly in tests)
    const locatorsSection = locators.length > 0
      ? `**Layer 1 — UI elements on \`${pageProperty}\` (REFERENCE ONLY — never call .get() in tests):**
${locators.map((l) => `- \`${l.key}\` — ${l.description}`).join('\n')}

These are \`SelfHealingLocator\` fields wired inside the page class constructor.
They are listed here only to help you choose or invent page method names.
NEVER access locator fields in the test body.`
      : `**Layer 1 — Locators:** No locators file found for this page yet.
Infer element names from the test steps and use standard naming conventions.`;

    // Layer 2 — existing callable methods
    const methodsSection = methods.length > 0
      ? `**Layer 2 — Existing page methods (PREFER THESE):**
${methods.map((m) => `- \`pomSelfHealing.${pageProperty}.${m}()\``).join('\n')}

Use existing methods wherever a step maps to one. Do NOT call methods not in
this list. If no method covers a step, invent a descriptive name.`
      : `**Layer 2 — Page methods:** No methods exist yet for this page.
Invent descriptive method names:
- Navigation : \`navigateTo<Page>()\`, \`clickSideMenu<Tab>()\`
- Actions    : \`click<Element>()\`, \`fill<Form>()\`, \`select<Option>()\`
- Assertions : \`verify<Content>()\`, \`assert<State>()\`
- Combined   : \`clickAndVerify<Action>()\`, \`fillAndSave<Form>()\``;

    // Layer 3 — POM registry for cross-page calls
    const pomSection = pomProps.length > 0
      ? `**Layer 3 — POM pages available (pomSelfHealing.<property>):**
${pomProps.map((p) => `- pomSelfHealing.${p}`).join('\n')}

For cross-page steps use the appropriate page, e.g. \`pomSelfHealing.auditTrailPage.*\`.`
      : '';

    return `Generate a complete Playwright TypeScript test for the Azure Test Plan test case below.
The test MUST strictly follow the project's three-layer self-healing POM conventions.

${'═'.repeat(64)}
TEST CASE
${'═'.repeat(64)}
- ID       : ${testCase.id}
- Title    : ${testCase.title}
- Module   : ${moduleName}
- Area     : ${testCase.area || moduleName}
- Priority : ${testCase.priority || 'Not specified'}
- Tags     : ${testCase.tags || 'none'}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}

${'═'.repeat(64)}
PROJECT LAYERS FOR THIS MODULE
${'═'.repeat(64)}
${locatorsSection}

${methodsSection}

${pomSection}
${ariaSnapshot
  ? `\n${'═'.repeat(64)}
LIVE PAGE STRUCTURE (ARIA accessibility snapshot)
${'═'.repeat(64)}
The following is the actual ARIA tree of the ${moduleName} page as seen by the browser.
Use this to understand the real UI elements when mapping test steps to page methods.

${ariaSnapshot}
`
  : ''}
${'═'.repeat(64)}
FRAMEWORK RULES — NEVER VIOLATE
${'═'.repeat(64)}
1. IMPORT — always and only from the self-healing fixture:
     import { test, expect } from '../../fixtures/self-healing-fixture';
   NEVER import from '@playwright/test' directly.

2. FIXTURE — use self-healing fixture destructuring:
     async ({ selfHealingFixture: { pomSelfHealing } }) => { ... }
   NEVER destructure { page }.

3. NO test.step() IN TEST BODY — StepRunner inside each helper tracks steps
   automatically. Call methods at the top level of the test body:
     await pomSelfHealing.${pageProperty}.someMethod();

4. NO DIRECT LOCATORS — never use page.locator(), page.getByRole(),
   page.getByText(), page.fill(), page.click(), or any raw Playwright API.

5. NO DIRECT ASSERTIONS — never use expect(locator).*. All assertions are
   encapsulated inside page object methods.

6. AUTHENTICATION — the user is already authenticated via storageState.
   Do NOT add login steps unless the test explicitly requires them.

7. STEP COMMENTS — add "// Step N: <description>" above each method call.

8. NO DIRECT LOCATOR FIELD ACCESS — never call .get() on locator fields in
   the test body. These are WRONG:
     ✗  await pomSelfHealing.${pageProperty}.someLocator.get()
     ✗  await expect(await pomSelfHealing.${pageProperty}.someLocator.get()).toBeVisible()
   The ONLY correct pattern is:
     ✓  await pomSelfHealing.${pageProperty}.verifyPageContent()

${'═'.repeat(64)}
REQUIRED OUTPUT FORMAT
${'═'.repeat(64)}
File path: ${outputPath}

Return ONLY a TypeScript code block:

\`\`\`typescript
/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 *
 * @testcase TC-${testCase.id}
 * @title    ${testCase.title}
 * @module   ${moduleName}
 * @area     ${testCase.area || moduleName}
 * @priority ${testCase.priority || 'Not specified'}
 * @tags     ${testCase.tags || 'none'}
 *
 * @generated ${generatedAt}
 * @revision  1
 */

import { test, expect } from '../../fixtures/self-healing-fixture';

test.describe('${moduleName} - ${testCase.title}', () => {
  test('TC-${testCase.id}: ${testCase.title} @${moduleTag}', async ({ selfHealingFixture: { pomSelfHealing } }) => {

    // Step 1: <describe first step>
    await pomSelfHealing.${pageProperty}.methodName();

    // Step 2: <describe second step>
    await pomSelfHealing.${pageProperty}.anotherMethod();
  });
});
\`\`\`

Generate the complete TypeScript test now:`;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI call — provider router
  // ─────────────────────────────────────────────────────────────────────────

  static SYSTEM_PROMPT =
    'You are an expert test automation engineer specialising in Playwright ' +
    'TypeScript. You produce production-ready code that strictly follows the ' +
    "project's self-healing Page Object Model conventions.";

  /**
   * Dispatches to the active provider and returns a normalised response
   * with the shape `{ choices: [{ message: { content: string } }] }`.
   * All three callers consume only `response.choices[0].message.content`,
   * so the internal provider format is fully hidden here.
   * @param {string} prompt
   */
  async _aiCall(prompt) {
    switch (this.provider) {
      case 'openai':    return this._aiCallOpenAI(prompt, PlaywrightGenerator.SYSTEM_PROMPT);
      case 'anthropic': return this._aiCallAnthropic(prompt, PlaywrightGenerator.SYSTEM_PROMPT);
      case 'gemini':    return this._aiCallGemini(prompt, PlaywrightGenerator.SYSTEM_PROMPT);
      default:
        throw new Error(`Unknown provider "${this.provider}"`);
    }
  }

  /**
   * OpenAI — chat completions.
   * Returns the native response (already matches the normalised shape).
   */
  async _aiCallOpenAI(prompt, system) {
    return this.client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.2,
      max_tokens:  4096,
    });
  }

  /**
   * Anthropic — Messages API.
   * Normalises to `{ choices: [{ message: { content } }] }`.
   */
  async _aiCallAnthropic(prompt, system) {
    const response = await this.client.messages.create({
      model:      this.model,
      max_tokens: 4096,
      system,
      messages:   [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    return { choices: [{ message: { content: text } }] };
  }

  /**
   * Google Gemini — Generative Language API.
   * Normalises to `{ choices: [{ message: { content } }] }`.
   */
  async _aiCallGemini(prompt, system) {
    const genModel = this.client.getGenerativeModel({
      model: this.model,
      systemInstruction: system,
    });
    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature:     0.2,
        maxOutputTokens: 4096,
      },
    });
    const text = result.response.text();
    return { choices: [{ message: { content: text } }] };
  }

  parseTestSteps(stepsXml) {
    if (!stepsXml) return 'No steps provided';
    try {
      const stepMatches = stepsXml.match(/<step[^>]*>[\s\S]*?<\/step>/g);
      if (!stepMatches) return stepsXml;

      const stripTags = (s) => s.replace(/<[^>]+>/g, '').trim();

      return stepMatches
        .map((step, i) => {
          const params   = [...step.matchAll(/<parameterizedString[^>]*>([\s\S]*?)<\/parameterizedString>/g)];
          const action   = params[0] ? stripTags(params[0][1]) : '';
          const expected = params[1] ? stripTags(params[1][1]) : '';
          return `${i + 1}. **Action:** ${action}\n   **Expected Result:** ${expected || 'N/A'}`;
        })
        .join('\n\n');
    } catch {
      tcGenerateLogger.warn('Could not parse test steps XML, returning raw content');
      return stepsXml;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Post-validation
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Sanitizes and validates a generated test spec:
   *  1. Escapes unmatched single-quote apostrophes in string literals
   *     (e.g. `isn't` → `isn\\'t` inside single-quoted strings)
   *  2. Logs warnings for page methods called in the test that do NOT exist
   *     in the page class (phantom method calls)
   *
   * @param {string}   code         - The generated test spec code
   * @param {string}   pageProperty - POM property name (e.g. 'productsPage')
   * @param {string[]} pageMethods  - Known method names in the page class
   * @returns {string} The sanitized test code
   */
  _postValidateTestSpec(code, pageProperty, pageMethods) {
    let sanitized = code;

    // 1. Fix unescaped apostrophes inside single-quoted strings
    //    Match: '...word'X...'  where X is a letter (i.e. it's → it\'s)
    sanitized = sanitized.replace(
      /('(?:[^'\\]|\\.)*?)(')(\w)/g,
      (_, before, quote, after) => {
        // Only fix if this looks like a contraction mid-word (e.g. isn't)
        return before + "\\'" + after;
      },
    );
    // Simpler targeted fix: common contractions inside single-quoted strings
    sanitized = sanitized.replace(/(\w)'(t|s|re|ve|ll|d|m)\b/g, (match, pre, suf) => {
      // Only apply inside a string context — check if we're between quotes
      return `${pre}\\'${suf}`;
    });

    // 2. Check for phantom method calls
    const methodsSet = new Set(pageMethods);
    const callPattern = new RegExp(
      `pomSelfHealing\\.${pageProperty}\\.(\\w+)\\s*\\(`,
      'g',
    );
    const calledMethods = [...sanitized.matchAll(callPattern)].map((m) => m[1]);
    const phantoms = [...new Set(calledMethods)].filter((m) => !methodsSet.has(m));

    if (phantoms.length > 0) {
      tcGenerateLogger.warn(
        `Test spec calls ${phantoms.length} method(s) not found in ${pageProperty}: ${phantoms.join(', ')}`,
      );
    }

    return sanitized;
  }

  extractCode(response) {
    const match = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    let code = match ? match[1].trim() : response.trim();
    if (!match) {
      tcGenerateLogger.warn('No TypeScript code block in AI response — using full response');
    }

    // Strip leading JSDoc block the AI often includes — the orchestrator adds
    // its own metadata header, so keeping the AI's header produces duplicates.
    code = code.replace(/^\/\*\*[\s\S]*?\*\/\s*\n?/, '');

    return code;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = PlaywrightGenerator;
