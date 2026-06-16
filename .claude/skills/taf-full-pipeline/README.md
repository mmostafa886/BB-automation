# taf-full-pipeline

Single-command entry point for the complete TAF self-healing migration pipeline.

## What it does

Detects which pipeline steps are already complete and starts from the first incomplete step.
Each skill auto-chains into the next — you only need to invoke one command.

```
scaffold-taf-infrastructure
        ↓ auto-chains
create-page-locators
        ↓ auto-chains
create-selfhealing-page
        ↓ auto-chains
register-page-in-pom
        ↓ auto-chains
migrate-test-to-selfhealing
        ↓ auto-chains
polish-generated-code
```

## Usage

```
/taf-full-pipeline              # auto-detect state, start from first incomplete step
/taf-full-pipeline status       # print state table only, no action
/taf-full-pipeline from polish  # force-start at polish-generated-code only
```

## When to use

- **Fresh project** — has existing Playwright tests but no self-healing infrastructure yet
- **Partial migration** — pipeline was interrupted mid-way; picks up where it left off
- **Re-run polish only** — use `from polish` after manually adding page methods

## Prerequisites

- `npm install` must have run (node_modules present)
- Existing Playwright test files in `tests/` to migrate
- `.env` configured with `BASE_URL` and an AI provider key (optional but recommended for Phase 3 healing)

See [docs/self-healing-locators.md](../../../docs/self-healing-locators.md) for architecture details.
