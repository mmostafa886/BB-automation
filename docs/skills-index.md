# Claude Code Skills Index

All skills live under `.claude/skills/<skill-name>/SKILL.md` and are invoked with:

```
/<skill-name>
```

Skills are grouped by pipeline. Each skill may automatically chain into the next one when complete.

---

## Group 1 — BRD → Playwright Pipeline

End-to-end path from a Business Requirements Document to runnable Playwright tests.

```
/brd-full-pipeline  ─────────────────────────── single-command entry point
        │
        ▼ auto-invokes /setup-workspace if workspace not configured
[setup-workspace]
        ↓
Phase 0.5 — Entry Point Detection
  ┌──────────────────────────────────────────────────────┐
  │ from brd / BRD content detected                      │ → Phase 1
  │ from stories / stories/<name>.md exists              │ → Phase 2 (skip Phase 1)
  │ from test-cases / test_cases/<name>.md exists        │ → Phase 3 (skip Phases 1–2)
  └──────────────────────────────────────────────────────┘
        ↓
Phase 1 — BRD → User Stories
        ↓
Phase 2 — User Stories → Test Cases
        ↓
Phase 3 — Test Cases → Playwright Scripts
        ↓  auto-chains
polish-generated-code
        ↓  auto-chains
Create feature branch & commit (Phase 4)
```

| # | Skill | Invoke | Target / When to Use | Output | Chains Into |
|---|-------|--------|----------------------|--------|-------------|
| 0 | **setup-workspace** | `/setup-workspace` | Run once on a fresh clone (or invoked automatically by `brd-full-pipeline`). Creates the folder skeleton (`stories/`, `test_cases/`, `src/pages/`, `tests/generated/`) required by the rest of the pipeline. | Empty directory structure | — |
| 1 | **brd-to-uss** | `/brd-to-uss` | You have raw BRD text and need structured User Stories. Paste or point to the BRD. | `stories/<feature>.md` — User Stories with Acceptance Criteria | — |
| 2 | **uss-to-tcs** | `/uss-to-tcs` | You have User Stories and need detailed Manual Test Cases. | `test_cases/<feature>.md` — structured Manual TCs | — |
| 3 | **tcs-to-plscript** | `/tcs-to-plscript` | You have Manual Test Cases and need production-ready Playwright TypeScript specs using the project's TAF (self-healing locators, page objects, POMLazySelfHealing fixture, AdvancedActionsHelper, AdvancedAssertionsHelper, Logger). Generates all 4 TAF layers, then polishes the output. | `tests/generated/<Module>/tc-<id>-<name>.spec.ts` | `polish-generated-code` |
| — | **brd-full-pipeline** | `/brd-full-pipeline` | Shortcut with flexible entry: auto-invokes `setup-workspace` if needed, detects the correct starting phase from the input or filesystem state, and runs through Phase 4. Supports `from brd`, `from stories`, `from test-cases` keywords and auto-detects pasted User Stories (US-* markers) or Test Cases (TC-* markers). | User Stories + Test Cases + Playwright specs, polished and committed | `polish-generated-code` → branch & commit |

---

## Group 2 — TAF Self-Healing Migration Pipeline

Converts existing raw Playwright tests into the self-healing POM architecture. Each skill automatically triggers the next — or use `/taf-full-pipeline` to run the entire chain from a single command.

```
/taf-full-pipeline  ──────────────────────────────────── single entry point
        │
        ▼ (auto-detects starting step)
scaffold-taf-infrastructure
        ↓ (auto-chains)
create-page-locators
        ↓ (auto-chains)
create-selfhealing-page
        ↓ (auto-chains)
register-page-in-pom
        ↓ (auto-chains)
migrate-test-to-selfhealing
        ↓ (auto-chains)
polish-generated-code
        ↓ (auto-chains)
Create taf/<module> branch & commit
```

| # | Skill | Invoke | Target / When to Use | Output | Chains Into |
|---|-------|--------|----------------------|--------|-------------|
| — | **taf-full-pipeline** | `/taf-full-pipeline` | **Single-command entry point.** Detects which steps are already complete and starts from the first incomplete step — the auto-chaining handles the rest. Ends by creating a `taf/<module>` branch and committing all artifacts. Use `status` to inspect state without running; use `from <step>` to force-start at a specific step. | Full self-healing TAF, committed to `taf/<module>` branch | Starts chain from detected step |
| 1 | **scaffold-taf-infrastructure** | `/scaffold-taf-infrastructure` | The branch has raw JS/TS Playwright tests but none of the self-healing TAF layers exist. Detects the gap and creates all base infrastructure in-place without touching existing test files. | `tsconfig.json`, `playwright.config.ts`, `self-healing-locator.ts`, `Logger.ts`, `AdvancedActionsHelper.ts`, `AdvancedAssertionsHelper.ts`, `AdvancedAPIHelper.ts`, `DownloadHelper.ts`, `StepRunner.ts`, `urls.ts`, `HelperFactory.ts`, `SelfHealingPageBase.ts`, `POMLazySelfHealing` stub, `self-healing-fixture.ts`, `api-test-fixture.ts`, `playwright-mcp-provider.ts`, `global-setup.ts` | `create-page-locators` |
| 2 | **create-page-locators** | `/create-page-locators [page]` | Run after infrastructure exists. Scans all test files to extract every `page.locator()`, `getByRole()`, `getByLabel()`, etc. call, groups them by page, and writes `src/locators/<page>-page-locators.ts` for each. Pass a page name to restrict to one module. | `src/locators/<page>-page-locators.ts` — `satisfies Record<string, LocatorDefinition>` files | `create-selfhealing-page` |
| 3 | **create-selfhealing-page** | `/create-selfhealing-page [page]` | Run after locator files exist. Creates `src/pages/<page>-self-healing.ts` (or appends missing methods to existing files). Performs semantic dedup before adding methods (e.g. won't add `clickSaveButton` if `clickSaveButtonAndVerifySuccess` already exists). | `src/pages/<page>-self-healing.ts` — typed action and assertion methods, `SelfHealingLocator` wiring | `register-page-in-pom` |
| 4 | **register-page-in-pom** | `/register-page-in-pom` | Run after page classes exist. Discovers all `*PageSelfHealing` classes in `src/pages/`, checks which are already registered, and adds missing ones (import, private field, lazy getter, `getHealingReport` entry) to `src/pages/pom-lazy-self-healing.ts`. | Updated `pom-lazy-self-healing.ts` | `migrate-test-to-selfhealing` |
| 5 | **migrate-test-to-selfhealing** | `/migrate-test-to-selfhealing [pattern]` | Run after POM is registered. Migrates all (or a subset of) test specs to the self-healing fixture pattern: replaces direct element usage with `pomSelfHealing.<page>.<method>()`, swaps fixture imports, adds JSDoc headers, and organises specs under `tests/generated/<Module>/`. Runs a verification pass and flags any leftover raw locator patterns as errors. | Migrated specs in `tests/generated/<Module>/tc-<id>-<name>.spec.ts` | `polish-generated-code` |
| 6 | **polish-generated-code** | `/polish-generated-code` | Final cleanup pass — runs automatically after migration, or invoke standalone at any time. Fixes stray backslash-escapes in specs, scaffolds missing page methods called from tests, extracts inline locators into the locator repository, and re-orders page class methods (navigation → actions → assertions → combined). | Cleaned `src/locators/`, `src/pages/`, and `tests/generated/` files | Branch & commit (Step 7) |
| 7 | *(branch & commit)* | auto | Runs automatically after Polish. Creates `taf/<module>` branch (module auto-detected from `tests/generated/`) and commits all TAF artifacts: `src/locators/`, `src/pages/`, `tests/generated/`, `tests/fixtures/`. | `taf/<module>` branch with all artifacts committed | — |

---

## Group 3 — BRD → Azure DevOps Pipeline

Required env vars: `AZURE_DEVOPS_ORG_URL`, `AZURE_PROJECT_NAME`, `AZURE_PERSONAL_ACCESS_TOKEN`
(PAT scopes: Work Items read/write, Test Plans read/write).
ADO push phases are **skipped gracefully** if env vars are not set.

```
/ado-full-pipeline  ──────────────────────── single entry point
        │
        ▼ PHASE 0 — workspace + ADO env check
[setup-workspace]  +  ADO env validation
        ↓
Phase 0.5 — Entry Point Detection (same 3-tier logic as brd-full-pipeline)
        ↓
Phase 1    BRD → User Stories   (local save → stories/<name>.md)
        ↓  auto-continues
Phase 1.5  ado-uss-to-tcs       (ADO User Story work items + ADO_IDs.json)
        ↓  auto-continues
Phase 2    User Stories → Test Cases   (local save → test_cases/<name>.md)
        ↓  auto-continues
Phase 2.5  tcs-to-ado           (ADO Test Plan + Suite + TCs + links)
        ↓  auto-continues
Phase 3    Test Cases → Playwright     (local save + run)
        ↓  auto-chains
Phase 3.5  polish-generated-code
        ↓  auto-chains
Phase 4    Git branch & commit   (includes ADO mapping JSON files)
```

| # | Skill | Invoke | Output | Chains Into |
|---|-------|--------|--------|-------------|
| — | **ado-full-pipeline** | `/ado-full-pipeline` | All local files + ADO work items + branch | Full chain |
| 1 | **brd-to-uss** | `/brd-to-uss` | `stories/<name>_UserStories.md` | — |
| 1.5 | **ado-uss-to-tcs** | `/ado-uss-to-tcs <FeatureName> [--save-local] [--local-only]` | ADO Test Case WIs + `test_cases/<name>_ADO_TCs.json` + `config/testCaseFilter.js` patched. `--save-local` also writes `test_cases/<name>_TestCases.md`. `--local-only` saves all three local files (`_TestCases.md`, `_ADO_TCs.json` with null IDs, `stories/<name>_ADO_IDs.json` with real US ADO IDs) and skips all ADO writes. | Step 5.5 auto-appends new TC IDs to `config/testCaseFilter.js` (skipped for `--local-only`) |
| 2 | **uss-to-tcs** | `/uss-to-tcs` | `test_cases/<name>_TestCases.md` | — |
| 2.5 | **tcs-to-ado** | `/tcs-to-ado <FeatureName>` | ADO Test Plan + Suite + Test Cases + `test_cases/<name>_ADO_TCs.json` | Requires `stories/<name>_ADO_IDs.json`; use `--no-link` workaround when mapping is absent |
| 3 | **tcs-to-plscript** | `/tcs-to-plscript` | POM + spec + PR | `polish-generated-code` |

---

## Group 4 — ADO-First Pipeline (ADO TCs → Playwright)

Use this group when test cases already exist in Azure DevOps and you want to generate
or regenerate Playwright scripts directly from them — no BRD, no local markdown needed.

```text
config/testCaseFilter.js  (module name → ADO TC IDs)
        │
        ▼
/ado-tcs-to-plscript  ──────── single entry point
        │  fetches TCs from ADO, generates 4 TAF layers
        ↓  auto-chains
polish-generated-code
```

| Skill | Invoke | Output | Notes |
|-------|--------|--------|-------|
| **ado-tcs-to-plscript** | `/ado-tcs-to-plscript [module or all]` | Locators + page class + POM + specs | TC IDs must be in `config/testCaseFilter.js`; auto-chains to `polish-generated-code` |

### Going from ADO User Stories → Playwright scripts

No manual steps required. `ado-uss-to-tcs` Step 5.5 auto-patches `config/testCaseFilter.js`:

```text
1.  /ado-uss-to-tcs <feature-tag-or-ids>
        └─ Creates TCs in ADO
        └─ Saves test_cases/<FeatureName>_ADO_TCs.json
        └─ Step 5.5: patches config/testCaseFilter.js (append-only)

2.  /ado-tcs-to-plscript <module-name>
        └─ Fetches TCs from ADO → generates Playwright scripts → Polish
```

> A single-command `/ado-uss-to-plscript` skill is still planned for a one-liner experience.
> See `docs/skills-review-2026-03-16.md`.

---

## Group 5 — Multi-AI TC Workflow (Claude + OpenAI → ADO Test Plan + Playwright)

Use this group when you want to generate Test Cases with **two AI models** (Claude and OpenAI)
from the same ADO User Stories, merge the results into one deduplicated set, then produce
both an ADO Test Plan **and** runnable Playwright automation scripts.

```text
ADO User Stories
        │
        ▼ Step 1 — generate TCs with Claude (local only, no ADO write)
/ado-uss-to-tcs <FeatureName> --local-only
        └─ Fetches USs from ADO (read-only)
        └─ Generates TCs in memory with Claude
        └─ Saves: test_cases/<FeatureName>_TestCases.md       ← Claude TCs
        └─ Saves: test_cases/<FeatureName>_ADO_TCs.json       (adoId: null)
        └─ Saves: stories/<FeatureName>_ADO_IDs.json          (real US ADO IDs)
        │
        ▼ Step 2 — generate TCs with OpenAI [external / manual step]
        └─ Feed same USs to OpenAI
        └─ Save output as: test_cases/<FeatureName>_TestCases_OpenAI.md
        │
        ▼ Step 3 — merge both TC sets
/merge-tc-sets <FeatureName> test_cases/<FeatureName>_TestCases_OpenAI.md
        └─ Claude TCs = primary source (kept as-is)
        └─ OpenAI unique TCs appended; near-duplicates removed
        └─ Writes merged: test_cases/<FeatureName>_TestCases.md
        │
        ▼ Step 4 — push merged TCs to ADO (creates Test Plan + Suite + work items)
/tcs-to-ado <FeatureName>
        └─ Reads merged test_cases/<FeatureName>_TestCases.md
        └─ Reads stories/<FeatureName>_ADO_IDs.json  (saved in Step 1 — no manual setup)
        └─ Creates: ADO Test Plan + Static Suite + TC work items with TestedBy links
        └─ Saves: test_cases/<FeatureName>_ADO_TCs.json  (real ADO TC IDs)
        │
        ▼ Step 5 — generate Playwright automation scripts
/tcs-to-plscript <FeatureName>
        └─ Reads merged test_cases/<FeatureName>_TestCases.md
        └─ Generates: locators, self-healing page class, POM registration, spec files
        └─ Auto-chains to polish-generated-code
```

| Step | Skill | Invoke | Output |
|------|-------|--------|--------|
| 1 | **ado-uss-to-tcs** | `/ado-uss-to-tcs <FeatureName> --local-only` | `test_cases/*_TestCases.md` + `*_ADO_TCs.json` (null) + `stories/*_ADO_IDs.json` (real IDs) |
| 2 | *(external)* | OpenAI / manual | `test_cases/<FeatureName>_TestCases_OpenAI.md` |
| 3 | **merge-tc-sets** | `/merge-tc-sets <FeatureName> test_cases/<FeatureName>_TestCases_OpenAI.md` | Merged `test_cases/*_TestCases.md`; updated `*_ADO_TCs.json` |
| 4 | **tcs-to-ado** | `/tcs-to-ado <FeatureName>` | ADO Test Plan + Suite + TC work items; `test_cases/*_ADO_TCs.json` with real IDs |
| 5 | **tcs-to-plscript** | `/tcs-to-plscript <FeatureName>` | Playwright locators + page class + POM + specs → auto-chains to `polish-generated-code` |

### Key properties

- **No manual file creation** — `stories/<FeatureName>_ADO_IDs.json` is saved automatically
  by `--local-only` in Step 1, so `tcs-to-ado` in Step 4 can resolve `TestedBy` links
  without any extra setup.
- **Deduplication is safe** — `merge-tc-sets` keeps Claude TCs unchanged; only unique
  OpenAI TCs are added. Near-duplicates (title similarity ≥ 0.80) are silently discarded.
- **Both outputs produced** — Step 4 creates the ADO Test Plan; Step 5 creates Playwright
  scripts. Both read the same merged markdown so coverage is identical.
- **Idempotent** — each skill has its own guard; re-running a step that already completed
  warns before overwriting.

---

## Standalone Utility Skills

| Skill | Invoke | Target / When to Use | Output |
|-------|--------|----------------------|--------|
| **analyze-trace** | `/analyze-trace [trace path or TC-ID]` | A test is failing and you have a `trace.zip` in `test-results/`. Parses the binary `.trace` event stream, reconstructs the step timeline, classifies the root cause into one of 9 failure categories (locator, timing, download mismatch, `waitForFunction` arg position, auth, etc.), prints a structured report, and applies the minimal fix to the relevant source file. | Failure report + targeted fix applied to `src/locators/` or `src/pages/` file |
| **execute-and-fix-tests** | `/execute-and-fix-tests [path or pattern]` | A test (or set of tests) is failing and you want to run, inspect, fix, and re-run in one command. Runs `npx playwright test`, parses failures, uses the Playwright MCP browser to live-inspect failing elements on the running app, applies targeted fixes to locators / page objects / spec files, and loops until all selected tests pass. | Fixed `src/locators/`, `src/pages/`, and/or `tests/generated/` files + final pass/fail report |
| **merge-tc-sets** | `/merge-tc-sets <FeatureName> [FileA] [FileB] [--keep-both]` | Two TC markdown files exist for the same feature (e.g. one from Claude, one from OpenAI). Deduplicates by TC ID and title similarity (≥ 0.80 Levenshtein). File A is the primary source — its TCs are never removed. Unique File B TCs are appended. Also merges the JSON TC mapping files if both are present. | Merged `test_cases/<FeatureName>_TestCases.md` + updated `test_cases/<FeatureName>_ADO_TCs.json` |
| **move-specs-to-module** | `/move-specs-to-module` | Move spec files from one generated module folder to another, porting all associated page methods, locators, and POM wiring. | Relocated specs in `tests/generated/<TargetModule>/`, updated `src/locators/` + `src/pages/`, cleaned source module |
| **rename-and-merge-module** | `/rename-and-merge-module` | Rename a generated test module's tag, describe prefix, and folder across all spec files in one run. Optionally merges the source module's page object and locator files into an existing target module, then removes obsolete source files. | Renamed/merged specs, updated POM registration, deleted obsolete files |

---

## Failure Category Reference (analyze-trace)

| Category | Triggered By |
|---|---|
| `LOCATOR` | `TimeoutError: waiting for locator(...)` |
| `LOCATOR-STRICT` | `strict mode violation` — selector matches multiple elements |
| `TEXT` | `toHaveText` / `toContainText` received ≠ expected |
| `TIMING` | `toBeVisible` fails immediately after an action |
| `WAITFN-ARG` | CDP shows `"timeout": 0` — options object passed as `arg` |
| `WAITFN-NEVER` | `waitForFunction` poll flag never set by the page |
| `DOWNLOAD-MISMATCH` | `showSaveFilePicker` mock installed but blob-URL download event fires |
| `TIMEOUT` | 30-second test-level timeout with no specific Playwright error |
| `CODE` | TypeScript / JavaScript runtime error in POM or spec |
| `AUTH` | 401 / 403 on API calls inside the test |

---

## Quick Reference

| I want to… | Use |
|---|---|
| Bootstrap a brand-new project | `/setup-workspace` |
| Turn a BRD into User Stories | `/brd-to-uss` |
| Turn User Stories into Manual Test Cases | `/uss-to-tcs` |
| Turn Manual Test Cases into Playwright specs | `/tcs-to-plscript` |
| Do all of BRD → Playwright in one command | `/brd-full-pipeline` |
| Run the full TAF migration in one command (ends with branch & commit) | `/taf-full-pipeline` |
| Check TAF pipeline state without running | `/taf-full-pipeline status` |
| Add the self-healing TAF base infrastructure | `/scaffold-taf-infrastructure` |
| Extract locators from existing tests | `/create-page-locators` |
| Generate self-healing page objects | `/create-selfhealing-page` |
| Register new page objects in the POM | `/register-page-in-pom` |
| Migrate existing tests to the self-healing pattern | `/migrate-test-to-selfhealing` |
| Clean up / fix issues in generated code | `/polish-generated-code` |
| Run failing tests, live-fix them, and re-run until green | `/execute-and-fix-tests` |
| Debug a failing test from its trace file | `/analyze-trace` |
| Push User Stories to ADO | `/ado-uss-to-tcs <FeatureName>` |
| Push User Stories to ADO and save TCs locally | `/ado-uss-to-tcs <FeatureName> --save-local` |
| Fetch ADO USs → generate TCs → save all three files locally (no ADO write) | `/ado-uss-to-tcs <FeatureName> --local-only` |
| Merge two TC sets (Claude + OpenAI) into one deduplicated file | `/merge-tc-sets <FeatureName> <FileA> <FileB>` |
| Push Test Cases to ADO (Test Plan + Suite) | `/tcs-to-ado <FeatureName>` |
| Generate Playwright scripts from ADO TCs (single module) | `/ado-tcs-to-plscript <ModuleName>` |
| Generate Playwright scripts from ADO TCs (all active modules) | `/ado-tcs-to-plscript` |
| ADO USs → Playwright scripts | `/ado-uss-to-tcs` then `/ado-tcs-to-plscript` (filter auto-updated by Step 5.5) |
| BRD → ADO + Playwright in one command | `/ado-full-pipeline` |
| ADO pipeline from existing stories | `/ado-full-pipeline from stories <FeatureName>` |
| ADO pipeline from existing test cases | `/ado-full-pipeline from test-cases <FeatureName>` |
| Re-push stories to ADO (no re-generation) | `/ado-full-pipeline from ado-stories <FeatureName>` |
| Re-push test cases to ADO (no re-generation) | `/ado-full-pipeline from ado-test-cases <FeatureName>` |
| Check ADO pipeline state | `/ado-full-pipeline status <FeatureName>` |
| Move spec files between module folders | `/move-specs-to-module` |
| Rename a module or merge it into another | `/rename-and-merge-module` |
