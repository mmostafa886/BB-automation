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
        selector: 'h2 > p',
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
//the following locators are added by engy
    companiesMenu: {
        // Companies list in the top of the side menu; 
        selector: 'app-bzns-company-select',
        metadata: {
            description: 'Companies list in the top of the side menu shows all the companies that are in the account',
        },
    },

    forecastsMenu: {
        // forecasts list in the top of the side menu below the companies menu; 
        selector: 'app-bzns-finance-select',
        metadata: {
            description: 'forecasts list in the top of the side menu below the companies menu shows all the forecasts that are in the company',
        },
    },

    forecastTab: {
        // forecasts tab in the side menu; 
        selector: '[routerlink="/financial/overview"]',
        metadata: {
            description: 'forecasts tab in the side menu thaat is navigating to the financial overview page',
        },
    },
    
    closeInstructionsModal: {
        // appear when opening an empty financial chapter,it is used to close the instructions modal 
        selector: '[data-automation-test="auto-button-closeModal"]',
        metadata: {
            description: 'appear when opening an empty financial chapter,it is used to close the instructions modal',
        },
    },

} satisfies Record<string, LocatorDefinition>;
