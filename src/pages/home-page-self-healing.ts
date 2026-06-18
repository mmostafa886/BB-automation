import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { homeLocators } from '../locators/home-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * HomePageSelfHealing — Page Object for the BznsBuilder home dashboard (URL: /).
 *
 * This is the landing page immediately after a successful login.
 * Responsibilities:
 *   - Assert the home dashboard loaded correctly (Welcome! heading visible)
 *   - Assert the user avatar icon in the top nav is visible (opens Logout menu)
 */
export class HomePageSelfHealing extends SelfHealingPageBase {
    readonly welcomeHeading: SelfHealingLocator;
    readonly userAvatarIcon: SelfHealingLocator;

    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`HomePageSelfHealing-${testName}`);

        this.welcomeHeading = SelfHealingLocator.from(page, homeLocators.welcomeHeading, logger, aiProvider);
        this.userAvatarIcon = SelfHealingLocator.from(page, homeLocators.userAvatarIcon, logger, aiProvider);
    }

    // ── Assertion Methods ────────────────────────────────────────────────────

    /**
     * Assert the home dashboard has fully loaded after login:
     *   - "Welcome!" heading is visible
     *   - User avatar icon (top nav, opens Logout menu) is visible
     */
    async assertPageLoaded(): Promise<void> {
        await test.step('Assert home page loaded', async () => {
            await this.assert.toBeVisible(await this.welcomeHeading.get(), '"Welcome!" heading is visible on the home dashboard');
            await this.assert.toBeVisible(await this.userAvatarIcon.get(), 'User avatar icon is visible in the top navigation bar');
        });
    }
}
