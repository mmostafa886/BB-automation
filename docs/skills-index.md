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
        ▼
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
| 1 | **brd-to-uss** | `/brd-to-uss` | You have raw BRD text and need structured User Stories. Paste or point to the BRD. | `stories/<feature>.md` — User Stories with Acceptance Criteria | — |
| 2 | **uss-to-tcs** | `/uss-to-tcs` | You have User Stories and need detailed Manual Test Cases. | `test_cases/<feature>.md` — structured Manual TCs | — |
| 3 | **tcs-to-plscript** | `/tcs-to-plscript` | You have Manual Test Cases and need production-ready Playwright TypeScript specs using the project's TAF (self-healing locators, page objects, POMLazySelfHealing fixture, AdvancedActionsHelper, AdvancedAssertionsHelper, Logger). Generates all 4 TAF layers, then polishes the output. | `tests/generated/<Module>/tc-<key>-<name>.spec.ts` | `polish-generated-code` |
| — | **brd-full-pipeline** | `/brd-full-pipeline` | Shortcut with flexible entry: auto-invokes `setup-workspace` if needed, detects the correct starting phase from the input or filesystem state, and runs through Phase 4. Supports `from brd`, `from stories`, `from test-cases` keywords and auto-detects pasted User Stories (US-* markers) or Test Cases (TC-* markers). | User Stories + Test Cases + Playwright specs, polished and committed | `polish-generated-code` → branch & commit |

---

## Group 2 — TAF Self-Healing Migration Pipeline

Converts existing raw Playwright tests into the self-healing POM architecture. Each skill automatically triggers the next — or use `/taf-full-pipeline` to run the entire chain from a single command.

```
/taf-full-pipeline  ──────────────────────────────────── single entry point
        │
        ▼ (auto-detects starting step)
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
| 1 | **create-page-locators** | `/create-page-locators [page]` | Scans all test files to extract every `page.locator()`, `getByRole()`, `getByLabel()`, etc. call, groups them by page, and writes `src/locators/<page>-page-locators.ts` for each. Pass a page name to restrict to one module. | `src/locators/<page>-page-locators.ts` — `satisfies Record<string, LocatorDefinition>` files | `create-selfhealing-page` |
| 3 | **create-selfhealing-page** | `/create-selfhealing-page [page]` | Run after locator files exist. Creates `src/pages/<page>-self-healing.ts` (or appends missing methods to existing files). Performs semantic dedup before adding methods. | `src/pages/<page>-self-healing.ts` — typed action and assertion methods, `SelfHealingLocator` wiring | `register-page-in-pom` |
| 4 | **register-page-in-pom** | `/register-page-in-pom` | Run after page classes exist. Discovers all `*PageSelfHealing` classes in `src/pages/`, checks which are already registered, and adds missing ones to `pom-lazy-self-healing.ts`. | Updated `pom-lazy-self-healing.ts` | `migrate-test-to-selfhealing` |
| 5 | **migrate-test-to-selfhealing** | `/migrate-test-to-selfhealing [pattern]` | Run after POM is registered. Migrates all (or a subset of) test specs to the self-healing fixture pattern. | Migrated specs in `tests/generated/<Module>/tc-<key>-<name>.spec.ts` | `polish-generated-code` |
| 6 | **polish-generated-code** | `/polish-generated-code` | Final cleanup pass — runs automatically after migration, or invoke standalone at any time. Fixes stray backslash-escapes in specs, scaffolds missing page methods, extracts inline locators, and re-orders page class methods. | Cleaned `src/locators/`, `src/pages/`, and `tests/generated/` files | Branch & commit (Step 7) |
| 7 | *(branch & commit)* | auto | Runs automatically after Polish. Creates `taf/<module>` branch and commits all TAF artifacts. | `taf/<module>` branch with all artifacts committed | — |

---

## Group 3 — BRD → Jira Pipeline

Required env vars: `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_PROJECT_KEY`
(Account must have Issues read/write and Link Issues permission in Jira.)
Jira push phases are **skipped gracefully** if env vars are not set.

```
/jira-full-pipeline  ──────────────────────── single entry point
        │
        ▼ PHASE 0 — workspace + Jira env check
[setup-workspace]  +  Jira env validation
        ↓
Phase 0.5 — Entry Point Detection (same 3-tier logic as brd-full-pipeline)
        ↓
Phase 1    BRD → User Stories   (local save → stories/<name>.md)
        ↓  auto-continues
Phase 1.5  jira-uss-to-tcs      (Jira Story issues + Jira_IDs.json)
        ↓  auto-continues
Phase 2    User Stories → Test Cases   (local save → test_cases/<name>.md)
        ↓  auto-continues
Phase 2.5  tcs-to-jira          (Jira Epic + Task issues + Tests links)
        ↓  auto-continues
Phase 3    Test Cases → Playwright     (local save + run)
        ↓  auto-chains
Phase 3.5  polish-generated-code
        ↓  auto-chains
Phase 4    Git branch & commit   (includes Jira mapping JSON files)
```

| # | Skill | Invoke | Output | Chains Into |
|---|-------|--------|--------|-------------|
| — | **jira-full-pipeline** | `/jira-full-pipeline` | All local files + Jira issues + branch | Full chain |
| 1 | **brd-to-uss** | `/brd-to-uss` | `stories/<name>_UserStories.md` | — |
| 1.5 | **jira-uss-to-tcs** | `/jira-uss-to-tcs <FeatureName> [--save-local] [--local-only]` | Jira Test Case issues + `test_cases/<name>_Jira_TCs.json` + `config/testCaseFilter.ts` patched. `--save-local` also writes `test_cases/<name>_TestCases.md`. `--local-only` saves all three local files and skips all Jira writes. | Step 5.5 auto-appends new TC keys to `config/testCaseFilter.ts` (skipped for `--local-only`) |
| 2 | **uss-to-tcs** | `/uss-to-tcs` | `test_cases/<name>_TestCases.md` | — |
| 2.5 | **tcs-to-jira** | `/tcs-to-jira <FeatureName>` | Jira Epic + Task issues + `test_cases/<name>_Jira_TCs.json` | Requires `stories/<name>_Jira_IDs.json`; use `--no-link` workaround when mapping is absent |
| 3 | **tcs-to-plscript** | `/tcs-to-plscript` | POM + spec + PR | `polish-generated-code` |

---

## Group 4 — Jira-First Pipeline (Jira TCs → Playwright)

Use this group when test cases already exist in Jira and you want to generate
or regenerate Playwright scripts directly from them — no BRD, no local markdown needed.

```text
config/testCaseFilter.ts  (module name → Jira issue keys)
        │
        ▼
/jira-tcs-to-plscript  ──────── single entry point
        │  fetches TCs from Jira, generates 4 TAF layers
        ↓  auto-chains
polish-generated-code
```

| Skill | Invoke | Output | Notes |
|-------|--------|--------|-------|
| **jira-tcs-to-plscript** | `/jira-tcs-to-plscript [module or all]` | Locators + page class + POM + specs | TC keys must be in `config/testCaseFilter.ts`; auto-chains to `polish-generated-code` |

### Going from Jira User Stories → Playwright scripts

No manual steps required. `jira-uss-to-tcs` Step 5.5 auto-patches `config/testCaseFilter.ts`:

```text
1.  /jira-uss-to-tcs <feature-tag-or-keys>
        └─ Creates TCs in Jira
        └─ Saves test_cases/<FeatureName>_Jira_TCs.json
        └─ Step 5.5: patches config/testCaseFilter.ts (append-only)

2.  /jira-tcs-to-plscript <module-name>
        └─ Fetches TCs from Jira → generates Playwright scripts → Polish
```

---

## Group 5 — Multi-AI TC Workflow (Claude + OpenAI → Jira + Playwright)

Use this group when you want to generate Test Cases with **two AI models** (Claude and OpenAI)
from the same Jira User Stories, merge the results into one deduplicated set, then produce
both Jira issues **and** runnable Playwright automation scripts.

```text
Jira User Stories
        │
        ▼ Step 1 — generate TCs with Claude (local only, no Jira write)
/jira-uss-to-tcs <FeatureName> --local-only
        └─ Fetches Stories from Jira (read-only)
        └─ Generates TCs in memory with Claude
        └─ Saves: test_cases/<FeatureName>_TestCases.md       ← Claude TCs
        └─ Saves: test_cases/<FeatureName>_Jira_TCs.json      (jiraKey: null)
        └─ Saves: stories/<FeatureName>_Jira_IDs.json         (real Story keys)
        │
        ▼ Step 2 — generate TCs with OpenAI [external / manual step]
        └─ Feed same Stories to OpenAI
        └─ Save output as: test_cases/<FeatureName>_TestCases_OpenAI.md
        │
        ▼ Step 3 — merge both TC sets
/merge-tc-sets <FeatureName> test_cases/<FeatureName>_TestCases_OpenAI.md
        └─ Claude TCs = primary source (kept as-is)
        └─ OpenAI unique TCs appended; near-duplicates removed
        └─ Writes merged: test_cases/<FeatureName>_TestCases.md
        │
        ▼ Step 4 — push merged TCs to Jira (creates Epic + Task issues)
/tcs-to-jira <FeatureName>
        └─ Reads merged test_cases/<FeatureName>_TestCases.md
        └─ Reads stories/<FeatureName>_Jira_IDs.json  (saved in Step 1)
        └─ Creates: Jira Epic + Task issues with Tests links
        └─ Saves: test_cases/<FeatureName>_Jira_TCs.json  (real Jira TC keys)
        │
        ▼ Step 5 — generate Playwright automation scripts
/tcs-to-plscript <FeatureName>
        └─ Reads merged test_cases/<FeatureName>_TestCases.md
        └─ Generates: locators, self-healing page class, POM registration, spec files
        └─ Auto-chains to polish-generated-code
```

| Step | Skill | Invoke | Output |
|------|-------|--------|--------|
| 1 | **jira-uss-to-tcs** | `/jira-uss-to-tcs <FeatureName> --local-only` | `test_cases/*_TestCases.md` + `*_Jira_TCs.json` (null) + `stories/*_Jira_IDs.json` (real keys) |
| 2 | *(external)* | OpenAI / manual | `test_cases/<FeatureName>_TestCases_OpenAI.md` |
| 3 | **merge-tc-sets** | `/merge-tc-sets <FeatureName> test_cases/<FeatureName>_TestCases_OpenAI.md` | Merged `test_cases/*_TestCases.md`; updated `*_Jira_TCs.json` |
| 4 | **tcs-to-jira** | `/tcs-to-jira <FeatureName>` | Jira Epic + Task issues; `test_cases/*_Jira_TCs.json` with real keys |
| 5 | **tcs-to-plscript** | `/tcs-to-plscript <FeatureName>` | Playwright locators + page class + POM + specs → auto-chains to `polish-generated-code` |

### Key properties

- **No manual file creation** — `stories/<FeatureName>_Jira_IDs.json` is saved automatically
  by `--local-only` in Step 1, so `tcs-to-jira` in Step 4 can resolve `Tests` links
  without any extra setup.
- **Deduplication is safe** — `merge-tc-sets` keeps Claude TCs unchanged; only unique
  OpenAI TCs are added. Near-duplicates (title similarity ≥ 0.80) are silently discarded.
- **Both outputs produced** — Step 4 creates Jira issues; Step 5 creates Playwright
  scripts. Both read the same merged markdown so coverage is identical.
- **Idempotent** — each skill has its own guard; re-running a step that already completed
  warns before overwriting.

---

## Standalone Utility Skills

| Skill | Invoke | Target / When to Use | Output |
|-------|--------|----------------------|--------|
| **analyze-trace** | `/analyze-trace [trace path or TC-ID]` | A test is failing and you have a `trace.zip` in `test-results/`. Parses the binary `.trace` event stream, reconstructs the step timeline, classifies the root cause into one of 9 failure categories, and applies the minimal fix. | Failure report + targeted fix applied to `src/locators/` or `src/pages/` file |
| **execute-and-fix-tests** | `/execute-and-fix-tests [path or pattern]` | A test (or set of tests) is failing and you want to run, inspect, fix, and re-run in one command. | Fixed `src/locators/`, `src/pages/`, and/or `tests/generated/` files + final pass/fail report |
| **merge-tc-sets** | `/merge-tc-sets <FeatureName> [FileA] [FileB] [--keep-both]` | Two TC markdown files exist for the same feature (e.g. one from Claude, one from OpenAI). Deduplicates by TC ID and title similarity (≥ 0.80 Levenshtein). | Merged `test_cases/<FeatureName>_TestCases.md` + updated `test_cases/<FeatureName>_Jira_TCs.json` |
| **describe-and-flatten-json-data** | `/describe-and-flatten-json-data [file, glob, or module]` | A data-driven spec is missing a `test.describe` wrapper, or loops over a `test-data/*.json` file that turns out to hold only one row. Adds the wrapper unconditionally; flattens the loop to direct indexed access only when the JSON provably represents a single case — multi-row JSON that drives multiple distinct test cases is left untouched so coverage never shrinks. | Restructured spec file(s) + per-file summary of what changed vs. what was skipped and why |

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
| Turn a BRD into User Stories | `/brd-to-uss` |
| Turn User Stories into Manual Test Cases | `/uss-to-tcs` |
| Turn Manual Test Cases into Playwright specs | `/tcs-to-plscript` |
| Do all of BRD → Playwright in one command | `/brd-full-pipeline` |
| Run the full TAF migration in one command (ends with branch & commit) | `/taf-full-pipeline` |
| Check TAF pipeline state without running | `/taf-full-pipeline status` |
| Extract locators from existing tests | `/create-page-locators` |
| Generate self-healing page objects | `/create-selfhealing-page` |
| Register new page objects in the POM | `/register-page-in-pom` |
| Migrate existing tests to the self-healing pattern | `/migrate-test-to-selfhealing` |
| Add test.step() to all page object methods | `/add-teststep-hooks` |
| Add a test.describe wrapper and flatten single-case JSON data access | `/describe-and-flatten-json-data` |
| Add a new method to an existing page object | `/add-method-to-page` |
| Clean up / fix issues in generated code | `/polish-generated-code` |
| Run failing tests, live-fix them, and re-run until green | `/execute-and-fix-tests` |
| Debug a failing test from its trace file | `/analyze-trace` |
| Push User Stories to Jira | `/jira-uss-to-tcs <FeatureName>` |
| Push User Stories to Jira and save TCs locally | `/jira-uss-to-tcs <FeatureName> --save-local` |
| Fetch Jira Stories → generate TCs → save locally (no Jira write) | `/jira-uss-to-tcs <FeatureName> --local-only` |
| Merge two TC sets (Claude + OpenAI) into one deduplicated file | `/merge-tc-sets <FeatureName> <FileA> <FileB>` |
| Push Test Cases to Jira (Epic + Task issues) | `/tcs-to-jira <FeatureName>` |
| Generate Playwright scripts from Jira TCs (single module) | `/jira-tcs-to-plscript <ModuleName>` |
| Generate Playwright scripts from Jira TCs (all active modules) | `/jira-tcs-to-plscript` |
| Jira Stories → Playwright scripts | `/jira-uss-to-tcs` then `/jira-tcs-to-plscript` |
| BRD → Jira + Playwright in one command | `/jira-full-pipeline` |
| Jira pipeline from existing stories | `/jira-full-pipeline from stories <FeatureName>` |
| Jira pipeline from existing test cases | `/jira-full-pipeline from test-cases <FeatureName>` |
| Check Jira pipeline state | `/jira-full-pipeline status <FeatureName>` |
