import { SelfHealingLocator } from '../utils/self-healing-locator';

/**
 * SelfHealingPageBase — Abstract base class for all self-healing page objects.
 *
 * Provides two auto-implemented behaviours so subclasses need zero boilerplate:
 *
 * ### pageName (auto)
 * Derived from the class name by stripping the `SelfHealing` suffix.
 * `LoginPageSelfHealing` → `"LoginPage"`, `HomePageSelfHealing` → `"HomePage"`.
 * Override the getter if you need a different label.
 *
 * ### allLocators (auto-discovery)
 * Uses `Object.entries(this)` to find every `SelfHealingLocator` instance on
 * the page object at runtime — no manual list to maintain and no risk of
 * forgetting a newly added locator.
 * Override only if you need a specific ordering for the report.
 *
 * ### getHealingReport (inherited, final)
 * Filters out locators that were never called (`pending` resolution) and
 * returns a formatted multi-line string, or an empty string when nothing
 * was exercised (the POM manager silently drops empty sections).
 *
 * ## Minimal subclass
 * ```typescript
 * export class MyPageSelfHealing extends SelfHealingPageBase {
 *     readonly myInput  = new SelfHealingLocator(page, 'input#q', { … }, logger);
 *     readonly myButton = new SelfHealingLocator(page, 'button',  { … }, logger);
 *     // getHealingReport() works automatically — nothing else needed
 * }
 * ```
 */
export abstract class SelfHealingPageBase {
    /**
     * Display name used as the section header in the healing report.
     * Defaults to the class name with the `SelfHealing` suffix removed.
     * Override to customise: `protected get pageName() { return 'My Label'; }`
     */
    protected get pageName(): string {
        return this.constructor.name.replace(/SelfHealing$/, '');
    }

    /**
     * Returns every `SelfHealingLocator` on this page as `[propertyName, locator]`
     * pairs, discovered automatically via `Object.entries(this)`.
     *
     * Override only when you need a fixed ordering in the report.
     */
    protected allLocators(): Array<[string, SelfHealingLocator]> {
        return (Object.entries(this) as Array<[string, unknown]>)
            .filter((entry): entry is [string, SelfHealingLocator] => entry[1] instanceof SelfHealingLocator);
    }

    /**
     * Returns a multi-line healing report for all locators that were exercised
     * during the test. Locators with `pending` resolution (never called) are
     * silently omitted.
     *
     * Returns an empty string when no locators were used — callers should
     * filter empty strings before joining report sections.
     */
    getHealingReport(): string {
        const used = this.allLocators().filter(([, loc]) => loc.wasUsed());
        if (used.length === 0) return '';
        const lines = [`${this.pageName}:`];
        for (const [name, locator] of used) {
            lines.push(`  ${name.padEnd(22)}: ${locator.getHealingReport()}`);
        }
        return lines.join('\n');
    }
    
}
