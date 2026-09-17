import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for ForgotPasswordPageSelfHealing — the "Password Reset" form shown in
 * the auth modal after clicking "Forgot password?" in the sign-in modal.
 *
 * Verified against https://uat-app.bznsbuilder.com/auth.
 */
export const forgotPasswordLocators = {

    emailInput: {
        // Same automation attribute as the sign-in email field, which it replaces in the modal —
        // :visible keeps it from matching a hidden copy left in the DOM.
        selector: 'input[data-automation-test="auto-input-email"]:visible',
        metadata: {
            role: 'textbox',
            placeholder: 'Enter your email',
            description: 'email input on the forgot-password form',
        },
    },

    resetButton: {
        // The app reuses the sign-up form's "auto-button-register" attribute for this button.
        selector: 'button[data-automation-test="auto-button-register"]:visible',
        metadata: {
            role: 'button',
            name: 'Password Reset',
            text: 'Password Reset',
            description: 'Password Reset submit button on the forgot-password form',
        },
    },

    confirmationMessage: {
        // Generic info snackbar — the same component the sign-up success message uses.
        selector: 'div[class="info snackbar-container"]',
        metadata: {
            role: 'alert',
            description: 'snackbar confirming that password-reset instructions were emailed',
        },
    },

} satisfies Record<string, LocatorDefinition>;
