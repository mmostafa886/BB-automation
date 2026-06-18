import tcGenerateLogger from '../utils/tc-generate-logger.js';
import fs from 'fs';
import path from 'path';
import MCPSnapshotProvider from './mcpSnapshotProvider.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AIProvider = 'openai' | 'anthropic' | 'gemini';

export interface LocatorEntry {
  key: string;
  description: string;
}

export interface TestCase {
  id: string;
  title: string;
  module?: string;
  area?: string;
  priority?: number | string;
  tags?: string;
  steps?: string;
  revision?: number;
  areaPath?: string;
}

export interface GenerateAllResult {
  locators: { path: string; action: 'created' | 'updated' | 'unchanged' };
  page: { path: string; action: 'created' | 'updated' | 'unchanged' };
  test: { code: string; path: string };
  pomRegistered: boolean;
  success: boolean;
}

interface AIResponse {
  choices: Array<{ message: { content: string } }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider detection
// ─────────────────────────────────────────────────────────────────────────────

const MODEL_PREFIX_TO_PROVIDER: Record<string, AIProvider> = {
  'gpt-':    'openai',
  'o1':      'openai',
  'o3':      'openai',
  'claude-': 'anthropic',
  'gemini-': 'gemini',
};

function detectProvider(model: string): AIProvider {
  for (const [prefix, provider] of Object.entries(MODEL_PREFIX_TO_PROVIDER)) {
    if (model.startsWith(prefix)) return provider;
  }
  return 'openai';
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const RESERVED_LOCATOR_KEYS = new Set([
  'metadata', 'selector', 'description', 'role',
  'name', 'label', 'placeholder', 'text',
]);

const MODULE_TO_POM_PROPERTY: Record<string, string> = {
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

const MODULE_TO_URL: Record<string, string> = {
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

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai:    'gpt-4o',
  anthropic: 'claude-sonnet-4-6',
  gemini:    'gemini-2.0-flash',
};

const MODEL_ENV_VARS: Record<AIProvider, string> = {
  openai:    'OPENAI_MODEL',
  anthropic: 'ANTHROPIC_MODEL',
  gemini:    'GEMINI_MODEL',
};

// ─────────────────────────────────────────────────────────────────────────────
// Class
// ─────────────────────────────────────────────────────────────────────────────

class PlaywrightGenerator {
  readonly provider: AIProvider;
  readonly model: string;
  readonly client: unknown;
  private _snapshotProvider: MCPSnapshotProvider | null;
  private _mcpInitAttempted: boolean;

  constructor(apiKey: string, model?: string | null, provider?: AIProvider) {
    this.provider = provider ?? (model ? detectProvider(model) : 'openai');

    this.model =
      model ??
      process.env[MODEL_ENV_VARS[this.provider]] ??
      DEFAULT_MODELS[this.provider];

    if (this.provider === 'openai') {
      let OpenAI;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        OpenAI = require('openai');
      } catch {
        throw new Error('Package openai is not installed. Run: npm install openai');
      }
      this.client = new OpenAI({ apiKey });

    } else if (this.provider === 'anthropic') {
      let Anthropic;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        Anthropic = require('@anthropic-ai/sdk');
      } catch {
        throw new Error('Package @anthropic-ai/sdk is not installed. Run: npm install @anthropic-ai/sdk');
      }
      this.client = new Anthropic({ apiKey });

    } else if (this.provider === 'gemini') {
      let GoogleGenerativeAI;
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        ({ GoogleGenerativeAI } = require('@google/generative-ai'));
      } catch {
        throw new Error('Package @google/generative-ai is not installed. Run: npm install @google/generative-ai');
      }
      this.client = new GoogleGenerativeAI(apiKey);

    } else {
      throw new Error(`Unknown provider "${this.provider}". Valid values: 'openai', 'anthropic', 'gemini'.`);
    }

    this._snapshotProvider = null;
    this._mcpInitAttempted = false;

    tcGenerateLogger.info(`PlaywrightGenerator ready — provider: ${this.provider}, model: ${this.model}`);
  }

  static fromEnv(): PlaywrightGenerator {
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

  private async _getSnapshotProvider(): Promise<MCPSnapshotProvider | null> {
    if (this._mcpInitAttempted) return this._snapshotProvider?._initialized ? this._snapshotProvider : null;
    this._mcpInitAttempted = true;

    this._snapshotProvider = new MCPSnapshotProvider();
    await this._snapshotProvider.initialize();
    return this._snapshotProvider._initialized ? this._snapshotProvider : null;
  }

  private async _getModuleSnapshot(moduleName: string): Promise<string | null> {
    const provider = await this._getSnapshotProvider();
    if (!provider) return null;
    const moduleUrl = this.getModuleUrl(moduleName);
    return provider.getSnapshot(moduleUrl);
  }

  async closeMCPSession(): Promise<void> {
    if (this._snapshotProvider) {
      await this._snapshotProvider.close();
      this._snapshotProvider = null;
    }
    this._mcpInitAttempted = false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Path / naming helpers
  // ─────────────────────────────────────────────────────────────────────────

  propertyToFileStem(propertyName: string): string {
    return propertyName.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase());
  }

  getLocatorsPath(propertyName: string): string {
    const stem = this.propertyToFileStem(propertyName);
    return `src/locators/${stem}-locators.ts`;
  }

  getPagePath(propertyName: string): string {
    const stem = this.propertyToFileStem(propertyName);
    return `src/pages/${stem}-self-healing.ts`;
  }

  getPagePropertyName(module?: string): string {
    if (!module) return 'homePage';
    const key = module.trim().toLowerCase();
    if (MODULE_TO_POM_PROPERTY[key]) return MODULE_TO_POM_PROPERTY[key];
    return key.replace(/[-\s]+(.)/g, (_, c: string) => c.toUpperCase()) + 'Page';
  }

  getModuleUrl(module?: string): string {
    if (!module) return '/';
    const key = module.trim().toLowerCase();
    return MODULE_TO_URL[key] || `/${key.replace(/\s+/g, '-')}`;
  }

  getLocatorsVarName(propertyName: string): string {
    return propertyName.replace(/Page$/, '') + 'Locators';
  }

  getClassName(propertyName: string): string {
    return propertyName.charAt(0).toUpperCase() + propertyName.slice(1) + 'SelfHealing';
  }

  getOutputFolder(module?: string): string {
    return (module || 'General')
      .trim()
      .split(/[\s-]+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join('-');
  }

  getOutputPath(testCase: TestCase): string {
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
  // Skeleton builders
  // ─────────────────────────────────────────────────────────────────────────

  _buildSkeletonLocatorsCode(pageProperty: string, moduleName: string): string {
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

  _buildSkeletonPageCode(pageProperty: string, moduleName: string, locatorEntries: LocatorEntry[]): string {
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
  // Layer loaders
  // ─────────────────────────────────────────────────────────────────────────

  loadLocators(propertyName: string): LocatorEntry[] {
    try {
      const absPath = path.join(__dirname, '../..', this.getLocatorsPath(propertyName));
      if (!fs.existsSync(absPath)) {
        tcGenerateLogger.debug(`No locators file for "${propertyName}": ${absPath}`);
        return [];
      }
      const content = fs.readFileSync(absPath, 'utf-8');
      return this._parseLocatorEntries(content);
    } catch (err) {
      tcGenerateLogger.warn(`Could not load locators for "${propertyName}":`, (err as Error).message);
      return [];
    }
  }

  _parseLocatorEntries(content: string): LocatorEntry[] {
    const keyMatches = [...content.matchAll(/^ {4}(\w+):\s*\{/gm)];
    return keyMatches
      .filter((m) => !RESERVED_LOCATOR_KEYS.has(m[1]))
      .map((m, i, arr) => {
        const key        = m[1];
        const blockStart = m.index!;
        const blockEnd   = arr[i + 1] ? arr[i + 1].index! : content.length;
        const block      = content.slice(blockStart, blockEnd);
        const descMatch  = /description:\s*['"`](.*?)['"`]/.exec(block);
        return { key, description: descMatch ? descMatch[1] : key };
      });
  }

  _parsePageMethods(content: string): string[] {
    const matches = [...content.matchAll(/^ {4}async\s+(\w+)\s*\(/gm)];
    return matches.map((m) => m[1]).filter((n) => n !== 'constructor');
  }

  loadPageMethods(propertyName: string): string[] {
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
      tcGenerateLogger.warn(`Could not load page methods for "${propertyName}":`, (err as Error).message);
      return [];
    }
  }

  loadPomProperties(): string[] {
    try {
      const absPath = path.join(__dirname, '../../src/pages/pom-lazy-self-healing.ts');
      if (!fs.existsSync(absPath)) return [];
      const content = fs.readFileSync(absPath, 'utf-8');
      return [...content.matchAll(/^\s+get\s+(\w+)\s*\(\)/gm)].map((m) => m[1]);
    } catch (err) {
      tcGenerateLogger.warn('Could not load POM properties:', (err as Error).message);
      return [];
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Core generation
  // ─────────────────────────────────────────────────────────────────────────

  async generateTest(testCase: TestCase, overrideLocators?: LocatorEntry[], overrideMethods?: string[], ariaSnapshot?: string | null): Promise<string> {
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

  async generateLocatorsFile(testCase: TestCase, ariaSnapshot?: string | null): Promise<string> {
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

  async generatePageFile(testCase: TestCase, locatorEntries?: LocatorEntry[], ariaSnapshot?: string | null): Promise<string> {
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
  // Orchestrator — generateAll
  // ─────────────────────────────────────────────────────────────────────────

  async generateAll(testCase: TestCase): Promise<GenerateAllResult> {
    const pageProperty    = this.getPagePropertyName(testCase.module);
    const locatorsPath    = this.getLocatorsPath(pageProperty);
    const pagePath        = this.getPagePath(pageProperty);
    const testPath        = this.getOutputPath(testCase);
    const locatorsAbsPath = path.join(process.cwd(), locatorsPath);
    const pageAbsPath     = path.join(process.cwd(), pagePath);
    const moduleName      = testCase.module || 'General';

    let locatorsAction: 'created' | 'updated' | 'unchanged' = 'unchanged';
    let locatorEntries: LocatorEntry[];

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

    let pageAction: 'created' | 'updated' | 'unchanged' = 'unchanged';
    let pageMethods: string[];

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

    let pomRegistered = false;
    if (!this._isRegisteredInPom(pageProperty)) {
      this._registerPageInPom(pageProperty);
      pomRegistered = true;
      tcGenerateLogger.info(`Registered ${pageProperty} in pom-lazy-self-healing.ts`);
    }

    const ariaSnapshot = await this._getModuleSnapshot(moduleName);
    if (ariaSnapshot) {
      tcGenerateLogger.info(`ARIA snapshot captured for ${moduleName} (${ariaSnapshot.length} chars)`);
    } else {
      tcGenerateLogger.debug(`No ARIA snapshot available for ${moduleName} — using text-only prompts`);
    }

    const locatorAdditions = await this.generateAdditionalLocators(testCase, locatorEntries, ariaSnapshot);
    if (locatorAdditions) {
      this._appendToLocatorsFile(locatorsAbsPath, locatorAdditions);
      locatorEntries = this.loadLocators(pageProperty);
      if (locatorsAction === 'unchanged') locatorsAction = 'updated';
      tcGenerateLogger.info(`Locators updated with test-specific entries: ${locatorsPath}`);
    }

    if (locatorAdditions) {
      this._syncPageLocatorFields(pageAbsPath, pageProperty, locatorEntries);
      pageMethods = this.loadPageMethods(pageProperty);
    }

    const methodAdditions = await this.generateAdditionalMethods(testCase, pageMethods, locatorEntries, ariaSnapshot);
    if (methodAdditions) {
      this._appendToPageFile(pageAbsPath, methodAdditions);
      pageMethods = this.loadPageMethods(pageProperty);
      if (pageAction === 'unchanged') pageAction = 'updated';
      tcGenerateLogger.info(`Page updated with test-specific methods: ${pagePath}`);
    }

    const rawTestCode = await this.generateTest(testCase, locatorEntries, pageMethods, ariaSnapshot);
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

  async generateAllMultiple(testCases: TestCase[]): Promise<Array<{ testCase: TestCase; error?: string; success: boolean } & Partial<GenerateAllResult>>> {
    const results = [];
    for (const testCase of testCases) {
      try {
        const result = await this.generateAll(testCase);
        results.push({ testCase, ...result, success: true });
      } catch (err) {
        const prop = this.getPagePropertyName(testCase.module);
        results.push({
          testCase,
          error    : (err as Error).message,
          locators : { path: this.getLocatorsPath(prop), action: 'unchanged' as const },
          page     : { path: this.getPagePath(prop),     action: 'unchanged' as const },
          test     : { code: '', path: this.getOutputPath(testCase) },
          pomRegistered: false,
          success  : false,
        });
      }
      await this.delay(300);
    }
    return results;
  }

  async generateMultipleTests(testCases: TestCase[]): Promise<Array<{ testCase: TestCase; code?: string; path: string; success: boolean; error?: string }>> {
    const results = [];
    for (const testCase of testCases) {
      try {
        const code = await this.generateTest(testCase);
        results.push({ testCase, code, path: this.getOutputPath(testCase), success: true });
      } catch (err) {
        results.push({ testCase, error: (err as Error).message, path: this.getOutputPath(testCase), success: false });
      }
      await this.delay(300);
    }
    return results;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Incremental generators
  // ─────────────────────────────────────────────────────────────────────────

  async generateAdditionalLocators(testCase: TestCase, existingEntries: LocatorEntry[], ariaSnapshot?: string | null): Promise<string | null> {
    tcGenerateLogger.info(`Checking for additional locators needed for TC-${testCase.id}`);
    try {
      const raw = (
        await this._aiCall(this.buildAdditionalLocatorsPrompt(testCase, existingEntries, ariaSnapshot))
      ).choices[0].message.content;
      const stripped = raw
        .replace(/```(?:typescript|ts)?\n?/gi, '')
        .replace(/```\n?/g, '')
        .trim();
      if (!stripped || stripped === 'NO_ADDITIONS') return null;
      return stripped;
    } catch (err) {
      tcGenerateLogger.warn(`Could not check additional locators for TC-${testCase.id}: ${(err as Error).message}`);
      return null;
    }
  }

  async generateAdditionalMethods(testCase: TestCase, existingMethods: string[], locatorEntries: LocatorEntry[], ariaSnapshot?: string | null): Promise<string | null> {
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
      return this._sanitizeMethodBodies(stripped);
    } catch (err) {
      tcGenerateLogger.warn(`Could not check additional methods for TC-${testCase.id}: ${(err as Error).message}`);
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // AI output sanitizers
  // ─────────────────────────────────────────────────────────────────────────

  _sanitizeMethodBodies(code: string): string {
    let sanitized = code;

    sanitized = sanitized.replace(
      /expect\(([^)]+)\)\.(toBe|toEqual|toBeTruthy|toBeFalsy|toContain|toMatch)\(([^)]*)\)/g,
      (_match: string, expr: string, _matcher: string, val: string) => {
        tcGenerateLogger.debug(`Replaced raw expect(${expr}).${_matcher}(${val}) with this.assert.toBeTruthy`);
        return `await this.assert.toBeTruthy(${expr} === ${val || 'true'}, 'Verify ${expr.trim()} equals ${val || 'expected value'}')`;
      },
    );

    sanitized = sanitized.replace(
      /await (this\.\w+\.get\(\))\.(\w+)\(/g,
      (_match: string, getCall: string, chain: string) => {
        tcGenerateLogger.debug(`Fixed unresolved promise chain: ${getCall}.${chain}(`);
        return `(await ${getCall}).${chain}(`;
      },
    );

    return sanitized;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // File-append utilities
  // ─────────────────────────────────────────────────────────────────────────

  _appendToLocatorsFile(absPath: string, newEntriesCode: string): void {
    const content = fs.readFileSync(absPath, 'utf-8');
    const marker  = '} satisfies Record<string, LocatorDefinition>';
    const idx     = content.indexOf(marker);
    if (idx === -1) {
      tcGenerateLogger.warn(`Cannot append locators — marker not found in: ${absPath}`);
      return;
    }

    const existingKeys = new Set(this._parseLocatorEntries(content).map((e) => e.key));
    const filtered = this._stripDuplicateLocatorBlocks(newEntriesCode, existingKeys);
    if (!filtered) {
      tcGenerateLogger.debug('All proposed locator entries already exist — skipping append');
      return;
    }

    const updated = content.slice(0, idx) + '\n' + filtered + '\n\n' + content.slice(idx);
    fs.writeFileSync(absPath, updated, 'utf-8');
  }

  _stripDuplicateLocatorBlocks(rawCode: string, existingKeys: Set<string>): string | null {
    const keyPattern = /^ {4}(\w+):\s*\{/gm;
    const matches = [...rawCode.matchAll(keyPattern)];
    if (matches.length === 0) return rawCode.trim() || null;

    const kept: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < matches.length; i++) {
      const key   = matches[i][1];
      const start = matches[i].index!;
      const end   = matches[i + 1] ? matches[i + 1].index! : rawCode.length;
      const block = rawCode.slice(start, end);

      if (RESERVED_LOCATOR_KEYS.has(key)) {
        tcGenerateLogger.warn(`Rejected locator entry with reserved key "${key}" — AI confused a property name for a locator key`);
        continue;
      }

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

  _appendToPageFile(absPath: string, newMethodsCode: string): void {
    const content = fs.readFileSync(absPath, 'utf-8');
    const lastBrace = content.lastIndexOf('\n}');
    if (lastBrace === -1) {
      tcGenerateLogger.warn(`Cannot append methods — class closing brace not found in: ${absPath}`);
      return;
    }

    const existingMethods = new Set(this._parsePageMethods(content));
    const filtered = this._stripDuplicateMethodBlocks(newMethodsCode, existingMethods);
    if (!filtered) {
      tcGenerateLogger.debug('All proposed page methods already exist — skipping append');
      return;
    }

    const normalized = this._normalizeMethodIndent(filtered);
    const updated = content.slice(0, lastBrace) + '\n\n' + normalized + '\n' + content.slice(lastBrace);
    fs.writeFileSync(absPath, updated, 'utf-8');
  }

  _stripDuplicateMethodBlocks(rawCode: string, existingMethods: Set<string>): string | null {
    const methodPattern = /^ {4}async\s+(\w+)\s*\(/gm;
    const matches = [...rawCode.matchAll(methodPattern)];
    if (matches.length === 0) return rawCode.trim() || null;

    const kept: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < matches.length; i++) {
      const name  = matches[i][1];
      let start = matches[i].index!;
      const preceding = rawCode.slice(0, start);
      const jsdocIdx = preceding.lastIndexOf('    /**');
      if (jsdocIdx !== -1 && preceding.slice(jsdocIdx, start).trim().endsWith('*/')) {
        start = jsdocIdx;
      }
      const end = matches[i + 1]
        ? (() => {
            let e = matches[i + 1].index!;
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

  _normalizeMethodIndent(code: string): string {
    if (/^async\s/m.test(code) && !/^ {4}async\s/m.test(code)) {
      tcGenerateLogger.debug('Normalizing 0-indent method bodies to 4-space class-body indent');
      return code.split('\n').map((line) => (line.trim() ? '    ' + line : line)).join('\n');
    }
    return code;
  }

  _syncPageLocatorFields(pageAbsPath: string, pageProperty: string, locatorEntries: LocatorEntry[]): void {
    if (!fs.existsSync(pageAbsPath)) return;
    let content = fs.readFileSync(pageAbsPath, 'utf-8');
    const varName = this.getLocatorsVarName(pageProperty);

    const existingFields = new Set(
      [...content.matchAll(/readonly\s+(\w+)\s*:\s*SelfHealingLocator/g)].map((m) => m[1]),
    );

    const seen = new Set<string>();
    const newEntries = locatorEntries.filter((l) => {
      if (existingFields.has(l.key) || seen.has(l.key)) return false;
      seen.add(l.key);
      return true;
    });
    if (newEntries.length === 0) return;

    let fieldsMarker = content.indexOf('    // ── Private helpers');
    if (fieldsMarker === -1) fieldsMarker = content.indexOf('    private readonly page: Page;');
    if (fieldsMarker > 0) {
      const newFields = newEntries
        .map((l) => `    readonly ${l.key}: SelfHealingLocator;`)
        .join('\n') + '\n';
      content = content.slice(0, fieldsMarker) + newFields + content.slice(fieldsMarker);
    }

    const wiringMatches = [...content.matchAll(/.*SelfHealingLocator\.from\(.+\);.*\n/g)];
    if (wiringMatches.length > 0) {
      const last = wiringMatches[wiringMatches.length - 1];
      const pos  = last.index! + last[0].length;
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

  _isRegisteredInPom(pageProperty: string): boolean {
    try {
      const pomPath = path.join(__dirname, '../../src/pages/pom-lazy-self-healing.ts');
      if (!fs.existsSync(pomPath)) return false;
      const content = fs.readFileSync(pomPath, 'utf-8');
      return new RegExp(`\\bget\\s+${pageProperty}\\s*\\(`).test(content);
    } catch {
      return false;
    }
  }

  _registerPageInPom(pageProperty: string): void {
    const pomPath = path.join(__dirname, '../../src/pages/pom-lazy-self-healing.ts');
    if (!fs.existsSync(pomPath)) {
      tcGenerateLogger.warn('pom-lazy-self-healing.ts not found — skipping POM registration');
      return;
    }

    let content     = fs.readFileSync(pomPath, 'utf-8');
    const className = this.getClassName(pageProperty);
    const stem      = this.propertyToFileStem(pageProperty);
    const fieldName = `_${pageProperty}`;

    const aiImport  = `import { type AIHealingProvider } from '../utils/self-healing-locator';`;
    const newImport = `import { ${className} } from './${stem}-self-healing';\n`;
    content = content.replace(aiImport, newImport + aiImport);

    const constructorLine = '\n    constructor(page:';
    const fieldDecl       = `\n    private ${fieldName}?:                   ${className};`;
    content = content.replace(constructorLine, fieldDecl + constructorLine);

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

    const arrayClose    = '\n        ];';
    const reportEntry   = `\n            this.${fieldName},`;
    content = content.replace(arrayClose, reportEntry + arrayClose);

    fs.writeFileSync(pomPath, content, 'utf-8');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Prompt builders
  // ─────────────────────────────────────────────────────────────────────────

  buildLocatorsPrompt(testCase: TestCase, ariaSnapshot?: string | null): string {
    const steps        = this.parseTestSteps(testCase.steps);
    const moduleName   = testCase.module || 'General';
    const pageProperty = this.getPagePropertyName(moduleName);
    const stem         = this.propertyToFileStem(pageProperty);
    const varName      = this.getLocatorsVarName(pageProperty);
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
      ? `derive selectors from the actual ARIA snapshot when available.`
      : `use \`[data-testid="<kebab-case-id>"]\` as the primary selector.`}

2. METADATA — include role, name, label, placeholder, text, description.

3. KEYS — camelCase (e.g. createNewInstrumentButton, instrumentNameInput).

4. COVERAGE — create a key for every interactive element in the test steps.

5. EXPORT NAME — must be exactly \`${varName}\`.

6. FILE PATH — src/locators/${stem}-locators.ts

${'═'.repeat(64)}
EXACT FILE STRUCTURE
${'═'.repeat(64)}
\`\`\`typescript
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const ${varName} = {

    pageContainer: {
        selector: '[data-testid="${stem}"]',
        metadata: { description: '${moduleName} page root container' },
    },

} satisfies Record<string, LocatorDefinition>;
\`\`\`

Return ONLY the TypeScript code block.`;
  }

  buildPagePrompt(testCase: TestCase, locatorEntries: LocatorEntry[], ariaSnapshot?: string | null): string {
    const steps        = this.parseTestSteps(testCase.steps);
    const moduleName   = testCase.module || 'General';
    const pageProperty = this.getPagePropertyName(moduleName);
    const stem         = this.propertyToFileStem(pageProperty);
    const className    = this.getClassName(pageProperty);
    const varName      = this.getLocatorsVarName(pageProperty);
    const moduleUrl    = this.getModuleUrl(moduleName);

    const locatorsBlock = locatorEntries.length > 0
      ? locatorEntries.map((l) => `    readonly ${l.key}: SelfHealingLocator; // ${l.description}`).join('\n')
      : '    // (derive locator field names from the test steps)';

    const wiringBlock = locatorEntries.length > 0
      ? locatorEntries.map((l) => `        this.${l.key} = SelfHealingLocator.from(page, ${varName}.${l.key}, logger, aiProvider);`).join('\n')
      : '        // Wire locators: this.<key> = SelfHealingLocator.from(page, <varName>.<key>, logger, aiProvider);';

    return `Generate a TypeScript self-healing page class for the ${moduleName} module.

${'═'.repeat(64)}
TEST CASE
${'═'.repeat(64)}
- ID: ${testCase.id} | Title: ${testCase.title} | Module: ${moduleName}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}

${'═'.repeat(64)}
LOCATORS AVAILABLE
${'═'.repeat(64)}
${locatorEntries.length > 0
  ? locatorEntries.map((l) => `- this.${l.key}  — ${l.description}`).join('\n')
  : '(derive from test steps)'}
${ariaSnapshot ? `\n${'═'.repeat(64)}\nLIVE PAGE STRUCTURE\n${'═'.repeat(64)}\n${ariaSnapshot}\n` : ''}
${'═'.repeat(64)}
PAGE CLASS RULES
${'═'.repeat(64)}
1. ONE METHOD PER STEP GROUP
2. JSDoc on every method
3. SELF-HEALING LOCATORS — always call \`await this.<locator>.get()\`
4. NAVIGATION — use \`this.actions.goto('${moduleUrl}', '...')\`
5. FILE PATH — src/pages/${stem}-self-healing.ts

\`\`\`typescript
import { type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { ${varName} } from '../locators/${stem}-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

export class ${className} extends SelfHealingPageBase {

${locatorsBlock}

    private readonly page: Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);
        const logger = Logger.getLogger(\`${className}-\${testName}\`);

${wiringBlock}
    }

    async navigateTo(): Promise<void> {
        await this.actions.goto('${moduleUrl}', 'Navigate to ${moduleName} page');
    }
}
\`\`\`

Return ONLY the TypeScript code block.`;
  }

  buildAdditionalLocatorsPrompt(testCase: TestCase, existingEntries: LocatorEntry[], ariaSnapshot?: string | null): string {
    const steps      = this.parseTestSteps(testCase.steps);
    const moduleName = testCase.module || 'General';
    const moduleUrl  = this.getModuleUrl(moduleName);
    const existingList = existingEntries.map((e) => `- ${e.key}: ${e.description}`).join('\n');

    const snapshotSection = ariaSnapshot
      ? `\n${'═'.repeat(64)}\nLIVE PAGE STRUCTURE (ARIA snapshot from ${moduleUrl})\n${'═'.repeat(64)}\n${ariaSnapshot}\n`
      : '';

    return `The ${moduleName} page locators file already contains these entries:

${existingList || '(none yet)'}

Based on the test steps below, determine if any additional UI element locators are needed.

${'═'.repeat(64)}
TEST CASE: TC-${testCase.id} — ${testCase.title}
${'═'.repeat(64)}
${steps}
${snapshotSection}
${'═'.repeat(64)}
OUTPUT RULES
${'═'.repeat(64)}
• If new locators ARE needed, output ONLY the new entries (no import, no export, no code fences):

    newLocatorKey: {
        selector: '[data-testid="new-locator"]',
        metadata: {
            role:        'button',
            name:        'Button Label',
            description: 'Plain-English description for AI healing',
        },
    },

• If NO new locators are needed, output ONLY: NO_ADDITIONS`;
  }

  buildAdditionalMethodsPrompt(testCase: TestCase, existingMethods: string[], locatorEntries: LocatorEntry[], ariaSnapshot?: string | null): string {
    const steps      = this.parseTestSteps(testCase.steps);
    const moduleName = testCase.module || 'General';
    const moduleUrl  = this.getModuleUrl(moduleName);

    const locatorsBlock = locatorEntries.length > 0
      ? locatorEntries.map((l) => `- this.${l.key}  — ${l.description}`).join('\n')
      : '(see locators file)';

    const snapshotSection = ariaSnapshot
      ? `\n${'═'.repeat(64)}\nLIVE PAGE STRUCTURE\n${'═'.repeat(64)}\n${ariaSnapshot}\n`
      : '';

    return `The ${moduleName} page class already has these async methods:
${existingMethods.join(', ')}

Based on the test steps below, determine if any additional async page methods are needed.

${'═'.repeat(64)}
TEST CASE: TC-${testCase.id} — ${testCase.title}
${'═'.repeat(64)}
${steps}

AVAILABLE LOCATORS:
${locatorsBlock}
${snapshotSection}
Helper APIs:
  this.actions.goto('${moduleUrl}', 'description')
  this.actions.click(locator, 'description')
  this.actions.fill(locator, value, 'description')
  this.assert.toBeVisible(locator, 'description')
  this.assert.toHaveText(locator, expected, 'description')

${'═'.repeat(64)}
OUTPUT RULES
${'═'.repeat(64)}
• If new methods ARE needed, output ONLY the method bodies (no class, no imports, no code fences):

    /** JSDoc description */
    async newMethod(): Promise<void> {
        await this.actions.click(await this.someLocator.get(), 'Click something');
    }

• If NO new methods are needed, output ONLY: NO_ADDITIONS`;
  }

  buildTestPrompt(testCase: TestCase, overrideLocators?: LocatorEntry[], overrideMethods?: string[], ariaSnapshot?: string | null): string {
    const steps        = this.parseTestSteps(testCase.steps);
    const moduleName   = testCase.module || 'General';
    const pageProperty = this.getPagePropertyName(moduleName);
    const moduleTag    = moduleName.toLowerCase().replace(/[\s-]+/g, '-');
    const outputPath   = this.getOutputPath(testCase);
    const generatedAt  = new Date().toISOString();

    const locators = overrideLocators ?? this.loadLocators(pageProperty);
    const methods  = overrideMethods  ?? this.loadPageMethods(pageProperty);
    const pomProps = this.loadPomProperties();

    const locatorsSection = locators.length > 0
      ? `**Layer 1 — UI elements on \`${pageProperty}\` (REFERENCE ONLY — never call .get() in tests):**
${locators.map((l) => `- \`${l.key}\` — ${l.description}`).join('\n')}`
      : `**Layer 1 — Locators:** No locators file found for this page yet.`;

    const methodsSection = methods.length > 0
      ? `**Layer 2 — Existing page methods (PREFER THESE):**
${methods.map((m) => `- \`pomSelfHealing.${pageProperty}.${m}()\``).join('\n')}`
      : `**Layer 2 — Page methods:** No methods exist yet. Invent descriptive names.`;

    const pomSection = pomProps.length > 0
      ? `**Layer 3 — POM pages available:**
${pomProps.map((p) => `- pomSelfHealing.${p}`).join('\n')}`
      : '';

    return `Generate a complete Playwright TypeScript test for the Azure Test Plan test case below.

${'═'.repeat(64)}
TEST CASE
${'═'.repeat(64)}
- ID: ${testCase.id} | Title: ${testCase.title} | Module: ${moduleName}
- Priority: ${testCase.priority || 'N/A'} | Tags: ${testCase.tags || 'none'}

${'═'.repeat(64)}
TEST STEPS
${'═'.repeat(64)}
${steps}

${'═'.repeat(64)}
PROJECT LAYERS
${'═'.repeat(64)}
${locatorsSection}

${methodsSection}

${pomSection}
${ariaSnapshot ? `\n${'═'.repeat(64)}\nLIVE PAGE STRUCTURE\n${'═'.repeat(64)}\n${ariaSnapshot}\n` : ''}
${'═'.repeat(64)}
FRAMEWORK RULES — NEVER VIOLATE
${'═'.repeat(64)}
1. IMPORT: import { test, expect } from '../../fixtures/self-healing-fixture';
2. FIXTURE: async ({ selfHealingFixture: { pomSelfHealing } }) => { ... }
3. NO test.step() IN TEST BODY
4. NO DIRECT LOCATORS — never use page.locator(), page.getByRole(), etc.
5. NO DIRECT ASSERTIONS — never use expect(locator).*
6. AUTHENTICATION — user is already authenticated via storageState
7. STEP COMMENTS — add "// Step N: <description>" above each method call
8. NO DIRECT LOCATOR FIELD ACCESS — never call .get() in the test body

${'═'.repeat(64)}
REQUIRED OUTPUT FORMAT
${'═'.repeat(64)}
File path: ${outputPath}

\`\`\`typescript
/**
 * Auto-generated Playwright TypeScript test from Azure Test Plan
 *
 * @testcase TC-${testCase.id}
 * @title    ${testCase.title}
 * @module   ${moduleName}
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

  async _aiCall(prompt: string): Promise<AIResponse> {
    switch (this.provider) {
      case 'openai':    return this._aiCallOpenAI(prompt, PlaywrightGenerator.SYSTEM_PROMPT);
      case 'anthropic': return this._aiCallAnthropic(prompt, PlaywrightGenerator.SYSTEM_PROMPT);
      case 'gemini':    return this._aiCallGemini(prompt, PlaywrightGenerator.SYSTEM_PROMPT);
      default:
        throw new Error(`Unknown provider "${this.provider}"`);
    }
  }

  async _aiCallOpenAI(prompt: string, system: string): Promise<AIResponse> {
    const client = this.client as {
      chat: { completions: { create: (args: unknown) => Promise<AIResponse> } };
    };
    return client.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: prompt },
      ],
      temperature: 0.2,
      max_tokens:  4096,
    });
  }

  async _aiCallAnthropic(prompt: string, system: string): Promise<AIResponse> {
    const client = this.client as {
      messages: { create: (args: unknown) => Promise<{ content: Array<{ type: string; text?: string }> }> };
    };
    const response = await client.messages.create({
      model:      this.model,
      max_tokens: 4096,
      system,
      messages:   [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });
    const text = response.content.find((b) => b.type === 'text')?.text ?? '';
    return { choices: [{ message: { content: text } }] };
  }

  async _aiCallGemini(prompt: string, system: string): Promise<AIResponse> {
    const client = this.client as {
      getGenerativeModel: (args: { model: string; systemInstruction: string }) => {
        generateContent: (args: { contents: unknown[]; generationConfig: unknown }) => Promise<{ response: { text: () => string } }>;
      };
    };
    const genModel = client.getGenerativeModel({ model: this.model, systemInstruction: system });
    const result = await genModel.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
    });
    const text = result.response.text();
    return { choices: [{ message: { content: text } }] };
  }

  parseTestSteps(stepsXml?: string): string {
    if (!stepsXml) return 'No steps provided';
    try {
      const stepMatches = stepsXml.match(/<step[^>]*>[\s\S]*?<\/step>/g);
      if (!stepMatches) return stepsXml;

      const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

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

  _postValidateTestSpec(code: string, pageProperty: string, pageMethods: string[]): string {
    let sanitized = code;

    sanitized = sanitized.replace(
      /('(?:[^'\\]|\\.)*?)(')(\w)/g,
      (_: string, before: string, _quote: string, after: string) => before + "\\'" + after,
    );

    sanitized = sanitized.replace(/(\w)'(t|s|re|ve|ll|d|m)\b/g, (match: string, pre: string, suf: string) => {
      return `${pre}\\'${suf}`;
    });

    const methodsSet = new Set(pageMethods);
    const callPattern = new RegExp(`pomSelfHealing\\.${pageProperty}\\.(\\w+)\\s*\\(`, 'g');
    const calledMethods = [...sanitized.matchAll(callPattern)].map((m) => m[1]);
    const phantoms = [...new Set(calledMethods)].filter((m) => !methodsSet.has(m));

    if (phantoms.length > 0) {
      tcGenerateLogger.warn(
        `Test spec calls ${phantoms.length} method(s) not found in ${pageProperty}: ${phantoms.join(', ')}`,
      );
    }

    return sanitized;
  }

  extractCode(response: string): string {
    const match = response.match(/```(?:typescript|ts)?\n([\s\S]*?)```/);
    let code = match ? match[1].trim() : response.trim();
    if (!match) {
      tcGenerateLogger.warn('No TypeScript code block in AI response — using full response');
    }
    code = code.replace(/^\/\*\*[\s\S]*?\*\/\s*\n?/, '');
    return code;
  }

  delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default PlaywrightGenerator;
