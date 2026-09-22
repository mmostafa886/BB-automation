import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for SubscriptionsPageSelfHealing — the Billing & Subscriptions page.
 *
 * URL: /subscription-dashboard/subscriptions (side bar: "Billing & Subscriptions").
 * Lists every company on the account with the package it is subscribed to.
 *
 * All selectors verified live against https://uat-app.bznsbuilder.com/.
 */
export const subscriptionsLocators = {

    subscriptionsTab: {
        selector: '[data-automation-test="auto-navbar-link-Subscriptions"]',
        metadata: {
            text:        'Subscriptions',
            description: 'Subscriptions tab in the Billing & Subscriptions navbar',
        },
    },

    companySubscriptionRows: {
        // The whole list lives in ONE app-company-subscription component; each company is the header
        // of a Material expansion panel reading "<company> <package> Expires on <date> [Expired] Auto Renew".
        selector: 'app-company-subscription mat-expansion-panel-header',
        metadata: {
            description: 'One row per company on the Subscriptions page, showing its package and expiry',
        },
    },

    companySubscriptionPackage: {
        // Package name inside a company row, e.g. "Launch". The row holds TWO h6 elements — the
        // package first, then the "Auto Renew" switch label — so callers take the first one.
        selector: 'h6',
        metadata: {
            description: 'Package name shown in a company subscription row (the first h6 of the row)',
        },
    },

    companySubscriptionExpiredBadge: {
        // Only rendered for a lapsed subscription.
        selector: '.info-badge',
        metadata: {
            text:        'Expired',
            description: 'Expired badge shown in a company subscription row whose package has lapsed',
        },
    },

} satisfies Record<string, LocatorDefinition>;
