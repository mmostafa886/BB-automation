import { type Page } from '@playwright/test';
import { LoginPageSelfHealing } from './login-page-self-healing';
import { HomePageSelfHealing } from './home-page-self-healing';
import { FinancialDashboardSelfHealing } from './financial-dashboard-page-self-healing';
import { RevenuesPageSelfHealing } from './revenues-page-self-healing';
import { SignUpPageSelfHealing } from './signup-page-self-healing';
import { type AIHealingProvider } from '../utils/self-healing-locator';

/**
 * POMLazySelfHealing — Page Object Manager with Lazy Initialization.
 *
 * Wires all self-healing page objects with an optional AI healing provider.
 * Page objects are created on **first access** (lazy) — pages never accessed
 * during a test incur zero construction overhead.
 *
 * The AI provider is resolved automatically by `self-healing-fixture.ts` from
 * env vars — use that fixture in tests rather than constructing this directly.
 *
 * ## Usage in tests
 * ```typescript
 * import { test, expect } from '../../fixtures/self-healing-fixture';
 *
 * test('login flow', async ({ selfHealingFixture: { pomSelfHealing } }) => {
 *     await pomSelfHealing.loginPage.navigateToLogin();
 *     await pomSelfHealing.loginPage.login('admin', 'admin123');
 * });
 * ```
 */
export class POMLazySelfHealing {
    private readonly page: Page;
    private readonly _testName?: string;
    private readonly _aiProvider?: AIHealingProvider;

    private _loginPage?: LoginPageSelfHealing;
    private _homePage?:  HomePageSelfHealing;
    private _financialDashboard?: FinancialDashboardSelfHealing;
    private _revenuesPage?: RevenuesPageSelfHealing;
    private _signUpPage?: SignUpPageSelfHealing;

    constructor(page: Page, testName?: string, aiProvider?: AIHealingProvider) {
        this.page = page;
        this._testName = testName;
        this._aiProvider = aiProvider;
    }

    // ===================== Lazy Getters =====================

    /** Returns the LoginPageSelfHealing instance, creating it on first access */
    get loginPage(): LoginPageSelfHealing {
        if (!this._loginPage) {
            this._loginPage = new LoginPageSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._loginPage;
    }

    /** Returns the HomePageSelfHealing instance, creating it on first access */
    get homePage(): HomePageSelfHealing {
        if (!this._homePage) {
            this._homePage = new HomePageSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._homePage;
    }

    /** Returns the FinancialDashboardSelfHealing instance, creating it on first access */
    get financialDashboard(): FinancialDashboardSelfHealing {
        if (!this._financialDashboard) {
            this._financialDashboard = new FinancialDashboardSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._financialDashboard;
    }

    /** Returns the RevenuesPageSelfHealing instance, creating it on first access */
    get revenuesPage(): RevenuesPageSelfHealing {
        if (!this._revenuesPage) {
            this._revenuesPage = new RevenuesPageSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._revenuesPage;
    }

    /** Returns the SignUpPageSelfHealing instance, creating it on first access */
    get signUpPage(): SignUpPageSelfHealing {
        if (!this._signUpPage) {
            this._signUpPage = new SignUpPageSelfHealing(
                this.page,
                this._testName ?? '',
                this._aiProvider,
            );
        }
        return this._signUpPage;
    }

    // ===================== Healing Report =====================

    /**
     * Returns a combined healing report for every page object that was accessed
     * during the test. Pages that were never initialised are silently skipped.
     */
    getHealingReport(): string {
        const pages = [
            this._loginPage,
            this._homePage,
            this._financialDashboard,
            this._revenuesPage,
            this._signUpPage,
        ];

        const sections = pages
            .filter((p): p is NonNullable<typeof p> => p !== undefined)
            .map(p => p.getHealingReport())
            .filter(r => r.length > 0);

        return sections.length > 0
            ? sections.join('\n')
            : '(no locators were exercised during this test)';
    }
}
