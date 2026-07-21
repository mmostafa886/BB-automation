import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { signupLocators } from '../locators/signup-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';
import { RandomNumberGenerator } from '../utils/generate-random-number';

/**
 * SignUpPageSelfHealing — Page Object for the BznsBuilder sign-up / registration modal.
 *
 * Migrated 1:1 from the legacy TestCafe page object `SignUpPage` (page.js). Every legacy
 * method is preserved with the same name (including the original misspelling
 * `validSighupAssertion`), the same parameter list, and the same source order, so already
 * migrated specs map onto it without renaming.
 *
 * All static locators support three-phase self-healing:
 *   Phase 1 → primary CSS/XPath selector
 *   Phase 2 → semantic Playwright strategies (role, label, placeholder …)
 *   Phase 3 → AI healing via Playwright MCP (opt-in, requires aiProvider)
 *
 * NOTE: the Arabic language-check strings below are carried over verbatim from the legacy
 * source, where they arrived mojibake-encoded (UTF-8 bytes read as Latin-1). They are almost
 * certainly broken and must be replaced with the correct Arabic copy — verify on the live app.
 */
export class SignUpPageSelfHealing extends SelfHealingPageBase {
    // ── Auth landing / social ────────────────────────────────────────────────
    readonly languageBtn:         SelfHealingLocator;
    readonly socialMediaButtons:  SelfHealingLocator;
    readonly signUpPopUp:         SelfHealingLocator;
    readonly googleButton:        SelfHealingLocator;
    readonly facebookButton:      SelfHealingLocator;
    readonly linkedinButton:      SelfHealingLocator;
    readonly closeBtn:            SelfHealingLocator;

    // ── Register form fields ──────────────────────────────────────────────────
    readonly email:               SelfHealingLocator;
    readonly password:            SelfHealingLocator;
    readonly signUpBtn:           SelfHealingLocator;
    readonly firstName:           SelfHealingLocator;
    readonly lastName:            SelfHealingLocator;

    // ── Validation / success messages ─────────────────────────────────────────
    readonly requiredMsg:             SelfHealingLocator;
    readonly invalidMailFormatMsg:    SelfHealingLocator;
    readonly existedEmailMsg:         SelfHealingLocator;
    readonly invalidPasswordFormatMsg: SelfHealingLocator;
    readonly successMsg:              SelfHealingLocator;

    private readonly page:    Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert:  AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`SignUpPageSelfHealing-${testName}`);
        const make = (def: typeof signupLocators[keyof typeof signupLocators]) =>
            SelfHealingLocator.from(page, def, logger, aiProvider);

        this.languageBtn             = make(signupLocators.languageBtn);
        this.socialMediaButtons      = make(signupLocators.socialMediaButtons);
        this.signUpPopUp             = make(signupLocators.signUpPopUp);
        this.googleButton            = make(signupLocators.googleButton);
        this.facebookButton          = make(signupLocators.facebookButton);
        this.linkedinButton          = make(signupLocators.linkedinButton);
        this.closeBtn                = make(signupLocators.closeBtn);
        this.email                   = make(signupLocators.email);
        this.password                = make(signupLocators.password);
        this.signUpBtn               = make(signupLocators.signUpBtn);
        this.firstName               = make(signupLocators.firstName);
        this.lastName                = make(signupLocators.lastName);
        this.requiredMsg             = make(signupLocators.requiredMsg);
        this.invalidMailFormatMsg    = make(signupLocators.invalidMailFormatMsg);
        this.existedEmailMsg         = make(signupLocators.existedEmailMsg);
        this.invalidPasswordFormatMsg = make(signupLocators.invalidPasswordFormatMsg);
        this.successMsg              = make(signupLocators.successMsg);
    }

    /** Whitespace-tolerant exact-match RegExp for TestCafe `withExactText`-style matching. */
    private exactText(value: string): RegExp {
        const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`^\\s*${escaped}\\s*$`);
    }

    // ── Migrated methods (1:1, source order) ───────────────────────────────────

    /**
     * Verifies the auth modal renders its Arabic copy: social-login labels, the sign-up /
     * sign-in tab text, then opens the sign-up tab and verifies the form labels + submit text.
     *
     * NOTE: every Arabic literal here is carried over verbatim from the legacy source, where
     * it was mojibake-encoded — replace with the correct Arabic copy and verify on the live app.
     * NOTE: `signInPopUp` had no entry in the locators repository (the legacy method also
     * referenced `this.*` fields that never existed on the wrapper class). Its assertion is
     * reconstructed here against the visible Arabic sign-in text via a runtime locator — verify.
     */
    async checkLanguage(): Promise<void> {
        await test.step('Check sign-up modal Arabic language copy', async () => {
            const loginWithGoogle   = 'الدخول بحساب جوجل';
            const loginWithFacebook =' الدخول بحساب الفيسبوك';
            const loginWithLinkedin = 'الدخول بحساب لينكد ان';
            const signUpTab         = 'اشترك معنا';
            const signInTab         = 'تسجيل الدخول';
            const emailLabel        = 'ادخل البريد الالكترونى';
            const passwordLabel     = 'ادخل كلمة المرور';
            const signUpBtnText     = 'أشترك';
            const signInSpanText    = 'تسجيل الدخول';

            await this.actions.click(await this.languageBtn.get())

            // Social-login option labels (span.withExactText → runtime span locator)
            await this.assert.toBeVisible(this.page.locator('span').filter({ hasText: this.exactText(loginWithGoogle) }), 'Google login label is present');
            await this.assert.toBeVisible(this.page.locator('span').filter({ hasText: this.exactText(loginWithFacebook) }), 'Facebook login label is present');
            await this.assert.toBeVisible(this.page.locator('span').filter({ hasText: this.exactText(loginWithLinkedin) }), 'Linkedin login label is present');

            // Sign-up / sign-in tab copy
            await this.assert.toContainText(await this.signUpPopUp.get(), signUpTab, 'Sign-up tab contains Arabic copy');
            // NOTE: reconstructed signInPopUp assertion — see method JSDoc.
            await this.assert.toContainText(this.page.getByText(signInTab).first(), signInTab, 'Sign-in tab contains Arabic copy');

            await this.actions.click(await this.signUpPopUp.get(), 'Open sign-up tab');
            await this.assert.toBeVisible(this.page.locator('label').filter({ hasText: this.exactText(emailLabel) }), 'Email field label is present');

            await this.assert.toBeVisible(this.page.locator('label').filter({ hasText: this.exactText(passwordLabel) }), 'Password field label is present');
            await this.assert.toContainText(await this.signUpBtn.get(), signUpBtnText, 'Sign-up button contains Arabic copy');
            await this.assert.toBeVisible(this.page.locator('span').filter({ hasText: this.exactText(signInSpanText) }), 'Sign-in span text is present');
        });
    }

    /** Asserts each social-media login button exists on the auth modal. */
    async checkExistanceOfSocialMediaButtons(): Promise<void> {
        await test.step('Check social-media login buttons exist', async () => {
            const buttons: Array<[SelfHealingLocator, string]> = [
                [this.facebookButton, 'Facebook'],
                [this.googleButton,   'Gmail'],
                [this.linkedinButton, 'Linkedin'],
            ];
            for (const [button, label] of buttons) {
                await this.assert.toBeVisible((await button.get()).filter({visible:true}), `${label} social-login button exists`);
            }
        });
    }

    /** Opens the sign-up (register) modal from the auth landing page. */
    async openSignupPopUp(): Promise<void> {
        await test.step('Open sign-up modal', async () => {
            await this.actions.click(await this.signUpPopUp.get(), 'Click to open the sign-up modal');
        });
    }

    /**
     * Fills the email field. When `flag === 'valid'`, prefixes the value with a freshly generated
     * unique number to keep the address unique on every call (legacy `randomNumber + email`);
     * otherwise types the raw value (used to exercise invalid / already-taken cases).
     */
    async fillEmail(flag: string, email: string): Promise<void> {
        await test.step(`Fill email (flag: ${flag})`, async () => {
            if (flag === 'valid' || flag=='invalidpassword') {
                await this.actions.fill(await this.email.get(), `${RandomNumberGenerator.unique()}${email}`, 'Fill unique valid email');
            } else {
                await this.actions.fill(await this.email.get(), email, 'Fill email');
            }
        });
    }

    /** Fills the password field. */
    async fillPassword(password: string): Promise<void> {
        await test.step('Fill password', async () => {
            await this.actions.fill(await this.password.get(), password, 'Fill password', true);
        });
    }

    /** Fills the first-name field. */
    async fillFirstName(name: string): Promise<void> {
        await test.step('Fill first name', async () => {
            await this.actions.fill((await this.firstName.get()).first(), name, 'Fill first name');
        });
    }

    /** Fills the last-name field. */
    async fillLastName(name: string): Promise<void> {
        await test.step('Fill last name', async () => {
            await this.actions.fill((await this.lastName.get()).last(), name, 'Fill last name');
        });
    }

    /**
     * Submits the register form and asserts the success message appears.
     * NOTE: legacy method name misspelled (`validSighupAssertion`) — preserved intentionally.
     */
    async validSighupAssertion(): Promise<void> {
        await test.step('Submit sign-up and assert success', async () => {
            await this.actions.click(await this.signUpBtn.get(), 'Click sign-up submit button');
            await this.assert.toBeVisible(await this.successMsg.get(), 'Sign-up success message is visible');
        });
    }

    /** Closes the sign-up modal and asserts the success message is gone while the modal trigger remains. */
    async closeSignupPopUp(): Promise<void> {
        await test.step('Close sign-up modal', async () => {
            await this.actions.click(await this.closeBtn.get(), 'Click close button');
            await this.assert.toBeHidden(await this.successMsg.get(), 'Success message is no longer present');
            await this.assert.toBeVisible(await this.signUpPopUp.get(), 'Sign-up modal trigger is still present');
        });
    }

    /** Submits an empty form and asserts the required-field validation message appears. */
    async emptyFieldAssertion(): Promise<void> {
        await test.step('Assert required-field validation', async () => {
            await this.actions.click(await this.signUpBtn.get(), 'Click sign-up submit button');
            await this.assert.toBeVisible(await this.requiredMsg.get(), 'Required-field validation message is visible');
        });
    }

    /** Submits a malformed email and asserts the invalid-email-format validation message appears. */
    async invalidEmailAssertion(): Promise<void> {
        await test.step('Assert invalid-email-format validation', async () => {
            await this.actions.click(await this.signUpBtn.get(), 'Click sign-up submit button');
            await this.assert.toBeVisible(await this.invalidMailFormatMsg.get(), 'Invalid email format message is visible');
        });
    }

    /** Submits an already-registered email and asserts the duplicate-email message appears and no success message shows. */
    async oldEmailAssertion(): Promise<void> {
        await test.step('Assert duplicate-email validation', async () => {
            await this.actions.click(await this.signUpBtn.get(), 'Click sign-up submit button');
            await this.assert.toBeVisible(await this.existedEmailMsg.get(), 'Duplicate-email message is visible');
            await this.assert.toBeHidden(await this.successMsg.get(), 'Success message is not present');
        });
    }

    /** Submits a weak password and asserts the minimum-length validation message appears. */
    async invalidPassword(): Promise<void> {
        await test.step('Assert invalid-password validation', async () => {
            await this.actions.click(await this.signUpBtn.get(), 'Click sign-up submit button');
            await this.assert.toBeVisible(await this.invalidPasswordFormatMsg.get(), 'Invalid password format message is visible');
        });
    }

    /** Asserts the email and password inputs carry the expected placeholder substrings. */
    async checkPlaceHolder(): Promise<void> {
        await test.step('Check email/password placeholders', async () => {
            const mailPlaceholder     = (await (await this.email.get()).getAttribute('placeholder')) ?? '';
            const passwordPlaceholder = (await (await this.password.get()).getAttribute('placeholder')) ?? '';
            await this.assert.toContain(mailPlaceholder, 'Email', `Email placeholder contains Email`);
            await this.assert.toContain(passwordPlaceholder, 'Password', `Password placeholder contains Password`);
        });
    }
    async Assertion(flag: string){
        switch (flag) {
            case 'valid':
                await this.validSighupAssertion();
                break;
            case 'valid2':
                await this.validSighupAssertion();
                break;
            case 'cancel':
                await this.closeSignupPopUp();
                break;
            case 'empty':
                await this.emptyFieldAssertion();
                break;
            case 'invalidmail':
                await this.invalidEmailAssertion();
                break;
            case 'oldmail':
                await this.oldEmailAssertion();
                break;
            case 'invalidpassword':
                await this.invalidPassword();
                await this.fillPassword('12345678');
                await this.validSighupAssertion()
                break;
            case 'placeholders':
                await this.checkPlaceHolder();
                break;
        }
    }
}


