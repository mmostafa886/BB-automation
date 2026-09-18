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
    readonly companiesMenu: SelfHealingLocator;
    readonly forecastsMenu: SelfHealingLocator;
    readonly forecastTab: SelfHealingLocator;
    readonly selectedCompanyName: SelfHealingLocator;
    readonly selectedForecastName: SelfHealingLocator;
    readonly page: Page;


    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`HomePageSelfHealing-${testName}`);

        this.welcomeHeading = SelfHealingLocator.from(page, homeLocators.welcomeHeading, logger, aiProvider);
        this.forecastsMenu = SelfHealingLocator.from(page, homeLocators.forecastsMenu, logger, aiProvider);
        this.companiesMenu = SelfHealingLocator.from(page, homeLocators.companiesMenu, logger, aiProvider);
        this.forecastTab = SelfHealingLocator.from(page, homeLocators.forecastTab, logger, aiProvider);
        this.userAvatarIcon = SelfHealingLocator.from(page, homeLocators.userAvatarIcon, logger, aiProvider);
        this.selectedCompanyName = SelfHealingLocator.from(page, homeLocators.selectedCompanyName, logger, aiProvider);
        this.selectedForecastName = SelfHealingLocator.from(page, homeLocators.selectedForecastName, logger, aiProvider);
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
    /**
     * Wait for the home dashboard to finish loading after sign-in, then assert it.
     *
     * Same two checks as {@link assertPageLoaded}, but the "Welcome!" heading is *waited* for
     * with an explicit budget instead of asserted against Playwright's default 5 s expect
     * timeout. Sign-in on staging regularly takes longer than 5 s (the modal's fields sit
     * disabled while the request is in flight), which makes `assertPageLoaded()` flaky when
     * called immediately after submitting the form.
     *
     * The 60 s default mirrors the legacy TestCafe specs, which all allowed
     * `.expect(dashboard.financialPlan.visible).ok({timeout:60000})` at this point.
     */
    async waitForDashboardLoaded(timeout: number = 60000): Promise<void> {
        await test.step('Wait for the home dashboard to load after sign-in', async () => {
            await this.actions.waitForVisible(
                await this.welcomeHeading.get(),
                'Wait for the "Welcome!" heading on the home dashboard',
                timeout,
            );
            await this.assert.toBeVisible(
                await this.userAvatarIcon.get(),
                'User avatar icon is visible in the top navigation bar',
            );
        });
    }

    async openCompaniesMenu(): Promise<void> {
        await test.step('open companies menu',async () =>{
            await this.actions.click((await this.companiesMenu.get()).filter({visible:true}),'click companies menu')

        })
    }
    async openFoecastsMenu(): Promise<void> {
        await test.step('select forecasts menu',async () =>{
            await this.actions.click(await this.forecastsMenu.get(),'click forecasts menu')

        })
    }
    /**
     * Open the selected forecast's Financial Plan (the side-menu link to /financial/overview).
     * Legacy: `dashboard.financialPlan`.
     */
    async openFinancialPlan(): Promise<void> {
        await test.step('open financial plan', async () => {
            await this.actions.click(await this.forecastTab.get(), 'click Financial Plan / financial overview link');
        });
    }
    async selectFromMenu(value: string): Promise<void> {
            await test.step(`Select "${value}" from open menu`, async () => {
                const option = this.page
                    .locator('div:visible')
                    .filter({ hasText: this.exactText(value) })
                    .first();
                await this.actions.clickOption(option, `Select "${value}" from menu`);
            });
    }
    /** Assert the browser is on the home dashboard: URL path is exactly "/" and the dashboard has loaded. */
    async assertOnHomePage(): Promise<void> {
        await test.step('Assert the home page is shown', async () => {
            await this.assert.toHaveURL(/^https?:\/\/[^/]+\/?(\?.*)?$/, 'URL is the home page "/"');
            await this.waitForDashboardLoaded();
        });
    }

    /** Assert the side bar shows `company` as the selected company. */
    async assertSelectedCompany(company: string): Promise<void> {
        await test.step(`Assert selected company is "${company}"`, async () => {
            await this.assert.toHaveText(await this.selectedCompanyName.get(), company, `Selected company in the side bar is "${company}"`);
        });
    }

    /** Assert the side bar shows `forecast` as the selected forecast. */
    async assertSelectedForecast(forecast: string): Promise<void> {
        await test.step(`Assert selected forecast is "${forecast}"`, async () => {
            await this.assert.toHaveText(await this.selectedForecastName.get(), forecast, `Selected forecast in the side bar is "${forecast}"`);
        });
    }

    private exactText(value: string): RegExp {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^\\s*${escaped}\\s*$`);
    }
}
