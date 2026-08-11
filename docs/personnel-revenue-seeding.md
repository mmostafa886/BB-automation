# Personnel's "% of revenue" scenario needs a seeded "Sales" revenue

`tests/generated/Personnel/tc-bb-personnel.spec.ts` (`TC-BB-Personnel`) exercises the
"individual regular labor, % of revenue" salary method. That scenario has a data
precondition the plain `npm run seed:forecast` doesn't satisfy on its own.

## Root cause

Confirmed live via the Playwright MCP browser (`browser_navigate` + `browser_evaluate`,
comparing the empty seeded forecast against one with a revenue stream added through the UI):

- The Personnel "Add" form's salary-method dropdown only renders the **"% of revenue"** and
  **"Constant + % of revenue"** options when the forecast already has **at least one revenue
  stream**. On a forecast with zero revenues, `[data-automation-test*="salaryMethod-singleOption"]`
  only ever contains "Constant amount" and "Varying amounts over time" — the other two options
  don't exist in the DOM at all, they don't just fail to open.
- `test-data/PersonnelInputs.json` → `revenue: "Sales"` additionally requires that revenue
  stream to be named **exactly `"Sales"`**, since the scenario picks it by name from the
  "which revenue" dropdown.

The shared forecast created by `npm run seed:forecast` starts completely empty
(`"revenues": []`), so this scenario cannot pass against it as-is — and the `Revenues` module's
own test data (`test-data/RevenuesInputs.json`) creates a revenue named `UnitSalesHappyScenario`,
not `Sales`, so simply running `Revenues` before `Personnel` would not close the gap either.

## The fix: seed the revenue directly, via API

Rather than making Personnel depend on another module's test having already run (fragile —
breaks if that module is skipped, reordered, or its test data changes), `seed-forecast.ts` can
create the "Sales" revenue itself, in the same API-only setup step that creates the forecast.

The underlying endpoint was reverse-engineered live by adding a revenue through the UI and
inspecting the resulting request with `mcp__playwright__browser_network_request`:

```
POST https://stgapi.bznsbuilder.com/api/revenue_streams   → 201

{
  "financial_plan_id": <forecastId>,
  "name": "Sales",
  "cost_call_id": null,
  "tax_id": null,
  "has_tax": "no",
  "type": "revenue_only",
  "revenueOnly": {
    "revenue_amount": "1000",
    "period": 1,
    "start": { "type": "specific", "date": "2023-01-01" },
    "end": { "type": "specific", "date": "2027-12-01" },
    "gross": { "gross_type": "percentage", "period": 1, "value": null },
    "existing_clients": null
  },
  "is_varying_amount": false,
  "gross": { "gross_type": "percentage", "period": 1, "value": null },
  "draftId": null,
  "client_id": 1,
  "client_secret": "MzxVN6ujeTo1cACH0RB66oI0MTxslMFSzCqMd7O0"
}

# Response: { "data": { "id": ..., "name": "Sales", "financial_plan": <forecastId>, ... } }
```

`client_id` / `client_secret` are a **static, non-user-specific application credential** — the
identical pair was present on a second, unrelated request (`/api/revenue_streams/preview`)
from the same page load, confirming it's baked into the SPA's JS bundle and sent by every
browser session regardless of which user is logged in. It is not a per-user secret, so it's
committed as-is in `ForecastApiClient.createRevenueStream()` (`src/utils/forecast-api-client.ts`).

`ForecastApiClient.createRevenueStream()` is called directly from
`tests/generated/Personnel/tc-bb-personnel.spec.ts`'s own `test.beforeAll` hook — Personnel is
self-contained and manages its own forecast lifecycle, unlike every other module sharing the
seeded forecast (`Revenues`, `DirectCost`, `IndirectCost`, `Assets`, `SignUp`), which keeps
today's zero-revenue baseline untouched via the external `seed-forecast.ts` CLI script and the
`seededForecast` fixture.

## Usage

### Running Personnel alone (locally, or any ad-hoc invocation)

No bracket needed — Personnel seeds and tears down its own forecast internally:

```bash
npm run test:module MODULE=Personnel
```

`test.beforeAll` in the spec looks for a forecast named `"test"` first. If one already exists
(e.g. from a prior `npm run seed:forecast` call), it reuses it and just adds the `Sales` revenue
stream, leaving cleanup to whatever created that forecast. If none exists, it creates its own and
deletes it itself in `test.afterAll`. Either way, a single `npm run test:module MODULE=Personnel`
is enough.

### Running as part of the CI pipeline

`.github/workflows/scheduled-execution.yml` runs Personnel as a normal member of the shared
`MODULES` loop — no dedicated seed/delete steps for it. Its `beforeAll` reuses the forecast the
loop's own `Seed forecast` step already created and adds the `Sales` revenue stream to it; the
loop's existing `Delete seeded forecast` step (which runs after every module, `if: always()`)
cleans it up along with everything else.

## Why Personnel must run last in `MODULES`

Personnel's `beforeAll` reuses whatever forecast is already named `"test"` and adds a `Sales`
revenue stream to it — harmless for modules that already ran against that forecast, but it would
silently change dashboard totals for any module still to come if Personnel ran earlier. That's
why `scheduled-execution.yml`'s `MODULES` list keeps Personnel last (with a comment there stating
the same constraint) — do not reorder it ahead of another module.

For a standalone `npm run test:module MODULE=Personnel` run with no shared forecast in play,
`beforeAll` falls back to creating and cleaning up its own forecast instead, so the ordering
constraint only matters when Personnel runs inside the shared `MODULES` loop.
