/**
 * Generates random numbers for use in test data across pages and specs.
 * Use these helpers instead of inlining Math.random() so number generation
 * stays consistent and unique values don't collide across test runs.
 */
export class RandomNumberGenerator {
  /**
   * Returns a random integer in the inclusive range [min, max].
   * @example RandomNumberGenerator.between(1, 100) → 42
   */
  static between(min: number, max: number): number {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  /**
   * Returns a random integer with exactly the given number of digits.
   * @example RandomNumberGenerator.ofDigits(6) → 503418
   */
  static ofDigits(digits: number): number {
    if (digits <= 0) return 0;
    const min = Math.pow(10, digits - 1);
    const max = Math.pow(10, digits) - 1;
    return this.between(min, max);
  }

  /**
   * Returns a random decimal in the range [min, max) rounded to the given
   * number of decimal places.
   * @example RandomNumberGenerator.decimal(0, 1, 2) → 0.37
   */
  static decimal(min: number, max: number, places = 2): number {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(places));
  }

  /**
   * Returns a unique number based on the current timestamp, optionally
   * combined with a few random digits to avoid collisions within the same
   * millisecond. Useful as a unique numeric id in test data.
   * @example RandomNumberGenerator.unique() → 1751299822417531
   */
  static unique(): number {
    return Number(`${Date.now()}${this.between(100, 999)}`);
  }
}
