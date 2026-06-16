/**
 * Generates unique, timestamp-based random names for use in test data.
 * Appends a date-time suffix to avoid collisions across test runs.
 */
export class RandomTextGenerator {
  /**
   * Returns a timestamp suffix in the format YYYYMMDD-HHmmss-mmm
   */
  private static timestamp(): string {
    const now = new Date();
    const pad = (n: number, len = 2) => String(n).padStart(len, '0');
    return (
      `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}` +
      `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}` +
      `-${pad(now.getMilliseconds(), 3)}`
    );
  }

  /**
   * Appends a date-time suffix to the given base name.
   * @example RandomNameGenerator.withTimestamp('My Class') → 'My Class 20260406-143022-417'
   */
  static withTimestamp(baseName: string): string {
    return `${baseName} ${this.timestamp()}`;
  }

  /**
   * Returns a standalone unique name built from a prefix and a timestamp.
   * @example RandomNameGenerator.unique('ReactionClass') → 'ReactionClass-20260406-143022-417'
   */
  static unique(prefix = 'Record'): string {
    return `${prefix}-${this.timestamp()}`;
  }

  /**
   * Returns a random alphanumeric string of exactly the given length,
   * with the current timestamp embedded at the start.
   * If length is shorter than the timestamp, the timestamp is truncated.
   * @example RandomTextGenerator.ofLength(30) → '20260406-143022-417aB3xKq7mNpZ'
   */
  static ofLength(length: number): string {
    const ts = this.timestamp();
    if (length <= ts.length) return ts.slice(0, length);
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let random = '';
    for (let i = 0; i < length - ts.length; i++) {
      random += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return ts + random;
  }
}
