import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for HomePageSelfHealing — BznsBuilder home dashboard.
 *
 * This page is reached immediately after a successful login (URL: /).
 * All selectors are verified against https://stgapp.bznsbuilder.com/.
 */
export const homeLocators = {

    welcomeHeading: {
        // Single h2 on the home dashboard — always present after login
        selector: 'h2',
        metadata: {
            role:        'heading',
            name:        'Welcome!',
            text:        'Welcome!',
            description: 'Welcome! heading on the BznsBuilder home dashboard shown after successful login',
        },
    },

    userAvatarIcon: {
        // User avatar link in the top-nav list; clicking opens the menu (Settings / Help / Logout)
        selector: 'li.user-menu a.ng-dropdown-control',
        metadata: {
            description: 'User avatar icon in the top navigation bar that opens the user menu dropdown with Logout option',
        },
    },

} satisfies Record<string, LocatorDefinition>;
