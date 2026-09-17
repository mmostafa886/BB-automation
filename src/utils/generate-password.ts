import { randomBytes } from 'crypto';

/**
 * Returns a fresh random password that satisfies the app's strength rules: at least 8
 * characters with an uppercase letter, a lowercase letter, a number and a special character.
 */
export function generateStrongPassword(): string {
    return `Bb!${randomBytes(6).toString('hex')}9a`;
}
