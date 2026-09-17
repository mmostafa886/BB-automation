import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for ResetPasswordPageSelfHealing — the page opened by the link in the
 * "Reset your BznsBuilder password" email (/auth/reset-password?token=…).
 *
 * Verified against https://uat-app.bznsbuilder.com/auth/reset-password.
 */
export const resetPasswordLocators = {

    newPasswordInput: {
        selector: 'input[data-automation-test="auto-input-NewPassword"]',
        metadata: {
            placeholder: 'New password',
            description: 'new password input on the reset-password page',
        },
    },

    confirmNewPasswordInput: {
        selector: 'input[data-automation-test="auto-input-ConfirmNewPassword"]',
        metadata: {
            placeholder: 'Confirm new password',
            description: 'confirm new password input on the reset-password page',
        },
    },

    submitButton: {
        selector: 'button[data-automation-test="auto-button-submit"]',
        metadata: {
            role: 'button',
            name: 'Submit',
            text: 'Submit',
            description: 'Submit button on the reset-password page',
        },
    },

    successMessage: {
        // Generic info snackbar — "Password changed successfully"
        selector: 'div[class="info snackbar-container"]',
        metadata: {
            role: 'alert',
            description: 'snackbar confirming the password was changed',
        },
    },

} satisfies Record<string, LocatorDefinition>;
