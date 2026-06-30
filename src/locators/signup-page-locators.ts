import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for SignUpSelfHealing — BznsBuilder sign-up / registration modal.
 *
 * Converted from the legacy TestCafe page object `SignUp` (locators.js).
 * Covers the auth landing buttons, the social-login options, the register form
 * (email / password / first & last name), and the inline validation + success messages.
 *
 * Conversion notes:
 *   - `withAttribute(attr, val)`  → `[attr="val"]` CSS attribute selector.
 *   - `withExactText(text)`       → `(page) => page.getByText(text, { exact: true })` factory.
 *   - `.nth(n)`                   → `(page) => page.locator(...).nth(n)` factory.
 *   - All selectors should be re-verified against https://stgapp.bznsbuilder.com/.
 */
export const signupLocators = {

    languageBtn: {
        // Language switcher button on the auth landing page
        selector: '.btn-language',
        metadata: {
            role: 'button',
            description: 'language switcher button on the auth landing page',
        },
    },

    socialMediaButtons: {
        // Social-login button group (Gmail / Facebook / Linkedin)
        selector: '.btn-social',
        metadata: {
            description: 'social media login button(s) on the auth modal',
        },
    },

    signUpPopUp: {
        // Opens the register (sign-up) modal
        selector: 'button[data-automation-test="auto-button-registerOpen"]',
        metadata: {
            role: 'button',
            description: 'button that opens the register/sign-up modal on the auth landing page',
        },
    },
    // ─── Social login options ────────────────────────────────────────────────
    googleButton: {
        // "Continue With Gmail" social-login option — exact text
        selector: '.button',
        metadata: {
            text: 'Continue With Gmail',
            description: 'Continue With Gmail social-login option in the auth modal',
        },
    },

    facebookButton: {
        // "Continue With Facebook" social-login option — exact text
        selector: (page) => page.getByText('Continue With Facebook', { exact: true }),
        metadata: {
            text: 'Continue With Facebook',
            description: 'Continue With Facebook social-login option in the auth modal',
        },
    },

    linkedinButton: {
        // "Continue With Linkedin" social-login option — exact text
        selector: (page) => page.getByText('Continue With Linkedin', { exact: true }),
        metadata: {
            text: 'Continue With Linkedin',
            description: 'Continue With Linkedin social-login option in the auth modal',
        },
    },

    // ─── Modal controls ──────────────────────────────────────────────────────
    // NOTE: the legacy `closeBtn` (`.model-close > fa-icon > svg`) was commented out in the
    // source and is intentionally omitted. `closeBtn2` below is the active close control.
    closeBtn: {
        // Closes the auth (sign-up / sign-in) modal
        selector: 'span[data-automation-test="auto-button-authModalClose"]',
        metadata: {
            description: 'close button (X) of the auth sign-up/sign-in modal',
        },
    },

    // ─── Register form fields ────────────────────────────────────────────────
    email: {
        // Email input on the register form
        selector: 'input[data-automation-test="auto-input-email"]',
        metadata: {
            role: 'textbox',
            description: 'email input on the register/sign-up form',
        },
    },

    password: {
        // Password input on the register form
        selector: 'input[data-automation-test="auto-input-password"]',
        metadata: {
            description: 'password input on the register/sign-up form',
        },
    },

    signUpBtn: {
        // Submits the register form
        selector: 'button[data-automation-test="auto-button-register"]',
        metadata: {
            role: 'button',
            description: 'register/sign-up submit button',
        },
    },

    firstName: {
        // First-name input — first `auto-input-name` instance on the form
        selector: (page) => page.locator('input[data-automation-test="auto-input-name"]').nth(0),
        metadata: {
            description: 'first-name input (first auto-input-name instance) on the register/sign-up form',
        },
    },

    lastName: {
        // Last-name input — second `auto-input-name` instance on the form
        selector: (page) => page.locator('input[data-automation-test="auto-input-name"]').nth(1),
        metadata: {
            description: 'last-name input (second auto-input-name instance) on the register/sign-up form',
        },
    },

    // ─── Validation / success messages ───────────────────────────────────────
    requiredMsg: {
        // "This field is required" inline validation — exact text
        selector: (page) => page.getByText('This field is required', { exact: true }),
        metadata: {
            text: 'This field is required',
            description: 'required-field inline validation message on the register/sign-up form',
        },
    },

    invalidMailFormatMsg: {
        // "Invalid email format" inline validation — exact text
        selector: (page) => page.getByText('Invalid email format', { exact: true }),
        metadata: {
            text: 'Invalid email format',
            description: 'invalid email format validation message on the register/sign-up form',
        },
    },

    existedEmailMsg: {
        // "The email has already been taken" inline validation — exact text
        selector: (page) => page.getByText('The email has already been taken', { exact: true }),
        metadata: {
            text: 'The email has already been taken',
            description: 'duplicate-email validation message on the register/sign-up form',
        },
    },

    invalidPasswordFormatMsg: {
        // "Minimum length is 8" password validation — exact text
        selector: (page) => page.getByText('Minimum length is 8', { exact: true }),
        metadata: {
            text: 'Minimum length is 8',
            description: 'minimum-password-length validation message on the register/sign-up form',
        },
    },

    successMsg: {
        // "Please check your email to verify your account" success message — exact text
        selector: (page) => page.getByText('Please check your email to verify your account', { exact: true }),
        metadata: {
            text: 'Please check your email to verify your account.',
            description: 'success message shown after a successful registration',
        },
    },
   /* successMsg: {
        // "Welcome BznsBuilder User" success message — exact text
        selector: (page) => page.getByText('Welcome BznsBuilder User', { exact: true }),
        metadata: {
            text: 'Welcome BznsBuilder User',
            description: 'success message shown after a successful registration',
        },
    },*/

} satisfies Record<string, LocatorDefinition>;
