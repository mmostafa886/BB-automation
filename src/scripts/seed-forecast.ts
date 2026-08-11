import 'dotenv/config';
import { ForecastApiClient } from '../utils/forecast-api-client';
import { readRunContext, writeRunContext, clearRunContext } from '../utils/seed-run-context';
import revenuesInputs from '../../test-data/RevenuesInputs.json';

/**
 * seed-forecast.ts
 *
 * CLI used to bracket a test execution (one module or several) with a single API-created
 * forecast, so the UI flow only has to select it instead of building it by hand:
 *
 *   npm run seed:forecast                       # create, once, before any module runs
 *   npm run test:area Revenues                   # any number of modules — read-only
 *   npm run test:area Assets
 *   npm run seed:forecast:delete                 # delete, once, after all modules finish
 *
 * The forecast name defaults to plain "test" (override via SEED_FORECAST_NAME). Since every run
 * reuses the same fixed name, `create` self-heals rather than failing on leftovers — from an
 * interrupted previous run, or a forecast that pre-dates this script entirely:
 *   1. a stale `.seed/run-context.json` (forecast id known)              → deleted first
 *   2. any OTHER forecast already named `SEED_FORECAST_NAME` on the company, whoever created it
 *      (context lost, e.g. a fresh checkout, or a manually-created same-named forecast) → deleted first
 * ...then a fresh forecast is created and its id/name written to the run context.
 *
 * Credentials: TEST_USER_EMAIL / TEST_USER_PASSWORD (set as CI secrets) fall back to
 * `test-data/RevenuesInputs.json[0]`, which is also where the target company name and
 * forecast-name default come from.
 *
 * Usage: tsx src/scripts/seed-forecast.ts create|delete
 */

const ACTION = process.argv[2];

const EMAIL = process.env.TEST_USER_EMAIL || revenuesInputs[0].mail;
const PASSWORD = process.env.TEST_USER_PASSWORD || revenuesInputs[0].password;
const COMPANY_NAME = process.env.SEED_COMPANY_NAME || revenuesInputs[0].company;
const FORECAST_NAME = process.env.SEED_FORECAST_NAME || 'test';
// Optional: when set, one revenue stream is created on the forecast after it's created —
// e.g. Personnel's "% of revenue" salary method needs a revenue named "Sales" to already
// exist. Unset by default so every other module's baseline (empty forecast) is unaffected.
// See docs/personnel-revenue-seeding.md.
const REVENUE_NAME = process.env.SEED_REVENUE_NAME;
const REVENUE_AMOUNT = process.env.SEED_REVENUE_AMOUNT || '1000';

async function create(): Promise<void> {
    const client = new ForecastApiClient();
    try {
        await client.login(EMAIL, PASSWORD);
        const companyId = await client.resolveCompanyId(COMPANY_NAME);

        // 1. A stale run context from an interrupted previous run — its forecast is still on
        //    the account since nothing ran `seed:forecast:delete` for it.
        const staleContext = readRunContext();
        if (staleContext) {
            console.log(
                `[seed-forecast] Found a leftover run context (id ${staleContext.forecastId}, ` +
                `"${staleContext.forecastName}") — deleting it before creating a fresh one.`,
            );
            await client.deleteForecast(staleContext.forecastId);
            clearRunContext();
        }

        // 2. A same-named forecast the run context lost track of (e.g. fresh checkout, .seed/
        //    manually removed). The UI selects the forecast by name, so a duplicate would be
        //    ambiguous even if its id isn't the one we're about to track.
        const duplicate = (await client.listForecasts(companyId))
            .find(f => f.name === FORECAST_NAME && f.id !== staleContext?.forecastId);
        if (duplicate) {
            console.log(`[seed-forecast] Found an existing forecast named "${FORECAST_NAME}" (id ${duplicate.id}) — deleting it first.`);
            await client.deleteForecast(duplicate.id);
        }

        const forecast = await client.createForecast(FORECAST_NAME, companyId);

        if (REVENUE_NAME) {
            const revenue = await client.createRevenueStream(REVENUE_NAME, forecast.id, REVENUE_AMOUNT);
            console.log(`[seed-forecast] Created revenue stream "${revenue.name}" (id ${revenue.id}) on forecast ${forecast.id}.`);
        }

        writeRunContext({
            forecastId: forecast.id,
            forecastName: forecast.name,
            companyId,
            createdAt: new Date().toISOString(),
        });

        console.log(`[seed-forecast] Created forecast "${forecast.name}" (id ${forecast.id}) on company ${companyId}.`);
    } finally {
        await client.dispose();
    }
}

async function del(): Promise<void> {
    const context = readRunContext();
    if (!context) {
        console.log('[seed-forecast] No run context found — nothing to delete.');
        return;
    }

    const client = new ForecastApiClient();
    try {
        await client.login(EMAIL, PASSWORD);
        await client.deleteForecast(context.forecastId);
        console.log(`[seed-forecast] Deleted forecast "${context.forecastName}" (id ${context.forecastId}).`);
    } finally {
        await client.dispose();
        clearRunContext();
    }
}

async function main(): Promise<void> {
    if (ACTION === 'create') {
        await create();
    } else if (ACTION === 'delete') {
        await del();
    } else {
        console.error('Usage: tsx src/scripts/seed-forecast.ts create|delete');
        process.exit(1);
    }
}

main().catch((error) => {
    console.error(`[seed-forecast] ${(error as Error).message}`);
    process.exit(1);
});
