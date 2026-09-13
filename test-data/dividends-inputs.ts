import rawDividendsInputs from './DividendsInputs.json';
import type { DividendsInputs } from '../src/pages/dividends-page-self-healing';

/**
 * `DividendsInputs.json` typed as a fixed tuple — see {@link DividendsInputs} for why the
 * inferred JSON type is not usable as-is. Specs import this instead of the raw JSON.
 */
export const dividendsInputs = rawDividendsInputs as unknown as DividendsInputs;
