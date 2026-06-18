import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for LoginPageSelfHealing — BznsBuilder auth page.
 *
 * The auth flow has two distinct phases:
 *   1. Main auth page (/auth) — shows Sign in / Sign Up triggers
 *   2. Sign-in modal (dialog) — opened by the trigger, contains the email/password form
 *
 * All selectors are verified against https://stgapp.bznsbuilder.com/auth.
 * Phase-2 semantic metadata provides automatic fallback if the primary CSS drifts.
 */
export const loginLocators = {

    signInTriggerButton: {
        // Main-page "Sign in" button (no type attr, empty class) — opens the modal
        selector: 'button:not([type="submit"]):not(.mb-5)',
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

    errorToast: {
        // Angular Material snackbar shown on sign-in failure
        selector: 'snack-bar-container.custom-snackbar-panel',
        metadata: {
            role:        'alert',
            description: 'Material snackbar notification shown when sign-in fails',
        },
    },

} satisfies Record<string, LocatorDefinition>;
