# tcs-to-ado

## What it does

Reads one or more locally saved `test_cases/<FeatureName>_TestCases.md` files and the
corresponding `stories/<FeatureName>_ADO_IDs.json` mappings produced by `ado-uss-to-tcs`,
then creates **Test Case work items** in Azure DevOps with properly formatted step XML.
Each Test Case is linked to its parent User Story work item via the `TestedBy` relationship.

Before creating any TC work items, the skill fetches all Test Case work items already linked
to each User Story from ADO (via **any** relation type — not limited to "Tests"), deduplicates
them by ID, and skips any local TC whose title is already covered by an existing ADO TC
(similarity ≥ 0.80). This prevents duplicate work items on re-runs or when TCs were previously
pushed via `ado-uss-to-tcs`.

**Test Plan + Suite creation is opt-in** — pass `--plan-name "..."` to enable it. When provided:

- The skill searches ADO for an existing plan with that exact name
- If found → the plan is reused and one Static Suite is created per User Story under it
- If not found → the user is asked to confirm creation before anything is created
- If `--plan-name` is omitted → TCs are created as standalone work items with no plan or suite

---

## Input

| Variable | Description |
| -------- | ----------- |
| `{{feature_names_or_path}}` | *(Optional)* One or more space-separated feature names. If omitted, auto-detects all paired files. `--plan-name "..."` opts in to Test Plan operations. |

### Invocation forms

```text
/tcs-to-ado                                                          — auto-detect; no plan
/tcs-to-ado PL-InstrumentConfig                                      — single feature; no plan
/tcs-to-ado PL-InstrumentConfig PL-PlateLayout                       — multi-feature; no plan
/tcs-to-ado PL-InstrumentConfig PL-PlateLayout --plan-name "Sprint 5 Regression"
```

### Required local files (must pre-exist per feature)

| File | Produced by |
| ---- | ----------- |
| `test_cases/<FeatureName>_TestCases.md` | `/uss-to-tcs` or `/brd-full-pipeline` |
| `stories/<FeatureName>_ADO_IDs.json` | `/ado-uss-to-tcs` |

### ADO credentials — sourced from `.env` at project root

| Variable | Description |
| -------- | ----------- |
| `AZURE_DEVOPS_ORG_URL` | e.g. `https://dev.azure.com/your-org` |
| `AZURE_PROJECT_NAME` | Your ADO project name |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT with Work Items read/write; Test Plans read/write required when `--plan-name` is used |

> **Note:** Credentials are read directly from `.env` — no shell environment variables required.

---

## Steps

### Step 1 — Validate Prerequisites

**1a. Resolve feature names and plan mode** — parses `{{feature_names_or_path}}`:

| Mode | Trigger | Behavior |
| ---- | ------- | -------- |
| **A — Single feature** | 1 feature name provided | Backward-compatible: fail-fast if either file is missing |
| **B — Multi-feature explicit** | 2+ feature names provided | Skip + warn on missing files; continue with valid features |
| **C — Auto-detect all** | No args provided | Intersect all `*_ADO_IDs.json` + `*_TestCases.md`; process all matches |

`--plan-name "..."` sets `PlanMode = true`. Without it `PlanMode = false` (no plan/suite operations).

**1b. Check required files** — in single-feature mode, fails fast with a clear message if either
`TestCases.md` or `ADO_IDs.json` is missing. In multi-feature mode, skips that feature with a
warning and continues.

**1c. Load ADO credentials from `.env`** — extracts `AZURE_DEVOPS_ORG_URL`,
`AZURE_PERSONAL_ACCESS_TOKEN`, and `AZURE_PROJECT_NAME`. Stops if any are missing or empty.

**1d. Idempotency** — silently overwrites each `test_cases/<FeatureName>_ADO_TCs.json` that
already exists. Prints a validation summary.

**1e. Plan resolution** *(only when `--plan-name` was provided)*:

1. Runs a short-lived `tcs_plan_search.js` script that calls `testPlanApi.getPlans(project)` and
   searches for a case-insensitive name match
2. **Match found** → plan is reused (`USE_EXISTING #<id>`)
3. **No match** → user is asked to confirm creation via `AskUserQuestion`
   - Confirmed → `CREATE_NEW`
   - Declined → `PlanMode = false` (TCs created standalone)
4. Script is deleted immediately after running

---

### Step 2 — Parse Test Cases Files

For each valid feature, reads its `_TestCases.md` and extracts structured data:

| Field | Source |
| ----- | ------ |
| `parentStoryId` | `### Story: US-<N>` heading |
| `tcId` | `**Test Case ID:** TC-<ID>` |
| `title` | remainder of the TC ID line |
| `type` | `**Type:**` |
| `preconditions` | `**Preconditions:**` → goes into `System.Description` |
| `tags[]` | `**Tags:**` split on `;`, trimmed (e.g. `@Smoke`, `@Regression`, `@automation`) → merged into `System.Tags`; defaults to `[]` if absent |
| `steps[]` | numbered items under `**Steps:**` |
| `expectedResult` | `**Expected Result:**` → carried by the last step only |

ADO step XML rules:

- `<steps>` element always has `id="0"` and `last="<lastStepId>"`
- Step ids start at `2` and increment by 1
- All steps except the last have an empty second `<parameterizedString>`
- Only the last step carries `<expectedResult>` in the second `<parameterizedString>`
- Preconditions go into `System.Description`, never into step XML

Prints a per-feature parsed summary before making any API calls.

---

### Step 2.5 — Fetch Existing Linked Test Cases from ADO

Runs automatically after Step 2, once per feature. For each feature in `ValidFeatureList`:

1. Extracts US ADO IDs from the already-loaded `usIdMapping[F].mapping`
2. Writes and runs `<FeatureName>_fetch_existing_tcs.js` — expands **all** relations per US
   (regardless of type), batch-fetches linked work items, keeps only those of type `Test Case`,
   and deduplicates by ID
3. Compares each parsed TC's title against existing ADO TC titles using normalised title
   similarity (≥ 0.80 Levenshtein threshold — same algorithm used by `merge-tc-sets`)
4. Marks matched TCs as `SKIP` — they are excluded from Step 3 entirely

```text
Step 2.5 — Existing ADO TCs for PL-InstrumentConfig:
  TC-Valid_Instrument_Listing  → ALREADY IN ADO (#67890) — skipping
  TC-Invalid_Missing_Name      → new — will create
Skipping 1 TC already in ADO; creating 1 new TC.
```

If all TCs for a feature are already in ADO, that feature is skipped in Step 3 with a clear
message. The temp file `tmp_existing_tcs_<FeatureName>.json` is deleted immediately after
the check, before the next feature is processed.

---

### Step 3 — Generate and Run ADO Script

Generates and runs `tcs_to_ado_run.js` **once per feature** (project root, overwritten each
iteration) to stay within output-token limits.

Plan handling — one of three modes injected by the skill before script generation:

| `planMode` | What happens |
| ---------- | ------------ |
| `NONE` | No plan/suite code at all — TCs created standalone |
| `USE_EXISTING` | `resolvedPlanId` injected directly; plan is never created |
| `CREATE_NEW` | First feature creates the plan + writes `tcs_plan_id.json`; subsequent features read it |

Per-feature script actions:

- Resolves `testPlanId` per the mode above
- Creates **TC work items** with step XML and a `TestedBy-Reverse` link to the parent User Story
- When `testPlanId !== null`: creates one **Static Test Suite per User Story** under the shared
  plan (keyed from `usIdMapping.mapping`; suites are skipped for USs with no TCs in this run)
- Adds each US's TCs to its respective suite
- Saves `test_cases/<FeatureName>_ADO_TCs.json` with `testPlanId` + `suites[]` (one entry per US)

TC creation errors are accumulated per-script; remaining features are still processed even if an
earlier script exits with code 1.

> **API note:** Uses `getTestPlanApi()` (not the deprecated `getTestApi()`). The `orgUrl`
> trailing slash is normalised before all URL joins.

---

### Step 4 — Report and Cleanup

Prints per-feature summary blocks followed by a grand total:

```text
tcs-to-ado — Complete

ADO Test Plan  : N/A (--plan-name not provided)
  — OR —
ADO Test Plan  : #301 — "Sprint 5 Regression"  [REUSED]
  — OR —
ADO Test Plan  : #301 — "Sprint 5 Regression"  [CREATED]

Feature: PL-InstrumentConfig
  Suite: #302 — US-PL-InstrumentConfig-IC-001:_...  (3 TCs)   [CREATED]
  Suite: #303 — US-PL-InstrumentConfig-IC-002:_...  (2 TCs)   [CREATED]

  Test Case                    ADO WI  Parent US                      Parent ADO  Status
  ──────────────────────────────────────────────────────────────────────────────────────
  TC-Valid_Instrument_Listing  #67890  US-PL-InstrumentConfig-IC-001  #5692       Created + Linked
  TC-Missing_Name_Required     #67891  US-PL-InstrumentConfig-IC-001  #5692       Created + Linked
  ──────────────────────────────────────────────────────────────────────────────────────
  Subtotal: 2 created, 0 failed
  Mapping saved: test_cases/PL-InstrumentConfig_ADO_TCs.json

...

Grand Total: T created, E failed across F features
```

Cleans up `tcs_to_ado_run.js` and `tcs_plan_id.json` from the project root.
(`tcs_plan_search.js` was already deleted in Step 1e.)

---

## All artifacts produced

| Artifact | Location | Description |
| -------- | -------- | ----------- |
| TC mapping JSON *(one per feature)* | `test_cases/<FeatureName>_ADO_TCs.json` | Maps TC IDs to ADO WI IDs; records `testPlanId` + `suites[]` per US |
| Test Plan | Azure DevOps *(only when `--plan-name` provided and confirmed)* | Reused existing plan or newly created; one per invocation |
| Test Suite *(one per User Story)* | Azure DevOps *(only when plan is active)* | Static suite named by US slug, under the shared Test Plan |
| Test Case work items | Azure DevOps | With step XML and TestedBy links to parent User Stories |

---

## Error handling

- **Single-feature mode fails fast** if `TestCases.md` or `ADO_IDs.json` is missing — provides the command needed to generate the missing file
- **Multi-feature mode skips** features with missing files (warn + continue); only stops if all features are invalid
- Stops with a clear message if any required ADO credential is missing from `.env`
- **Idempotency** — silently overwrites each TC mapping file on re-runs
- **Plan/Suite creation is never attempted without `--plan-name`** — fully opt-in
- **Plan not found + user declines** → TCs are still created as standalone work items
- **Plan search failure** → warns and falls back to `PlanMode = false`; TC creation continues
- **Suite creation failure** is non-fatal — logged as a warning; TCs still created as work items
- **`addTestCasesToSuite` is skipped per-US** if that US's suite creation failed
- **Graceful parent US link failure** — TC is still created without a link; gap is clearly logged
- **TC creation errors are accumulated per-feature script** — remaining features always run even if an earlier script exits with code 1
- **TCs already in ADO** (linked to their parent US via any relation type, title similarity ≥ 0.80) are silently skipped per-feature; remaining new TCs in the same feature are still created
- No auto-chaining — the orchestrator (`ado-full-pipeline`) controls sequencing

---

## Known limitation — Test Plan license

The `TestPlanApi` requires the PAT-owner account to have a **"Basic + Test Plans"** access level
in ADO (not just "Basic"). If the account has only a Basic license, plan/suite creation fails
with a 403 warning and TC work items are created as standalone items.

To enable full Test Plan creation:

1. Go to `https://dev.azure.com/<org>/_settings/users`
2. Find the account that owns the PAT
3. Change access level to **Basic + Test Plans**

---

## Known limitation — missing US mapping file

`tcs-to-ado` requires `stories/<FeatureName>_ADO_IDs.json` to link Test Cases to their parent
User Stories. In single-feature mode this causes an immediate stop; in multi-feature mode that
feature is skipped.

Workarounds (ranked by effort):

| Option | Effort | How |
| ------ | ------ | --- |
| Run `/ado-uss-to-tcs <feature-tag>` first | Low | Fetches existing ADO USs and generates the mapping automatically |
| Create the mapping JSON manually | Medium | `{ "feature": "X", "mapping": { "US-X-Story1": 12345 }, "errors": [] }` |

---

## When to use this vs. related skills

| Scenario | Use |
| -------- | --- |
| Have local TestCases.md files + US ADO IDs, want to push to ADO | `tcs-to-ado` |
| Have local TestCases.md but no US mapping file | Run `/ado-uss-to-tcs` first, then `tcs-to-ado` |
| Need to fetch USs from ADO, generate TCs, and push all back | `ado-uss-to-tcs` |
| Full BRD → local files + ADO in one command | `ado-full-pipeline` |
| Generate Playwright scripts from local Test Cases | `tcs-to-plscript` |

---

## Complete flow

```text
{{feature_names_or_path}} (auto-detected if not provided)
      │
      ▼ Step 1a — parse args · three-branch dispatch (A/B/C)
      │            check files · load .env creds · idempotency · print validation summary
      │
      ▼ Step 1e — [only if --plan-name provided]
      │            run tcs_plan_search.js → FOUND #<id> or NOT_FOUND
      │            FOUND    → PlanAction = USE_EXISTING
      │            NOT_FOUND → AskUserQuestion → confirmed → CREATE_NEW
      │                                        → declined  → PlanMode = false
      │
      ▼ Step 2 — for each valid feature: parse TestCases.md → testCases[] with step XML
      │           load ADO_IDs.json → usIdMapping  (accumulated per feature)
      │
      ▼ Step 2.5 — for each feature: fetch existing linked TCs from ADO ──► tmp_existing_tcs_<F>.json
      │             expand all relations (any type) per US; deduplicate by ID
      │             compare parsed TCs vs existing by title similarity (≥ 0.80)
      │             mark matched TCs as SKIP; delete temp file immediately after check
      │             features where ALL TCs are SKIP → excluded from Step 3
      │
      ▼ Step 3 — for each feature (non-SKIP only): generate + run tcs_to_ado_run.js (overwritten per iteration)
      │             planMode = NONE:
      │               └─ Create TC work items ──────────────────────► ADO Test Case WIs (standalone)
      │             planMode = USE_EXISTING / CREATE_NEW:
      │               ├─ Resolve testPlanId (reuse or create)
      │               ├─ For each US in usIdMapping:
      │               │    ├─ Create Static Suite ────────────────────► ADO Test Suite #<id> (per US)
      │               │    └─ Add that US's TCs to suite
      │               ├─ Create TC work items (loop) ─────────────────► ADO Test Case WIs
      │               │    + TestedBy link to parent US
      │               └─ Save TC mapping JSON ──────────────────────►  test_cases/<FeatureName>_ADO_TCs.json
      │
      ▼ Step 4 — per-feature report blocks + grand total
                 cleanup: rm tcs_to_ado_run.js tcs_plan_id.json
```
