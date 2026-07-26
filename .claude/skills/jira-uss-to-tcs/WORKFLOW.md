# jira-uss-to-tcs — Full Workflow

Full step-by-step execution detail for the `jira-uss-to-tcs` skill. Loaded on demand from
[SKILL.md](SKILL.md) — read this file when executing any step below.

Script templates referenced from this file live in [SCRIPTS.md](SCRIPTS.md).

---

## EXECUTION FLOW — MANDATORY STEP ORDER

⚠️ **IMPORTANT:** Step 1e (UI Wireframe Discovery) is **MANDATORY** and must be executed **AFTER Step 1d** and **BEFORE Step 2**. This ensures wireframe URLs are always captured when available, enriching TCs with real UI element details.

**Exception:** Skip Step 1e only when invoked from a pipeline orchestrator (e.g., `jira-full-pipeline`, `brd-full-pipeline`), as documented in Step 1e skip condition.

**Enforcement:** If Step 1e is skipped without a pipeline orchestrator context, the skill execution is considered incomplete.

---

## STEP 1 — VALIDATE PREREQUISITES

### 1a. Resolve query parameters

The user provides one of:
- A **feature label** (e.g. `add-employee`) — queries all User Stories with that label in Jira
- A **project key + JQL snippet** (e.g. `project = PROJ AND component = HR`) — used as-is
- A **JQL snippet** — used as-is in the Jira search query
- A list of **issue keys** (e.g. `PROJ-123 PROJ-124 PROJ-125`)
- **`config/jira-us-ids.json` file** at the project root — read automatically if present (see below)

**Auto-reading `config/jira-us-ids.json`:**

Before asking the user for input, check whether `config/jira-us-ids.json` exists:

```bash
ls config/jira-us-ids.json 2>/dev/null && echo "FILE_EXISTS" || echo "FILE_MISSING"
```

If FILE_EXISTS, use the Read tool to read it and extract the keys and optional feature name.
Supported formats:

```json
["PROJ-123", "PROJ-124", "PROJ-125"]
```
```json
{ "keys": ["PROJ-123", "PROJ-124", "PROJ-125"] }
```
```json
{ "featureName": "Add_Employee", "keys": ["PROJ-123", "PROJ-124", "PROJ-125"] }
```

- Extract `keys` array and optional `featureName`.
- If `featureName` is present, use it. If absent, defer derivation to after Step 2
  (where it is auto-derived from Jira issue labels — see Step 2b).
- Print: `Reading User Story keys from config/jira-us-ids.json: [<keys>]`

If FILE_MISSING and no input was provided, ask:
> "Provide a feature label, JQL filter, space-separated issue keys, or place a
> `config/jira-us-ids.json` file at the project root to identify which User Stories to fetch."

Optional flags:
- `--save-local` — also saves generated Test Cases to
  `test_cases/<FeatureName>_TestCases<AgentSuffix>.md`. Jira write (Steps 4, 5, 5.5) still
  runs. Set `saveLocal = true`.
- `--local-only` — fetches User Stories from Jira, generates TCs, saves only locally.
  Skips all Jira writes (Steps 4, 5, 5.5). Implies `--save-local`. Set `localOnly = true`.
- `--compare-coverage` — presence flag (no value needed). When present and a local TC markdown
  file already exists at `test_cases/<FeatureName>_TestCases<AgentSuffix>.md`, activates
  coverage comparison before writing: scores both old and new TC sets, shows a comparison table,
  and asks the user which to keep. Has no effect when no prior local file exists.
  Set `compareCoverage = true`; if absent set `compareCoverage = false`.
- `--wireframe-url=<url>` — optional. URL of the wireframe / UI prototype for this feature.
  Strip this token before resolving other inputs. Store as `wireframeUrl` (empty string if
  absent). If absent, an interactive prompt fires in Step 1e to ask the user.

Derive (after featureName is known):
- `FeatureName` — underscored label (e.g. `Add_Employee`)
- `feature-slug` — lowercase-hyphenated (e.g. `add-employee`)
- `MappingFile` = `test_cases/<FeatureName>_Jira_TCs<AgentSuffix>.json`

---

### 1d. Detect active AI agent and load environment

Run a single Node one-liner that loads dotenv **first**, then reads all required vars:

```bash
cd <project-root> && node -e "
require('./node_modules/dotenv').config();
const agent =
  process.env.ANTHROPIC_API_KEY ? 'Claude' :
  process.env.OPENAI_API_KEY    ? 'OpenAI' :
  process.env.GEMINI_API_KEY    ? 'Gemini' : '';
console.log('AGENT='         + (agent || 'unknown'));
console.log('JIRA_BASE_URL=' + (process.env.JIRA_BASE_URL      || '(not set)'));
console.log('PROJECT_KEY='   + (process.env.JIRA_PROJECT_KEY   || '(not set)'));
console.log('EMAIL='         + (process.env.JIRA_EMAIL         || '(not set)'));
console.log('TOKEN='         + (process.env.JIRA_API_TOKEN ? 'set' : '(not set)'));
"
```

Derive:
- `AgentName` = value after `AGENT=` (e.g. `Claude`, `OpenAI`, `Gemini`, or `unknown`)
- `AgentSuffix` = `AgentName !== 'unknown' ? '_' + AgentName : ''`

Print: `Detected AI agent: <AgentName>`

---

## STEP 1e — UI WIREFRAME DISCOVERY [MANDATORY]

> **Skip condition**: If this skill was invoked from within a pipeline orchestrator (e.g.
> `jira-full-pipeline`, `brd-full-pipeline`), set `wireframeContext = null` and skip this step.
>
> **Otherwise: THIS STEP IS MANDATORY.** Do not skip for direct `/jira-uss-to-tcs` invocations.

### 1 — ENFORCE wireframe URL prompt

**ALWAYS execute one of the following (no skipping without orchestrator context):**

- **If `--wireframe-url=<url>` flag was present**: Extract `<url>` and use it as `wireframeUrl`. Skip to Step 1e-2 (Capture wireframe).
- **If `--wireframe-url` flag was NOT present**: Immediately call `AskUserQuestion` to prompt the user:
  - **Question**: `"Do you have a wireframe / UI prototype URL for this feature? (Providing one lets the skill enrich Test Case scenarios with real UI element names and interactions.)"`
  - **Option A** — label: `"Yes — enter URL"`, description: `"Type the URL in the Other field below"`
  - **Option B** — label: `"No — skip wireframe"`, description: `"TC generation will rely on ACs and DoD text only"`

**User selects "Yes":** Extract the URL from the "Other" field input and proceed to Step 1e-2.

**User selects "No":** Set `wireframeUrl = ''` and proceed to Step 1e-2 (which will skip wireframe capture).

### Step 1e-2 — Determine wireframe availability

- **If `wireframeUrl` is non-empty** (user provided a URL or flag was passed): Proceed to Step 1e-3 (Capture wireframe).
- **If `wireframeUrl` is empty** (user skipped wireframe): Print message and proceed to Step 2.

**Message when wireframe is skipped:**
```
No wireframe provided — TC generation will rely on text sources only.
```

Set `wireframeContext = null`.

### Step 1e-3 — Capture wireframe

If `wireframeUrl` is non-empty:

1. `mcp__playwright__browser_navigate` → `wireframeUrl`
2. `mcp__playwright__browser_snapshot` → capture full accessibility tree
3. `mcp__playwright__browser_take_screenshot` → visual confirmation

Parse the snapshot output into a `wireframeContext` object:

```
wireframeContext = {
  url: <wireframeUrl>,
  elements: [
    { role, name, label, placeholder, testId, selector },
    ...
  ]
}
```

Derive `selector` per element using this priority:
1. `[data-testid="<testId>"]` — when `testId` is present in the snapshot
2. `<tag>[aria-label="<label>"]` or `input[placeholder="<placeholder>"]` — when label/placeholder present
3. `*:has-text("<name>")` — text-based CSS as last resort

Print:
```
Wireframe captured: <wireframeUrl> — <N> interactive elements identified.
  role=button   name="Save Project"   selector=[data-testid="save-project-btn"]
  role=textbox  label="Project Name"  selector=input[aria-label="Project Name"]
  role=combobox name="Status"         selector=select[name="status"]
  ...
```

---

### 1b. Check Jira environment variables

Parse the output of the one-liner above. If `JIRA_BASE_URL`, `PROJECT_KEY`, `EMAIL`, or `TOKEN` shows
`(not set)`, explain which vars are needed and stop. All four must be set in `.env`.

---

### 1c. Idempotency guard

```bash
ls test_cases/<FeatureName>_Jira_TCs<AgentSuffix>.json 2>/dev/null && echo "EXISTS"
```

If EXISTS: warn about duplicate TC creation, require explicit `confirm overwrite` before
continuing. (Skip if `FeatureName` is not yet known — guard runs after Step 2b.)

---

## STEP 2 — FETCH USER STORIES FROM JIRA

**Path A — direct issue keys (most common via `config/jira-us-ids.json`):**
When the input is a list of issue keys, fetch each directly via the Jira REST API:
`GET /rest/api/3/issue/{key}` for each key, requesting fields:
`summary`, `description`, `labels`, `comment`, `customfield_<DoD field if configured>`

**Path B — label / JQL snippet:**
Use JQL to resolve keys first:
`GET /rest/api/3/search?jql=<jql>&fields=summary,description,labels,comment&maxResults=100`

Write the fetch script to the **project root** as `<FeatureName>_fetch.js` (or a temp name
if FeatureName is not yet known, e.g. `tmp_fetch_us.js`).

→ Script template: [SCRIPTS.md#step-2--fetch-user-stories-script](SCRIPTS.md)

Run:
```bash
cd <project-root> && node <FeatureName>_fetch.js
rm -f <FeatureName>_fetch.js
```

Use the Read tool to read `tmp_us_raw.json` (structured as `{ items, commentsMap }`)
and build the `stories` array:
```
[
  {
    "jiraKey": "PROJ-123",
    "title": "Add a New Employee Record",
    "description": "<ADF or plain text>...",
    "acceptanceCriteria": "<ADF or plain text>...",
    "labels": ["add-employee"],
    "commentsText": "..."   // concatenated comment text (may be empty)
  },
  ...
]
```

Map from the raw JSON:
- `items[i].key` → `jiraKey`
- `items[i].fields.summary` → `title`
- `items[i].fields.description` → `description`
- `items[i].fields.acceptanceCriteria` (or extracted from description) → `acceptanceCriteria`
- `items[i].fields.labels` → `labels`
- `commentsMap[items[i].key]` → `commentsText`

Print a preview:
```
Fetched <N> User Stories from Jira:
  PROJ-123: Add a New Employee Record
  PROJ-124: Validate Required Fields
```

---

### Step 2c — Extract Definition of Done (optional)

After building the `stories` array, scan four sources per story for a "Definition of Done"
section — in this priority order (first match wins):

**Source 0 — Custom Jira field for DoD** (highest priority, checked first)

If `items[i].fields['customfield_<DoD_field_id>']` is non-null and non-empty, strip all
markup and use the result directly as the DoD content. Set `dodSource = "customField"`.
No further sources are scanned for that story.

This field is silently absent on Jira configurations that do not define it — a missing or
null value is not an error; fall through to Sources 1–3 below.

**Source 1 & 2 — `description` and `acceptanceCriteria` fields** (already fetched above)

**Source 3 — Jira issue comments** (already fetched in the main fetch script above)

For each story, scan `commentsText` alongside `description` and `acceptanceCriteria`.

**Detection patterns** — apply to all three sources (plain/ADF text):

1. **Separate heading** — a heading whose text is exactly `Definition of Done` (case-insensitive).
   The DoD content = all text until the next heading of equal or higher level.

2. **Bold/inline title** — `**Definition of Done**` or `Definition of Done:` (case-insensitive)
   anywhere in the text. The DoD content = the remainder of that paragraph / list block
   following the bold title.

For each story, strip all markup from the extracted DoD content and store it as plain text.
Record which source the DoD came from:

```json
{ ..., "definitionOfDone": "- Code reviewed\n- Tests passing\n- Documented",
        "dodSource": "customField" }
```

`dodSource` is one of `"customField"`, `"description"`, `"acceptanceCriteria"`, `"comment"`, or `null`.
Set `definitionOfDone: null` and `dodSource: null` when no DoD is found in any source.

If any story has a non-null DoD, print:
```
Definition of Done found in <N> of <Total> User Stories — will be included in TC generation.
  PROJ-123 "Add a New Employee Record"  →  source: customField
  PROJ-124 "Validate Required Fields"   →  source: acceptanceCriteria
```

---

### Step 2b — Auto-derive FeatureName from labels (when not in config)

If `featureName` was absent from `config/jira-us-ids.json`, derive it now from the fetched
stories:

1. Collect `labels` from all fetched stories.
2. Flatten to a unique set.
3. Pick the first label that matches `^[a-z][a-z0-9-]*$` (the feature slug).
4. Convert to `FeatureName`: replace `-` with `_`, title-case each word.
   Example: `add-employee` → `Add_Employee`.
5. If no labels or multiple distinct feature-like labels exist, ask the user to confirm the name.

Print: `Derived FeatureName: Add_Employee  (from label: add-employee)`

Now run the idempotency guard (Step 1c) with the resolved `FeatureName`.

---

### Step 2d — Fetch Existing Linked Test Cases from Jira

Runs automatically after Step 2c for every fetched User Story. Discovers any Task issues
(Test Cases) already linked to each User Story — regardless of link type — so Step 3 can
skip generating TCs for AC/DoD criteria that are already covered.

Write `<FeatureName>_fetch_existing_tcs.js` to the project root via the Write tool.

→ Script template: [SCRIPTS.md#step-2d--fetch-existing-linked-test-cases-script](SCRIPTS.md)

> **Note:** Replace `<FeatureName>` in the filename string and `usKeys` array with actual values
> before writing the script.

Run:
```bash
cd <project-root> && node <FeatureName>_fetch_existing_tcs.js
rm -f <FeatureName>_fetch_existing_tcs.js
```

Use the Read tool to read `tmp_existing_tcs_<FeatureName>.json` and confirm the results.

Print:
```
Step 2d — Existing linked Test Cases:
  US PROJ-123 "Create Plate Layout": 7 existing TC(s) found
  (Existing coverage will be excluded from generation in Step 3)
```

If `totalExisting === 0`, print:
```
Step 2d — No existing Test Cases found for any User Story — full generation will run.
```

Duplicate TC keys are prevented by the `[...new Set(linkedKeys)]` deduplication above — a TC
linked to the same US via multiple link types is fetched and counted exactly once.

---

## STEP 3 — GENERATE TEST CASES FROM USER STORIES

**Before generating any TCs**, read `tmp_existing_tcs_<FeatureName>.json` (written by Step 2d)
and load the `byUsKey` map. For each User Story, check whether it has existing linked TCs.

**Coverage-aware generation rules (apply per User Story):**

1. **Parse the Acceptance Criteria** into discrete numbered/bulleted scenarios.
2. **Parse the Definition of Done** (when non-null) into discrete criteria.
3. **Map existing TCs to criteria**: For each existing TC for this US, examine its `title`
   and stripped `description` to determine which AC scenario(s) or DoD
   criterion it covers. Mark those as **COVERED**.
4. **Generate NEW TCs only for UNCOVERED criteria.** Do not generate a TC whose intent is
   already covered — including semantically equivalent TCs that differ only in wording.
5. **Gap analysis applies only to uncovered criteria** — do not re-check already-covered areas.
6. If ALL AC scenarios and DoD criteria are covered by existing TCs, output an empty TC list
   for this US and print:
   `US <key>: All AC/DoD criteria already covered by <N> existing TCs — skipping.`
7. **Wireframe-augmented generation (when `wireframeContext` is non-null):**
   After mapping existing TCs to AC/DoD criteria (rule 3 above), also treat each
   interactive element discovered in the wireframe as an implicit acceptance criterion
   that needs TC coverage:
   - **form fields** (`role=textbox` / `spinbutton` / `combobox`) → generate at least:
     - Positive TC: fill with valid data, save, verify persistence
     - Negative TC: leave empty or enter invalid value, verify validation message appears
   - **dropdowns / selects** (`role=combobox` / `listbox`) → generate one TC exercising the
     primary selectable options and one verifying invalid/empty selection where applicable
   - **buttons** (`role=button`) → ensure at least one TC clicks this button and verifies
     the expected outcome; match button name to existing AC scenarios first — only add a
     new TC if no existing TC already exercises the same button
   - **navigation links** (`role=link`) → ensure at least one TC covers navigation to the
     linked target and verifies the resulting page/state
   - **modal / dialog triggers** → generate a TC that opens the dialog, verifies its content,
     and closes/submits it

   When a wireframe element maps to an **existing** AC scenario, enrich that TC's
   `preconditions` and `steps` with the real element label/placeholder found in the wireframe
   (e.g., `"click the 'Create Project' button [data-testid='create-project-btn']"` is more
   precise than `"click the Create button"`).

   Label any TC added purely from wireframe observation (no matching AC text) with
   `**Source: wireframe**` at the start of its `preconditions`.

**Print a coverage map per US before generating** (only when existing TCs are present):
```
US PROJ-123 "Create Plate Layout" — Coverage analysis (7 existing TCs):
  AC Scenario 1 "Create layout with valid name"    → COVERED  (TC PROJ-456)
  AC Scenario 2 "Duplicate layout name rejected"   → COVERED  (TC PROJ-457)
  AC Scenario 3 "Maximum well count boundary"      → UNCOVERED → generating TC
  DoD: "Audit trail entry created on save"         → UNCOVERED → generating TC
Generating 2 new Test Cases for US PROJ-123 (7 existing TCs already in Jira — skipped)
```

When `totalExisting === 0` (no existing TCs found in Step 2d), skip the coverage analysis
entirely and proceed with full generation as normal.

For each User Story, generate Test Cases using the acceptance criteria (stripped) and
the `definitionOfDone` extracted in Step 2c (when non-null):

- Treat each DoD criterion as an implicit acceptance criterion that must have at least one
  TC verifying it. If a DoD criterion is not already covered by a TC derived from the
  explicit acceptance criteria, add a dedicated TC for it.
- Label such TCs with type `Positive` (default) unless the criterion is a constraint
  (use `Boundary`), an access/quality gate (use `Security`), a throughput/latency
  requirement (use `Performance`), a data persistence/integrity check (use `DB`), or an
  API contract/response validation (use `API`).

Role: Senior QA Analyst. Guidelines:
- Generate **one TC per AC scenario** as the default rule. Merge two or more scenarios
  into a single TC only when they form a tight logical sequence that cannot be tested
  independently (e.g., validating a toggle reveals a sub-field, then saving that
  sub-field — the reveal and the save can share one TC). Never merge scenarios of
  different test types (Positive vs Negative) into the same TC.
- There is **no upper limit** on the number of TCs per User Story. A US with 9 AC
  scenarios should produce 7–9 TCs; a US with 13 DoD items may produce additional
  TCs if those items are not already covered by the AC-derived TCs.
- **Full-spectrum coverage:** For every User Story, also generate TCs for Security
  (authentication, authorisation, injection vectors, access control), Performance
  (response-time thresholds, load limits, concurrency), DB (data persistence, integrity,
  transactions, constraint violations), and API (contract validation, HTTP status codes,
  payload schema, error response format) whenever the feature context makes them
  applicable. These are in addition to Positive, Negative, and Boundary TCs.
- Aim for full AC + DoD coverage: every numbered scenario in the AC and every
  checklist item in the DoD must map to at least one TC step or expected result.
- **Gap analysis:** After the initial pass, review the TC set and list any AC scenarios,
  edge cases, security concerns, performance aspects, DB interactions, or API contracts
  that have no TC yet. Generate additional TCs to close every identified gap before
  writing the JSON file.
- Test Case ID format: `TC-<TitleSlug>` where `<TitleSlug>` = 3–5 key words (qualifier +
  subject), underscored. Qualifier must match the test type: `Valid`, `Invalid`, `Missing`,
  `Duplicate`, `Boundary`, `Unauthorized`, `Performance`, `Security`, `DB`, `API`.
  Example: `TC-Valid_Employee_Creation`, `TC-Invalid_Missing_Fields`
- For each TC derive: `tcId`, `title`, `type`, `preconditions`, `steps[]`, `expectedResult`,
  `parentJiraKey`, `parentTitle`

After generating all TCs in memory, **write them to a JSON file** in the project root using
the Write tool:

```
tmp_tcs_<FeatureName>.json
```

This file is shared across Steps 3.5, 4, and 5 — no need to inline the full array in each
script. It is deleted in the final cleanup step.

Format:
```json
[
  {
    "tcId": "Valid_Employee_Creation",
    "title": "Valid Employee Creation with All Mandatory Fields",
    "type": "Positive",
    "preconditions": "...",
    "steps": ["Step 1", "Step 2"],
    "expectedResult": "...",
    "parentJiraKey": "PROJ-123",
    "parentTitle": "Add a New Employee Record"
  },
  ...
]
```

Print a preview:
```
Generated <N> Test Cases:
  TC-Valid_Employee_Creation: <title> (parent: Jira PROJ-123)
  TC-Invalid_Missing_Fields: <title> (parent: Jira PROJ-123)
Proceeding to save / push Test Cases...
```

---

## STEP 3.5 — SAVE TEST CASES TO LOCAL MARKDOWN (--save-local or --local-only)

**Skip this step entirely if neither `--save-local` nor `--local-only` was passed.**

Write the script to the **project root** using the Write tool, run it, then delete it.

→ Script template: [SCRIPTS.md#step-35--save-local-markdown-script](SCRIPTS.md)

Run:
```bash
cd <project-root> && node <FeatureName>_save_md.js
rm -f <FeatureName>_save_md.js
```

Confirm: `"Test Cases saved to test_cases/<FeatureName>_TestCases<AgentSuffix>.md"`

---

## COVERAGE COMPARISON (--compare-coverage)

> **Condition:** This section runs **only** when ALL of the following are true:
> - `compareCoverage = true` (the `--compare-coverage` flag was present)
> - `saveLocal = true` OR `localOnly = true` (a local markdown file will be written)
> - `test_cases/<FeatureName>_TestCases<AgentSuffix>.md` **already exists** from a prior run
>
> If any condition is false, skip this section entirely and proceed to Step 4.

### Step CC-1 — Read the old TC markdown

Use the Read tool to read the existing
`test_cases/<FeatureName>_TestCases<AgentSuffix>.md` into memory as `oldMarkdown`.

### Step CC-2 — Compute coverage scores

Compute the following three metrics for **both** the old markdown (`oldMarkdown`) and the
newly generated TC set held in memory (`testCases[]` from Step 3):

| Metric | How to measure | Weight |
|---|---|---|
| **TC count** | Count `**Test Case ID:**` entries (old) or `testCases.length` (new) | × 3 |
| **Unique TC types** | Count distinct type values (`Positive`, `Negative`, `Boundary`, `Security`, `Performance`, `DB`, `API`) present in the set | × 10 |
| **Total steps** | Sum of all step counts across TCs (for old: count numbered list items `N.` under each `**Steps:**` block; for new: sum `tc.steps.length`) | × 2 |

**Coverage Score** = `(tcCount × 3) + (uniqueTypes × 10) + (totalSteps × 2)`

### Step CC-3 — Print comparison table

```
Coverage Comparison — test_cases/<FeatureName>_TestCases<AgentSuffix>.md
| Metric              | Old Set | New Set |
|---------------------|---------|---------|
| TC count            |   <N>   |   <N>   |
| Unique TC types     |   <N>   |   <N>   |
| Total steps         |   <N>   |   <N>   |
| Coverage Score      |  <X.X>  |  <X.X>  |
```

If new score > old score: `Recommendation: Keep NEW TC set (score <new> > <old>)`
If old score > new score: `Recommendation: Keep OLD TC set (score <old> > <new>)`
If scores are equal: `Scores are tied (<score>) — no automatic recommendation.`

### Step CC-4 — Ask user via `AskUserQuestion`

Use `AskUserQuestion` with exactly two options:
- **Question:** `"<FeatureName>: Coverage score — New: <new_score> | Old: <old_score>. [Recommendation: Keep NEW. / Recommendation: Keep OLD. / Scores tied.] Which version should be kept?"`
- **Option A:** label `"Keep NEW (score: <new_score>)"` — description: `"Overwrite the existing local markdown with the freshly generated TC set"`
- **Option B:** label `"Keep OLD (score: <old_score>)"` — description: `"Discard new generation and keep the existing local TC markdown unchanged"`

### Step CC-5 — Apply decision

| Decision | Action |
|---|---|
| **Keep NEW** | Proceed normally — Step 3.5's save will overwrite the existing file as planned. Report: `"<FeatureName>: Keeping NEW TC set (score: <X>) — existing file will be overwritten."` |
| **Keep OLD** | Set `skipLocalSave = true` — do NOT overwrite the existing markdown file in Step 3.5 (treat it as already saved). Jira write (Step 4) still runs if `localOnly = false`. Report: `"<FeatureName>: Keeping OLD TC set (score: <X>) — new generation discarded for local save."` |

> **Note:** The Jira write (Step 4) is independent of local file decisions. If the user keeps
> the OLD local file, the NEW TCs are still written to Jira (when not `--local-only`).
> Only the local markdown write is gated by this decision.

---

## STEP 4 — CREATE TEST CASE ISSUES IN JIRA

**Skip this step entirely if `--local-only` was passed.** Jump directly to Step 5.

Write `<FeatureName>_create_tcs.js` to the project root via the Write tool.

→ Script template: [SCRIPTS.md#step-4--create-test-case-issues-script](SCRIPTS.md)

Run:
```bash
cd <project-root> && node <FeatureName>_create_tcs.js
rm -f <FeatureName>_create_tcs.js
```

---

## STEP 5 — REPORT AND SAVE MAPPING JSON

### --local-only branch

When `--local-only` was passed, Step 4 was skipped. Write the mapping script to the project
root via the Write tool.

→ Script template: [SCRIPTS.md#step-5--local-only-mapping-script](SCRIPTS.md)

Run:
```bash
cd <project-root> && node <FeatureName>_save_mapping.js
rm -f <FeatureName>_save_mapping.js
```

Print summary for `--local-only`:

```
jira-uss-to-tcs (--local-only) — Complete for: <FeatureName>

Local files saved — no Jira write performed:

TC ID                        Parent Jira US   Status
────────────────────────────────────────────────────
TC-Valid_Employee_Creation   PROJ-123         Saved locally (no Jira push)
TC-Invalid_Missing_Fields    PROJ-123         Saved locally (no Jira push)
TC-Valid_Employee_List_View  PROJ-124         Saved locally (no Jira push)
────────────────────────────────────────────────────
Total: 3 Test Cases saved locally
Markdown:      test_cases/<FeatureName>_TestCases<AgentSuffix>.md
TC mapping:    test_cases/<FeatureName>_Jira_TCs<AgentSuffix>.json   (jiraKey: null — TCs not pushed)
US key mapping: stories/<FeatureName>_Jira_IDs.json      (real Jira keys from Step 2)
```

Then skip Step 5.5 and proceed to **Cleanup**.

### Default / --save-local branch

When Jira write ran (Step 4 executed), print the normal summary:

```
jira-uss-to-tcs — Complete for: <FeatureName>

Source (Jira User Stories) -> Output (Jira Test Cases)

US Jira Key   TC ID                        TC Jira Key   Status
───────────────────────────────────────────────────────────────
PROJ-123      TC-Valid_Employee_Creation   PROJ-456      Created + Linked
PROJ-123      TC-Invalid_Missing_Fields    PROJ-457      Created + Linked
PROJ-124      TC-Valid_Employee_List_View  PROJ-458      Created + Linked
───────────────────────────────────────────────────────────────
Total: 3 Test Cases created in Jira, 0 failed
Mapping saved: test_cases/<FeatureName>_Jira_TCs<AgentSuffix>.json
```

---

### Cleanup (all branches)

```bash
rm -f tmp_us_raw.json tmp_tcs_<FeatureName>.json tmp_existing_tcs_<FeatureName>.json
```

---

## STEP 5.5 — UPDATE config/testCaseFilter.js (APPEND-ONLY)

**Skip this step if `--local-only` was passed** (TC keys are `null`; they cannot be used by
`jira-tcs-to-plscript`).

Patch `config/testCaseFilter.js` so the new Jira TC keys are immediately available —
**without touching any existing entries, comments, or formatting**.

### Derive module name

```
ModuleName = FeatureName with underscores replaced by hyphens
Examples:  Add_Employee → Add-Employee
           Reagents     → Reagents
           Library_Mgmt → Library-Mgmt
```

### Check filter config exists

```bash
ls config/testCaseFilter.js 2>/dev/null && echo "FILTER_OK" || echo "FILTER_MISSING"
```

If FILTER_MISSING: print `"config/testCaseFilter.js not found — skipping filter update."`
and continue. Do **not** fail.

### Write and execute patch script

Write `<FeatureName>_update_filter.js` to the project root via the Write tool.

→ Script template: [SCRIPTS.md#step-55--update-testcasefilterjs-script](SCRIPTS.md)

Run:
```bash
cd <project-root> && node <FeatureName>_update_filter.js
rm -f <FeatureName>_update_filter.js
```

---

## RULES

1. Never hardcode credentials — read from `.env` via `require('./node_modules/dotenv').config()`.
2. **Never write scripts to `/tmp`** — always write to the project root so `node_modules` resolves.
3. **Never use heredoc to create scripts** — use the Write tool.
4. **Fully Jira-native by default**: input comes from Jira issues; Test Cases written to Jira.
   - `--save-local`: also saves `test_cases/<FeatureName>_TestCases<AgentSuffix>.md`; Jira write still runs.
   - `--local-only`: saves locally; skips all Jira writes. Jira env vars still needed for Step 2 fetch.
   - `--compare-coverage`: presence flag (no value). When `--save-local` or `--local-only` is also active and an existing local TC markdown file is found, scores both old and new TC sets (TC count × 3, unique types × 10, total steps × 2), shows a comparison table, and asks the user via `AskUserQuestion` which version to keep before writing. Has no effect if no prior local file exists.
5. When `--local-only` is used, three local files are always saved: `test_cases/<FeatureName>_TestCases<AgentSuffix>.md` (Step 3.5), `test_cases/<FeatureName>_Jira_TCs<AgentSuffix>.json` with `jiraKey: null` + `"localOnly": true` (Step 5), and `stories/<FeatureName>_Jira_IDs.json` with real Jira US keys (Step 5). Step 5.5 is skipped.
6. `AgentSuffix` **must be declared** as `const agentSuffix = '<AgentSuffix>';` in every script that uses it — never leave it undefined.
7. Idempotency guard prevents duplicate TC creation.
8. Every TC must have complete description and steps — never create a TC with empty content.
9. Graceful link failure: if the "Tests" issue link fails, still create the TC and log the warning.
10. No auto-chaining — orchestrator controls sequencing.
11. **Filter config patch is append-only**: never remove existing keys, never rewrite structure, never lose comments. Skip silently if `config/testCaseFilter.js` is absent.
12. **Shared temp files**: `tmp_us_raw.json` (raw stories from Jira), `tmp_tcs_<FeatureName>.json` (generated TCs), and `tmp_existing_tcs_<FeatureName>.json` (existing Jira TCs per US) live in the project root and are read by multiple steps. Delete all three in the final cleanup.
13. **Jira REST API auth**: use Basic auth with `${JIRA_EMAIL}:${JIRA_API_TOKEN}` — never use third-party HTTP client packages. Use the built-in Node.js `https` module for all Jira API calls.
14. **Issue URLs**: format as `${JIRA_BASE_URL}/browse/${key}` (e.g. `https://your-org.atlassian.net/browse/PROJ-123`).
