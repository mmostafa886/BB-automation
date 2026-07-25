# tcs-to-jira — Full Workflow

Reference file for `tcs-to-jira`. Linked from [SKILL.md](SKILL.md).
Contains the complete step-by-step execution detail. Script templates referenced below live in
[SCRIPTS.md](SCRIPTS.md).

---

## Table of contents

1. [Step 1 — Validate prerequisites](#step-1--validate-prerequisites)
2. [Step 1e — Epic resolution](#step-1e--epic-resolution-only-when-epicmode--true)
3. [Step 2 — Parse Test Cases files](#step-2--parse-test-cases-files)
4. [Step 2.5 — Fetch existing linked Test Cases from Jira](#step-25--fetch-existing-linked-test-cases-from-jira-per-feature)
5. [Step 3 — Generate and run Jira script](#step-3--generate-and-run-jira-script-per-feature-loop)
6. [Step 4 — Report and cleanup](#step-4--report-and-cleanup)

---

## STEP 1 — VALIDATE PREREQUISITES

### 1a. Resolve feature names and epic mode

Parse `{{feature_names_or_path}}` by splitting on whitespace:
- Tokens that do NOT start with `--` are feature names → `FeatureList[]`
- `--epic-name "..."` token (with its value) → `RequestedEpicName`

**EpicMode flag:**
```
If RequestedEpicName provided → EpicMode = true
Otherwise                     → EpicMode = false
```

When `EpicMode = false`: all Epic and label-grouping operations are skipped entirely.
TC issues are still created as standalone items.

**Three-branch dispatch (feature resolution — unchanged):**

**Case A — Single feature** (`FeatureList.length == 1`):
- Backward-compatible mode: fail-fast if either file is missing (same as old behavior)
- `ValidFeatureList = [FeatureList[0]]`

**Case B — Multiple features explicit** (`FeatureList.length > 1`):
- For each feature, check both files; skip + warn if either is missing; continue with the rest
- `ValidFeatureList = features that passed both checks`
- If `ValidFeatureList` is empty after checks: stop and report no valid features found

**Case C — Auto-detect all** (`FeatureList.length == 0`):
- Intersect: `ls stories/*_Jira_IDs.json` and `ls test_cases/*_TestCases.md`
- Extract base names (strip suffix), find intersection
- If no matches: stop and report no paired files found
- If one match: treat as Case A; if multiple matches: treat as Case B

For each `F` in `ValidFeatureList`, derive:
- `TestCasesFile[F]` = `test_cases/<F>_TestCases.md`
- `MappingFile[F]`   = `stories/<F>_Jira_IDs.json`
- `TCMappingFile[F]` = `test_cases/<F>_Jira_TCs.json`

### 1b. Check required files

**Case A:** fail-fast (stop immediately) if either file is missing:
```bash
ls test_cases/<FeatureName>_TestCases.md 2>/dev/null && echo "TC_OK"  || echo "TC_MISSING"
ls stories/<FeatureName>_Jira_IDs.json   2>/dev/null && echo "MAP_OK" || echo "MAP_MISSING"
```
- TC_MISSING  → `"test_cases/<FeatureName>_TestCases.md not found. Run /uss-to-tcs first."` Stop.
- MAP_MISSING → `"stories/<FeatureName>_Jira_IDs.json not found. Run /jira-uss-to-tcs first."` Stop.

**Case B/C:** for each feature in FeatureList, check both files; on missing file emit a warning
(`WARN: <file> not found — skipping <FeatureName>`) and exclude from `ValidFeatureList`.
If `ValidFeatureList` is empty after all checks: stop.

### 1c. Load Jira variables from .env

Read the project-root `.env` file and extract:
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`
- `JIRA_TC_ISSUE_TYPE` (default: `Task`)

These values must be sourced from `.env` — do **not** rely on shell environment variables.
Pass them explicitly into the generated Node script as inline constants (not via `process.env`).

If any of the first four are missing or empty in `.env`: report which are missing and stop.

### 1d. Idempotency

If any `test_cases/<F>_Jira_TCs.json` already exists for features in `ValidFeatureList`, **overwrite
silently** — do not warn or ask for confirmation.

Print a validation summary before proceeding to Step 1e:

```
Features to process: <N>
  ✓ PL-InstrumentConfig
  ✓ PL-PlateLayout
  ✗ PL-SolventRecords  SKIPPED — stories/PL-SolventRecords_Jira_IDs.json not found
Epic (Test Plan): N/A (no --epic-name provided)
  — OR —
Epic (Test Plan): "My Epic Name" → resolving in Step 1e…
```

---

## STEP 1e — EPIC RESOLUTION (only when EpicMode = true)

Skip this step entirely if `EpicMode = false`.

### 1e-i. Search for existing Epic

Write `tcs_epic_search.js` at the project root.

→ Script template: [SCRIPTS.md#epic-search-script-tcs_epic_searchjs](SCRIPTS.md#epic-search-script-tcs_epic_searchjs)

Run it:
```bash
node tcs_epic_search.js
```

Parse stdout:
- Output starts with `FOUND:<key>` → `ResolvedEpicKey = <key>`, `EpicAction = "USE_EXISTING"`
- Output is `NOT_FOUND` → proceed to 1e-ii
- Output is `SEARCH_FAILED` or script exits with code 1 → warn and set `EpicMode = false` (TC issues still created)

Delete the search script immediately after running:
```bash
rm -f tcs_epic_search.js
```

Print the resolved Epic status:
```
Epic (Test Plan): "My Epic Name" → USE_EXISTING <key>
  — OR —
Epic (Test Plan): "My Epic Name" → NOT FOUND in Jira — prompting user…
  — OR —
Epic (Test Plan): search failed (<error>) — epic/label grouping skipped, TCs created standalone
```

### 1e-ii. Epic not found — confirm with user

If `NOT_FOUND`, use `AskUserQuestion` to confirm:

> No Epic named **"<RequestedEpicName>"** was found in Jira project **<JIRA_PROJECT_KEY>**.
> Would you like to create a new Epic with this name to serve as the Test Plan container?

- **User confirms** → `EpicAction = "CREATE_NEW"`, `ResolvedEpicKey = null`
  - Print: `Epic (Test Plan): "<RequestedEpicName>" → CREATE_NEW (confirmed)`
- **User declines** → `EpicMode = false`
  - Print: `Epic (Test Plan): SKIPPED (declined by user) — TCs will be created as standalone issues`

**CRITICAL: Never create an Epic without explicit user confirmation.**

---

## STEP 2 — PARSE TEST CASES FILES

For **each** `F` in `ValidFeatureList`:

Read `test_cases/<F>_TestCases.md`.

Parse each block:
```
### Story: US-<FeatureName>-<USTitleSlug>
**Test Case ID:** TC-<TitleSlug>: <Title>
**Type:** <type>
**Preconditions:** <text>
**Steps:**
1. <action>
**Expected Result:** <text>
```

Extract: `parentStoryId` (full US ID after `### Story: `), `tcId` (full TC ID including `TC-` prefix), `title` (text after the `: ` in the TC ID line), `type`, `preconditions`, `tags[]` (split the `**Tags:**` line on `;`, trim whitespace — keep raw values including any `@` prefix; if the line is absent default to `[]`), `steps[]`, `expectedResult`.

Build plain-text description for Jira ADF format per test case:

```
Preconditions: <preconditions text>

Steps:
1. <step 1 action>
2. <step 2 action>
...
N. <last step action>

Expected Result: <expectedResult>
```

Encode this as an ADF document for the Jira `description` field:
```json
{
  "type": "doc",
  "version": 1,
  "content": [
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Preconditions: <preconditions>" }]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Steps:" }]
    },
    {
      "type": "orderedList",
      "content": [
        {
          "type": "listItem",
          "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "<step action>" }] }]
        }
      ]
    },
    {
      "type": "paragraph",
      "content": [{ "type": "text", "text": "Expected Result: <expectedResult>" }]
    }
  ]
}
```

Rules:
- All steps are rendered as an ordered list in the ADF description.
- Preconditions go into the description paragraph, not as a separate field.
- No XML steps format — Jira uses ADF (Atlassian Document Format).

Also read `stories/<F>_Jira_IDs.json` to load `usKeyMapping[F]`.

Accumulate `ParsedData[F] = { testCases[], usKeyMapping }` for all features.

Print parsed summary:
```
  PL-InstrumentConfig : <N> Test Cases across <M> User Stories  (US mapping: <K> keys)
  PL-PlateLayout      : <N> Test Cases across <M> User Stories  (US mapping: <K> keys)
Total: <T> Test Cases across <F> features
```

---

## STEP 2.5 — FETCH EXISTING LINKED TEST CASES FROM JIRA (PER-FEATURE)

Before creating any TC issues, discover Test Case issues already linked to each User Story in Jira
so that re-runs and incremental pushes never create duplicate issues.

Run this step **once per feature** in the same loop order as Step 3.

For each `F` in `ValidFeatureList`:

Write `<F>_fetch_existing_tcs.js` to the **project root** via the Write tool.

→ Script template: [SCRIPTS.md#fetch-existing-linked-tcs-script-f_fetch_existing_tcsjs](SCRIPTS.md#fetch-existing-linked-tcs-script-f_fetch_existing_tcsjs)

Run:
```bash
cd <project-root> && node <F>_fetch_existing_tcs.js
rm -f <F>_fetch_existing_tcs.js
```

Use the Read tool to read `tmp_existing_tcs_<F>.json`.

### Deduplication check

For each TC in `ParsedData[F].testCases`, compare its `title` against every existing TC's
`title` using normalised title similarity (strip articles/punctuation, lowercase, compare
word sets — same algorithm as `merge-tc-sets` Step 3). If similarity ≥ 0.80, mark the
parsed TC as `SKIP`.

Print a per-feature summary:

```
Step 2.5 — Existing Jira TCs for <F>:
  TC-Valid_Instrument_Listing  → ALREADY IN JIRA (BB-67890) — skipping
  TC-Invalid_Missing_Name      → new — will create
  TC-Boundary_Max_Wells        → new — will create
Skipping 1 TC already in Jira; creating 2 new TCs.
```

If **all** parsed TCs for a feature are marked `SKIP`:
```
All TCs already in Jira for <F> — skipping feature.
```
Remove that feature from the active set for Step 3 (no script is generated for it).

If `totalExisting === 0` for a feature, print:
```
Step 2.5 — No existing Test Case issues found for <F> — full push will run.
```

Delete the temp file immediately after the check:
```bash
rm -f tmp_existing_tcs_<F>.json
```

---

## STEP 3 — GENERATE AND RUN JIRA SCRIPT (PER-FEATURE LOOP)

To keep each script within output-token limits, generate and execute `tcs_to_jira_run.js`
**once per feature** in sequence, overwriting the file each iteration.

Only features **not fully skipped** by Step 2.5 are processed here.

```
For featureIndex = 0 to ValidFeatureList.length − 1:
  F       = ValidFeatureList[featureIndex]
  isFirst = (featureIndex === 0)

  // Use only TCs NOT flagged SKIP in Step 2.5
  Write tcs_to_jira_run.js at project root containing ONLY Feature F's non-SKIP TC data.
  Run:  node tcs_to_jira_run.js
  Print per-feature subtotal.
```

### Per-Feature Script Template

Write the script to the **project root** as `tcs_to_jira_run.js`
(do NOT use `/tmp` — on Windows it maps to AppData and breaks `require` resolution).

→ Script template: [SCRIPTS.md#per-feature-tc-creation-script-tcs_to_jira_runjs](SCRIPTS.md#per-feature-tc-creation-script-tcs_to_jira_runjs)

Execute once per feature (overwrite the file for each iteration):
```bash
node tcs_to_jira_run.js
```

---

## STEP 4 — REPORT AND CLEANUP

Print summary with per-feature blocks and a grand total.

```
tcs-to-jira — Complete

Jira Epic (Test Plan): N/A (--epic-name not provided)
  — OR —
Jira Epic (Test Plan): <key> — "<EpicName>"  [REUSED]
  — OR —
Jira Epic (Test Plan): <key> — "<EpicName>"  [CREATED]
  — OR —
Jira Epic (Test Plan): SKIPPED — <reason>

Feature: PL-InstrumentConfig
  Label grouping: epic-<key>, US-PL-InstrumentConfig-IC-001  (3 TCs)
  Label grouping: epic-<key>, US-PL-InstrumentConfig-IC-002  (2 TCs)

  Test Case                          Jira Key  Parent US                      Parent Jira   Status
  ────────────────────────────────────────────────────────────────────────────────────────────────
  TC-Valid_Instrument_Listing        BB-67890  US-PL-InstrumentConfig-...     BB-5692       Created + Linked
  TC-Invalid_Missing_Name            BB-67891  US-PL-InstrumentConfig-...     BB-5692       Created + Linked
  ────────────────────────────────────────────────────────────────────────────────────────────────
  Subtotal: 2 created, 0 failed
  Mapping saved: test_cases/PL-InstrumentConfig_Jira_TCs.json

Feature: PL-PlateLayout
  ...
  Subtotal: N created, M failed
  Mapping saved: test_cases/PL-PlateLayout_Jira_TCs.json

════════════════════════════════════════════════════════════════════════════════════════════════════
Grand Total: T created, E failed across F features

NOTE (if "Tests" link type is unavailable): To enable "Tests" issue linking, ensure the
"Tests" link type exists in Jira at <JIRA_BASE_URL>/secure/admin/ListLinkTypes.jspa
or use a different link type name (e.g. "Relates") by updating the script.
```

Cleanup from project root:
```bash
rm -f tcs_to_jira_run.js tcs_epic_key.json
```
(`tcs_epic_search.js` was already deleted in Step 1e.)

**Verification — confirm nothing was left behind:**
```bash
ls tcs_epic_search.js tcs_to_jira_run.js tcs_epic_key.json tmp_existing_tcs_*.json 2>/dev/null
```
This command should produce no output. Any file it lists was missed by a cleanup step above and
must be deleted before the skill is considered complete.
