import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { subscriptionsLocators } from '../locators/subscriptions-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * SubscriptionsPageSelfHealing — Page Object for Billing & Subscriptions
 * (URL: /subscription-dashboard/subscriptions).
 *
 * Used to confirm what a company is subscribed to after the create company wizard has been paid for.
 * The page lists every company on the account with its package, expiry date and auto-renew switch.
 */
export class SubscriptionsPageSelfHealing extends SelfHealingPageBase {
    readonly subscriptionsTab: SelfHealingLocator;
    /** Matches every company row — read it through `.locator`, since `get()` probes a single element. */
    readonly companySubscriptionRows: SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`SubscriptionsPageSelfHealing-${testName}`);
        const L      = subscriptionsLocators;
        const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

        this.subscriptionsTab        = make(L.subscriptionsTab);
        this.companySubscriptionRows = make(L.companySubscriptionRows);
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Actions
    // ═══════════════════════════════════════════════════════════════════════

    /** Navigate straight to Billing & Subscriptions and wait for the company list to render. */
    async navigateToSubscriptions(): Promise<void> {
        await test.step('Navigate to Billing & Subscriptions', async () => {
            await this.actions.goto('/subscription-dashboard/subscriptions', 'Navigate to the Subscriptions page');
            await this.actions.waitForVisible(this.companySubscriptionRows.locator.first(), 'Wait for the company subscription rows', 60000);
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Assertions
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Assert `company` is listed on the Subscriptions page carrying `packageName`.
     *
     * Only the company and its package are checked. The expiry date and the "Expired" badge are
     * deliberately NOT asserted: how long a subscription lasts is the app's business and varies
     * (a freshly paid plan on UAT is dated the day it was bought), so tying the check to it would
     * make it fail for reasons that have nothing to do with the company being created.
     */
    async assertCompanySubscribedTo(company: string, packageName: string): Promise<void> {
        await test.step(`Assert "${company}" is subscribed to "${packageName}"`, async () => {
            const row = this.companyRow(company);
            await this.assert.toBeVisible(row, `"${company}" is listed on the Subscriptions page`);
            await this.assert.toHaveText(
                // First h6 = the package; the second one is the "Auto Renew" label.
                row.locator(subscriptionsLocators.companySubscriptionPackage.selector).first(),
                packageName,
                `"${company}" shows the "${packageName}" package`,
            );
        });
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  Helpers
    // ═══════════════════════════════════════════════════════════════════════

    /** The subscription row whose company name is exactly `company`. */
    private companyRow(company: string) {
        const escaped = company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return this.companySubscriptionRows.locator.filter({
            has: this.page.locator('div').filter({ hasText: new RegExp(`^\\s*${escaped}\\s*$`) }),
        });
    }
}
