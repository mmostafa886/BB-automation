# tcs-to-jira

## File structure

| File | Purpose |
| --- | --- |
| `SKILL.md` | Overview, role/persona, safety rule, execution checklist, step outline with links |
| `WORKFLOW.md` | Full step-by-step execution detail for Steps 1, 1e, 2, 2.5, 3, 4 |
| `SCRIPTS.md` | Full Node.js script templates (`tcs_epic_search.js`, `<F>_fetch_existing_tcs.js`, `tcs_to_jira_run.js`) |
| `README.md` | This file — human-facing overview |

---

## What it does

Reads one or more locally saved `test_cases/<FeatureName>_TestCases.md` files and the
corresponding `stories/<FeatureName>_Jira_IDs.json` mappings produced by `jira-uss-to-tcs`,
then creates **Test Case issues** in Jira (as `Task` issue type by default) with properly
formatted ADF description steps.
Each Test Case is linked to its parent User Story issue via the `Tests` issue link type.

Before creating any TC issues, the skill fetches all Test Case issues already linked
to each User Story from Jira (via **any** link type), deduplicates them by key, and skips
any local TC whose title is already covered by an existing Jira TC issue (similarity ≥ 0.80).
This prevents duplicate issues on re-runs or when TCs were previously pushed via `jira-uss-to-tcs`.

**Epic creation (Test Plan equivalent) + label grouping is opt-in** — pass `--epic-name "..."` to enable it. When provided:

- The skill searches Jira for an existing Epic with that exact summary name
- If found → the Epic is reused and TCs are labelled for grouping under it per User Story
- If not found → the user is asked to confirm creation before anything is created
- If `--epic-name` is omitted → TCs are created as standalone issues with no Epic or label grouping

---

## Input

| Variable | Description |
| -------- | ----------- |
| `{{feature_names_or_path}}` | *(Optional)* One or more space-separated feature names. If omitted, auto-detects all paired files. `--epic-name "..."` opts in to Epic (Test Plan) operations. |

### Invocation forms

```text
/tcs-to-jira                                                          — auto-detect; no epic
/tcs-to-jira PL-InstrumentConfig                                      — single feature; no epic
/tcs-to-jira PL-InstrumentConfig PL-PlateLayout                       — multi-feature; no epic
/tcs-to-jira PL-InstrumentConfig PL-PlateLayout --epic-name "Sprint 5 Regression"
```

### Required local files (must pre-exist per feature)

| File | Produced by |
| ---- | ----------- |
| `test_cases/<FeatureName>_TestCases.md` | `/uss-to-tcs` or `/brd-full-pipeline` |
| `stories/<FeatureName>_Jira_IDs.json` | `/jira-uss-to-tcs` |

### Jira credentials — sourced from `.env` at project root

| Variable | Description |
| -------- | ----------- |
| `JIRA_BASE_URL` | e.g. `https://your-org.atlassian.net` |
| `JIRA_EMAIL` | Jira account email (used for Basic auth with API token) |
| `JIRA_API_TOKEN` | Jira API token with Issues read/write scope |
| `JIRA_PROJECT_KEY` | e.g. `BB` |
| `JIRA_TC_ISSUE_TYPE` | Issue type for TC issues (default: `Task`) |

> **Note:** Credentials are read directly from `.env` — no shell environment variables required.

---

## Steps

### Step 1 — Validate Prerequisites

**1a. Resolve feature names and epic mode** — parses `{{feature_names_or_path}}`:

| Mode | Trigger | Behavior |
| ---- | ------- | -------- |
| **A — Single feature** | 1 feature name provided | Backward-compatible: fail-fast if either file is missing |
| **B — Multi-feature explicit** | 2+ feature names provided | Skip + warn on missing files; continue with valid features |
| **C — Auto-detect all** | No args provided | Intersect all `*_Jira_IDs.json` + `*_TestCases.md`; process all matches |

`--epic-name "..."` sets `EpicMode = true`. Without it `EpicMode = false` (no Epic/label-grouping operations).

**1b. Check required files** — in single-feature mode, fails fast with a clear message if either
`TestCases.md` or `Jira_IDs.json` is missing. In multi-feature mode, skips that feature with a
warning and continues.

**1c. Load Jira credentials from `.env`** — extracts `JIRA_BASE_URL`, `JIRA_EMAIL`,
`JIRA_API_TOKEN`, and `JIRA_PROJECT_KEY`. Stops if any are missing or empty.

**1d. Idempotency** — silently overwrites each `test_cases/<FeatureName>_Jira_TCs.json` that
already exists. Prints a validation summary.

**1e. Epic resolution** *(only when `--epic-name` was provided)*:

1. Runs a short-lived `tcs_epic_search.js` script that calls `GET /rest/api/3/search?jql=...` and
   searches for a case-insensitive summary match among Epics
2. **Match found** → Epic is reused (`USE_EXISTING <key>`)
3. **No match** → user is asked to confirm creation via `AskUserQuestion`
   - Confirmed → `CREATE_NEW`
   - Declined → `EpicMode = false` (TCs created standalone)
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
| `preconditions` | `**Preconditions:**` → goes into ADF description paragraph |
| `tags[]` | `**Tags:**` split on `;`, trimmed (e.g. `@Smoke`, `@Regression`, `@automation`) → applied as Jira labels; defaults to `[]` if absent |
| `steps[]` | numbered items under `**Steps:**` |
| `expectedResult` | `**Expected Result:**` → appended as final paragraph in ADF description |

Jira ADF description rules:

- Preconditions are rendered as an opening paragraph: `"Preconditions: <text>"`
- Steps are rendered as an ADF ordered list
- Expected result is rendered as a closing paragraph: `"Expected Result: <text>"`
- No XML steps format — Jira uses ADF (Atlassian Document Format)

Prints a per-feature parsed summary before making any API calls.

---

### Step 2.5 — Fetch Existing Linked Test Case Issues from Jira

Runs automatically after Step 2, once per feature. For each feature in `ValidFeatureList`:

1. Extracts US Jira keys from the already-loaded `usKeyMapping[F].mapping`
2. Writes and runs `<FeatureName>_fetch_existing_tcs.js` — fetches all issue links per US
   (regardless of type), fetches linked issues, keeps only those of type `Task` / `Test Case`,
   and deduplicates by key
3. Compares each parsed TC's title against existing Jira TC titles using normalised title
   similarity (≥ 0.80 threshold — same algorithm used by `merge-tc-sets`)
4. Marks matched TCs as `SKIP` — they are excluded from Step 3 entirely

```text
Step 2.5 — Existing Jira TCs for PL-InstrumentConfig:
  TC-Valid_Instrument_Listing  → ALREADY IN JIRA (BB-67890) — skipping
  TC-Invalid_Missing_Name      → new — will create
Skipping 1 TC already in Jira; creating 1 new TC.
```

If all TCs for a feature are already in Jira, that feature is skipped in Step 3 with a clear
message. The temp file `tmp_existing_tcs_<FeatureName>.json` is deleted immediately after
the check, before the next feature is processed.

---

### Step 3 — Generate and Run Jira Script

Generates and runs `tcs_to_jira_run.js` **once per feature** (project root, overwritten each
iteration) to stay within output-token limits.

Uses the built-in Node.js `https` module — no external HTTP client dependencies.

Epic handling — one of three modes injected by the skill before script generation:

| `epicMode` | What happens |
| ---------- | ------------ |
| `NONE` | No epic/label-grouping code at all — TCs created standalone |
| `USE_EXISTING` | `resolvedEpicKey` injected directly; epic is never created |
| `CREATE_NEW` | First feature creates the Epic + writes `tcs_epic_key.json`; subsequent features read it |

Per-feature script actions:

- Resolves `epicKey` per the mode above
- Creates **TC issues** (`Task` by default, or `JIRA_TC_ISSUE_TYPE`) with ADF description and labels
- Creates a `Tests` issue link from each TC to its parent User Story: `POST /rest/api/3/issueLink`
- Applies labels for Epic association and US grouping when `epicMode !== 'NONE'`
- Saves `test_cases/<FeatureName>_Jira_TCs.json` with `epicKey` + `labelGroups` per US

TC creation errors are accumulated per-script; remaining features are still processed even if an
earlier script exits with code 1.

> **API note:** Uses Jira Cloud REST API v3 (`/rest/api/3/`). The `JIRA_BASE_URL`
> trailing slash is normalised before all URL joins via `new URL(path, base)`.

---

### Step 4 — Report and Cleanup

Prints per-feature summary blocks followed by a grand total:

```text
tcs-to-jira — Complete

Jira Epic (Test Plan): N/A (--epic-name not provided)
  — OR —
Jira Epic (Test Plan): BB-301 — "Sprint 5 Regression"  [REUSED]
  — OR —
Jira Epic (Test Plan): BB-301 — "Sprint 5 Regression"  [CREATED]

Feature: PL-InstrumentConfig
  Label grouping: epic-BB-301, US-PL-InstrumentConfig-IC-001  (3 TCs)
  Label grouping: epic-BB-301, US-PL-InstrumentConfig-IC-002  (2 TCs)

  Test Case                    Jira Key  Parent US                      Parent Jira  Status
  ──────────────────────────────────────────────────────────────────────────────────────────
  TC-Valid_Instrument_Listing  BB-67890  US-PL-InstrumentConfig-IC-001  BB-5692      Created + Linked
  TC-Missing_Name_Required     BB-67891  US-PL-InstrumentConfig-IC-001  BB-5692      Created + Linked
  ──────────────────────────────────────────────────────────────────────────────────────────
  Subtotal: 2 created, 0 failed
  Mapping saved: test_cases/PL-InstrumentConfig_Jira_TCs.json

...

Grand Total: T created, E failed across F features
```

Cleans up `tcs_to_jira_run.js` and `tcs_epic_key.json` from the project root.
(`tcs_epic_search.js` was already deleted in Step 1e.)

---

## All artifacts produced

| Artifact | Location | Description |
| -------- | -------- | ----------- |
| TC mapping JSON *(one per feature)* | `test_cases/<FeatureName>_Jira_TCs.json` | Maps TC IDs to Jira issue keys; records `epicKey` + `labelGroups` per US |
| Epic (Test Plan equivalent) | Jira *(only when `--epic-name` provided and confirmed)* | Reused existing Epic or newly created; one per invocation |
| TC issues | Jira | `Task` issues (or `JIRA_TC_ISSUE_TYPE`) with ADF description steps and `Tests` links to parent User Stories |

---

## Error handling

- **Single-feature mode fails fast** if `TestCases.md` or `Jira_IDs.json` is missing — provides the command needed to generate the missing file
- **Multi-feature mode skips** features with missing files (warn + continue); only stops if all features are invalid
- Stops with a clear message if any required Jira credential is missing from `.env`
- **Idempotency** — silently overwrites each TC mapping file on re-runs
- **Epic creation is never attempted without `--epic-name`** — fully opt-in
- **Epic not found + user declines** → TCs are still created as standalone issues
- **Epic search failure** → warns and falls back to `EpicMode = false`; TC creation continues
- **Issue link failure** is non-fatal — logged as a warning; TC issue still created without link
- **Graceful parent US link failure** — TC is still created without a link; gap is clearly logged
- **TC creation errors are accumulated per-feature script** — remaining features always run even if an earlier script exits with code 1
- **TCs already in Jira** (linked to their parent US via any link type, title similarity ≥ 0.80) are silently skipped per-feature; remaining new TCs in the same feature are still created
- No auto-chaining — the orchestrator (`jira-full-pipeline`) controls sequencing

---

## Note — "Tests" link type availability

The `POST /rest/api/3/issueLink` call uses `type: { name: 'Tests' }`. If your Jira instance
does not have a link type named "Tests", the link will fail with a 400 error (non-fatal).

To add or verify link types, a Jira admin can go to:
`<JIRA_BASE_URL>/secure/admin/ListLinkTypes.jspa`

Alternatively, use an existing link type name such as `"Relates"` by setting it in the script.

---

## Note — missing US mapping file

`tcs-to-jira` requires `stories/<FeatureName>_Jira_IDs.json` to link Test Cases to their parent
User Stories. In single-feature mode this causes an immediate stop; in multi-feature mode that
feature is skipped.

Workarounds (ranked by effort):

| Option | Effort | How |
| ------ | ------ | --- |
| Run `/jira-uss-to-tcs <feature-tag>` first | Low | Fetches existing Jira User Stories and generates the mapping automatically |
| Create the mapping JSON manually | Medium | `{ "feature": "X", "mapping": { "US-X-Story1": "BB-12345" }, "errors": [] }` |

---

## When to use this vs. related skills

| Scenario | Use |
| -------- | --- |
| Have local TestCases.md files + US Jira keys, want to push to Jira | `tcs-to-jira` |
| Have local TestCases.md but no US mapping file | Run `/jira-uss-to-tcs` first, then `tcs-to-jira` |
| Need to fetch USs from Jira, generate TCs, and push all back | `jira-uss-to-tcs` |
| Full BRD → local files + Jira in one command | `jira-full-pipeline` |
| Generate Playwright scripts from local Test Cases | `tcs-to-plscript` |

---

## Complete flow

```text
{{feature_names_or_path}} (auto-detected if not provided)
      │
      ▼ Step 1a — parse args · three-branch dispatch (A/B/C)
      │            check files · load .env creds · idempotency · print validation summary
      │
      ▼ Step 1e — [only if --epic-name provided]
      │            run tcs_epic_search.js → FOUND <key> or NOT_FOUND
      │            FOUND    → EpicAction = USE_EXISTING
      │            NOT_FOUND → AskUserQuestion → confirmed → CREATE_NEW
      │                                        → declined  → EpicMode = false
      │
      ▼ Step 2 — for each valid feature: parse TestCases.md → testCases[] with ADF descriptions
      │           load Jira_IDs.json → usKeyMapping  (accumulated per feature)
      │
      ▼ Step 2.5 — for each feature: fetch existing linked TC issues from Jira ──► tmp_existing_tcs_<F>.json
      │             expand all issue links (any type) per US; deduplicate by key
      │             compare parsed TCs vs existing by title similarity (≥ 0.80)
      │             mark matched TCs as SKIP; delete temp file immediately after check
      │             features where ALL TCs are SKIP → excluded from Step 3
      │
      ▼ Step 3 — for each feature (non-SKIP only): generate + run tcs_to_jira_run.js (overwritten per iteration)
      │             epicMode = NONE:
      │               └─ Create TC issues ──────────────────────► Jira Task issues (standalone)
      │             epicMode = USE_EXISTING / CREATE_NEW:
      │               ├─ Resolve epicKey (reuse or create Epic)
      │               ├─ For each US in usKeyMapping:
      │               │    └─ Apply labels for US grouping under Epic
      │               ├─ Create TC issues (loop) ─────────────────► Jira Task issues
      │               │    + "Tests" issue link to parent US
      │               └─ Save TC mapping JSON ──────────────────────►  test_cases/<FeatureName>_Jira_TCs.json
      │
      ▼ Step 4 — per-feature report blocks + grand total
                 cleanup: rm tcs_to_jira_run.js tcs_epic_key.json
```
