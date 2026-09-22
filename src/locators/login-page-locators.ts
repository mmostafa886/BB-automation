import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for LoginPageSelfHealing — BznsBuilder auth page.
 *
 * The auth flow has two distinct phases:
 *   1. Main auth page (/auth) — shows Sign in / Sign Up triggers
 *   2. Sign-in modal (dialog) — opened by the trigger, contains the email/password form
 *
 * All selectors are verified against https://uat-app.bznsbuilder.com/auth.
 * Phase-2 semantic metadata provides automatic fallback if the primary CSS drifts.
 */
export const loginLocators = {

    signInTriggerButton: {
        // Main-page "Sign in" button (no type attr, empty class) — opens the modal
        selector: 'button[data-automation-test="auto-button-loginOpen"]',
        metadata: {
            role:        'button',
            name:        'Sign in',
            text:        'Sign in',
            description: 'Sign in trigger button on the BznsBuilder auth page that opens the sign-in modal',
        },
    },

    emailInput: {
        selector: 'input[placeholder="Email"]',
        metadata: {
            role:        'textbox',
            placeholder: 'Email',
            description: 'Email text input inside the BznsBuilder sign-in modal',
        },
    },

    passwordInput: {
        selector: 'input[type="password"]',
        metadata: {
            role:        'textbox',
            label:       'Password',
            placeholder: 'Password',
            description: 'Password input inside the BznsBuilder sign-in modal',
        },
    },

    signInSubmitButton: {
        // Submit button inside the modal — type="submit", class="btn btn-block btn-primary"
        selector: 'button[type="submit"].btn-primary',
        metadata: {
            role:        'button',
            name:        'Sign in',
            text:        'Sign in',
            description: 'Sign in submit button inside the BznsBuilder sign-in modal',
        },
    },

    signInModal: {
        // Angular Material renders the modal as <mat-dialog-container role="dialog">
        selector: 'mat-dialog-container',
        metadata: {
            role:        'dialog',
            description: 'Sign-in modal dialog opened after clicking the Sign in trigger button',
        },
    },

    forgotPasswordLink: {
        selector: 'a[data-automation-test="auto-link-forgetPassword"]',
        metadata: {
            role:        'link',
            text:        'Forgot password?',
            description: '"Forgot password?" link inside the BznsBuilder sign-in modal',
        },
    },

    errorToast: {
        // Angular Material snackbar shown on sign-in failure
        selector: 'snack-bar-container.custom-snackbar-panel',
        metadata: {
            role:        'alert',
            description: 'Material snackbar notification shown when sign-in fails',
        },
    },

    invalidFormatMsg: {
        // Inline validation message shown under the email field on bad email format
        selector: 'span[class="error ng-star-inserted"]',
        metadata: {
            role:        'alert',
            text:        'Invalid email format',
            description: 'Inline "Invalid email format" validation message shown under the email input in the sign-in modal',
        },
    },

    unverifiedEmailToast: {
        // Same generic info-snackbar component as signupLocators.successMsg, reused here with
        // different text — shown when signing in with an unverified email
        selector: 'div[class="info snackbar-container"]',
        metadata: {
            role:        'alert',
            text:        'Please, verify your email!',
            description: 'Info snackbar shown when signing in with an unverified email address',
        },
    },

} satisfies Record<string, LocatorDefinition>;
