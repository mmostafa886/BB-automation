import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for LoginPageSelfHealing.
 *
 * Contains only pure data (selector strings + semantic metadata).
 * No Playwright Page dependency — safe to import anywhere without side effects.
 *
 * The `LoginPageSelfHealing` constructor reads from this object and creates
 * `SelfHealingLocator` instances via `SelfHealingLocator.from()`.
 * Update selectors or metadata here without touching page-object behaviour.
 */
export const loginLocators = {

    usernameInput: {
        selector: 'input[name="usernametvycv"]', // Intentionally broken to demonstrate self-healing
        metadata: {
            role:        'textbox',
            label:       'Username65',
            placeholder: 'Username465',
            description: 'Username text input on the OrangeHRM login form',
        },
    },

    passwordInput: {
        selector: 'input[name="password"]',
        metadata: {
            role:        'textbox',
            label:       'Password',
            placeholder: 'Password',
            description: 'Password text input on the OrangeHRM login form',
        },
    },

    loginButton: {
        selector: 'button[type="submit"]',
        metadata: {
            role:        'button',
            name:        'Login',
            text:        'Login',
            description: 'Login submit button on the OrangeHRM login form',
        },
    },

    errorMessage: {
        selector: '.oxd-alert-content-text',
        metadata: {
            role:        'alert',
            description: 'Error alert message shown when login credentials are invalid',
        },
    },

    dashboardHeader: {
        selector: 'h6.oxd-topbar-header-breadcrumb-module',
        metadata: {
            role:        'heading',
            name:        'Dashboard',
            text:        'Dashboard',
            description: 'Dashboard heading in the OrangeHRM top navigation bar',
        },
    },

    invalidLoginMessage: {
        selector: "//p[@class='oxd-text oxd-text--p oxd-alert-content-text']",
        metadata: {
            text:        'Invalid credentials',
            description: 'Invalid credentials error paragraph on the OrangeHRM login form',
        },
    },

} satisfies Record<string, LocatorDefinition>;
