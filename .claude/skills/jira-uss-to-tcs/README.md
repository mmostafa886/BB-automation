# jira-uss-to-tcs

## What it does

A **fully Jira-native skill** that fetches existing User Story issues directly from Jira, generates **coverage-aware** Test Cases from their acceptance criteria (in memory), and creates those Test Cases back in Jira as Task issues linked to their parent User Stories via the `Tests` issue link type.

Before generating any TCs, the skill fetches all Task issues (Test Cases) already linked to each User Story (via **any** link type — not limited to "Tests"), deduplicates them, and maps their coverage against the AC and Definition of Done criteria. Only TCs for **uncovered criteria** are generated — preventing duplicate issues on re-runs or incremental AC additions.

No local markdown files are read as input — all content flows from Jira to Jira. Two optional flags alter the write behaviour:

- `--save-local` — also saves generated TCs to `test_cases/<FeatureName>_TestCases.md`; Jira write still runs.
- `--local-only` — saves three local files and **skips all Jira write calls** (Step 4 and Step 5.5). Jira read (Step 2) still runs to fetch the User Stories. Files saved:
- `--compare-coverage` — presence flag (no value; default: absent = disabled). When combined with `--save-local` or `--local-only` and a prior `_TestCases.md` file already exists, the skill scores both the old and newly generated TC sets, displays a comparison table, and asks via `AskUserQuestion` which version to keep before writing the local file. Has no effect when no prior file exists or when neither local-save flag is active.
  - `test_cases/<FeatureName>_TestCases.md` — TC markdown (same format as `/uss-to-tcs`)
  - `test_cases/<FeatureName>_Jira_TCs[_<AgentName>].json` — TC mapping with `jiraKey: null` + `"localOnly": true`
  - `stories/<FeatureName>_Jira_IDs.json` — **real Jira issue keys** from Step 2, using the same slug keys as the markdown headings so `tcs-to-jira` can resolve "Tests" links later

---

## Input

| Variable | Description |
| --- | --- |
| Feature label | e.g. `add-employee` — queries Jira via JQL for all User Stories with that label |
| JQL snippet | Used as-is in the Jira search query (e.g. `project = PROJ AND component = HR`) |
| Issue keys | Space-separated list of Jira issue keys (e.g. `PROJ-123 PROJ-124`) |
| `config/jira-us-ids.json` | **Auto-detected.** Place a JSON file at the project root to supply issue keys without passing them manually. See format below. |
| `--save-local` | Optional. Saves generated TCs to `test_cases/<FeatureName>_TestCases.md`; Jira write still runs. |
| `--local-only` | Optional. Saves both `_TestCases.md` and `_Jira_TCs.json` locally; skips all Jira write calls (Step 4, Step 5.5). JSON uses `jiraKey: null` + `"localOnly": true`. |
| `--compare-coverage` | Optional. When combined with `--save-local` or `--local-only` and a prior `_TestCases.md` file exists, scores both old and new TC sets and prompts to choose which version to keep. |
| `--wireframe-url=<url>` | Optional flag. If provided, the skill uses this URL directly. If NOT provided, the skill will **automatically prompt** you via `AskUserQuestion` to enter a wireframe URL or skip wireframe enrichment. Wireframe prompt is **mandatory** for direct invocations (not skipped for pipeline orchestrators). Activates wireframe-aware TC generation to add UI-specific test scenarios. |
| AI agent (auto-detected) | **No flag needed.** The skill reads `.env` to detect the active AI key (`ANTHROPIC_API_KEY` → `_Claude`, `OPENAI_API_KEY` → `_OpenAI`, `GEMINI_API_KEY` → `_Gemini`) and appends the suffix to the markdown filename automatically. No suffix is added if no key is found. |

### `config/jira-us-ids.json` format

The file is checked automatically at the project root before prompting for input. Supported formats:

```json
["PROJ-123", "PROJ-124", "PROJ-125"]
```

```json
{ "keys": ["PROJ-123", "PROJ-124", "PROJ-125"] }
```

```json
{ "featureName": "Add_Employee", "keys": ["PROJ-123", "PROJ-124", "PROJ-125"] }
```

Including `featureName` lets the skill skip the derivation step and use it directly for output file naming.

If nothing is provided the skill asks for one of the above.

### Required environment variables

| Variable | Description |
| --- | --- |
| `JIRA_BASE_URL` | e.g. `https://your-org.atlassian.net` |
| `JIRA_PROJECT_KEY` | Your Jira project key (e.g. `PROJ`) |
| `JIRA_EMAIL` | Email address associated with the Jira API token |
| `JIRA_API_TOKEN` | Jira API token with issues read/write permission |
| `JIRA_US_ISSUE_TYPE` | Issue type for User Stories (default: `Story`) |
| `JIRA_TC_ISSUE_TYPE` | Issue type for Test Cases (default: `Task`) |

---

## Steps

## Usage Examples

### 1. Basic Jira-native: Fetch USs, generate TCs, push to Jira

```bash
/jira-uss-to-tcs reagents-upload
```

This queries Jira for User Story issues labelled `reagents-upload`, generates Test Cases, and creates them in Jira. Outputs: `test_cases/Reagents_Upload_Jira_TCs_Claude.json` (with real Jira issue keys).

### 2. With wireframe URL for UI-specific TC generation

```bash
/jira-uss-to-tcs --wireframe-url=https://figma.com/file/abc123/reagents-ui
```

When a wireframe URL is provided:
- The skill captures all UI elements visible in the wireframe (buttons, forms, dropdowns, etc.)
- Each element becomes an implicit test scenario
- Example: wireframe shows "Reagent Status" dropdown with [Active, Inactive] options → generates TCs to test each status, invalid values, empty selection, etc.
- Generated TCs explicitly reference the wireframe element names and selectors

### 3. Automatic wireframe prompt (default behavior)

```bash
/jira-uss-to-tcs projects-create
```

By default, the skill will **automatically prompt** you via `AskUserQuestion` to provide a wireframe URL (or skip wireframe enrichment). This prompt is **mandatory** for all direct invocations of `/jira-uss-to-tcs` (unless invoked from a pipeline orchestrator like `/jira-full-pipeline`). You can:

- **Enter a wireframe URL** at the prompt (e.g., `https://figma.com/file/abc123/projects-ui`)
- **Skip wireframe** by selecting "No — skip wireframe" — TC generation will proceed with AC/DoD text only

### 4. Save locally + auto-prompt for wireframe

```bash
/jira-uss-to-tcs projects-create --save-local
```

Same as above, but also saves `test_cases/Projects_Create_TestCases_Claude.md` locally after TC generation. The automatic wireframe prompt will still fire.

### 4. Use config file + compare coverage

```bash
# First time:
/jira-uss-to-tcs --local-only --wireframe-url=https://figma.com/design/wireframe1

# Second time (re-running with updated wireframe):
/jira-uss-to-tcs --local-only --wireframe-url=https://figma.com/design/wireframe2 --compare-coverage
```

First run: generates TCs based on wireframe1, saves locally.
Second run: generates TCs from wireframe2, compares coverage scores, asks which version to keep.

### 5. Full workflow: wireframe → Jira TCs → Playwright scripts

```bash
# Step 1: Generate TCs from User Stories + wireframe
/jira-uss-to-tcs --wireframe-url=https://figma.com/design/myfeature add-employee

# Step 2: Generate Playwright automation scripts (config/testCaseFilter.js auto-patched)
/jira-tcs-to-plscript Add-Employee

# Step 3: Fix any failures
/execute-and-fix-tests
```

---

### Step 1 — Validate Prerequisites

Resolves the query parameters, derives `FeatureName` (underscored) and `feature-slug` (lowercase-hyphenated), verifies Jira env vars are set, and runs an idempotency guard: if `test_cases/<FeatureName>_Jira_TCs[_<AgentName>].json` already exists the skill warns and requires an explicit `confirm overwrite` before continuing.

---

### Step 2 — Fetch User Stories from Jira

Writes and executes a temporary Node.js script that queries Jira via the REST API (built-in Node.js `https` module with Basic auth), retrieves the matching User Story issues with their titles, descriptions, labels, and acceptance criteria. After fetching issues, it makes an additional `GET /rest/api/3/issue/{key}/comment` call per story to retrieve issue comments (used by Step 2c for Definition of Done detection). Comment fetch failures are swallowed gracefully — a failed comment call never aborts the skill.

The temp file `tmp_us_raw.json` is written as `{ items, commentsMap }` where `commentsMap` maps each issue key to its concatenated comment text.

```text
Fetched 3 User Stories from Jira:
  PROJ-123: Add a New Employee Record
  PROJ-124: Validate Required Fields on Employee Form
  PROJ-125: Delete Employee with Confirmation Dialog
Generating Test Cases...
```

---

### Step 2c — Extract Definition of Done (automatic)

Runs automatically after Step 2 for every fetched User Story. Scans four sources in priority order (first match wins):

0. **Custom Jira field for DoD** — checked first. If the field is present and non-empty, its content is stripped of markup and used directly. No further sources are scanned for that story. This field is silently absent on Jira configurations that do not define it.
1. `description`
2. `acceptanceCriteria` (extracted from description or a dedicated custom field)
3. Jira issue **comments** (fetched in Step 2)

Sources 1–3 use pattern matching:

| Pattern | Example |
| --- | --- |
| Heading titled "Definition of Done" (case-insensitive) | `## Definition of Done` |
| Bold / inline title anywhere in the text | `**Definition of Done**` |

All markup is stripped from the matched DoD block. The result is stored as plain text alongside the story:

```json
{ "definitionOfDone": "- Code reviewed\n- Tests passing\n- Documented",
  "dodSource": "customField" }
```

`dodSource` is one of `"customField"`, `"description"`, `"acceptanceCriteria"`, `"comment"`, or `null`.
When no DoD is found in any source, both fields are `null` and Step 3 is unaffected.

When at least one story has a non-null DoD, the skill prints:

```text
Definition of Done found in 2 of 3 User Stories — will be included in TC generation.
  PROJ-123 "Add a New Employee Record"          →  source: customField
  PROJ-124 "Validate Required Fields on Form"   →  source: acceptanceCriteria
```

---

### Step 2d — Fetch Existing Linked Test Cases (mandatory)

Runs automatically after Step 2c — always, with no skip path. For each User Story, expands
**all** issue links (regardless of link type — "Tests", "Relates to", "Blocks", "Duplicates",
custom types, etc.) and collects every linked issue key. Keys are deduplicated before
fetching, so a TC linked via multiple link types is counted exactly once. Only issues
of type `Task` (or `JIRA_TC_ISSUE_TYPE`) are kept.

Results are stored in `tmp_existing_tcs_<FeatureName>.json` keyed by US key. Step 3 reads
this file to drive its coverage analysis — **no TCs are generated for criteria already
covered by existing Jira issues**.

---

### Step 3 — Generate Test Cases (in memory)

Reads `tmp_existing_tcs_<FeatureName>.json` from Step 2d and performs a **coverage analysis** per User Story before generating. For each US, it maps existing TC titles and descriptions to AC/DoD criteria, marks covered criteria, then generates NEW TCs only for **uncovered** criteria. A US where all criteria are already covered is skipped entirely.

For each User Story, generates Test Cases following the same quality standards as `/uss-to-tcs`. There is **no upper limit** on the number of TCs per story — generate as many as the AC scenarios and risk areas demand:

- Types covered: **Positive**, **Negative**, **Boundary**, **Security** (auth, injection, access control), **Performance** (response-time thresholds, load limits, concurrency), **DB** (data persistence, integrity, transactions, constraint violations), **API** (contract validation, HTTP status codes, payload schema, error response format) — wherever the feature context makes them applicable
- TC ID format: `TC-<TitleSlug>` where `TitleSlug` = 3–5 qualifier + subject words, underscore-joined (e.g. `TC-Valid_Employee_Creation`, `TC-Performance_Load_Limit`)
- Each TC: title, type, preconditions, steps[], expectedResult

**Definition of Done integration:** If Step 2c found a non-null `definitionOfDone` for a story, each DoD criterion is treated as an implicit acceptance criterion. Any criterion not already covered by a TC derived from the explicit AC gets a dedicated TC added. Type defaults to `Positive`; `Boundary` for constraint-type criteria; `Security` for access or quality-gate criteria; `Performance` for throughput or latency requirements; `DB` for data persistence or integrity checks; `API` for API contract or response validation criteria.

**Gap analysis:** After the initial TC pass, the skill reviews coverage and identifies any AC scenarios, edge cases, security concerns, performance aspects, DB interactions, or API contracts with no TC. Additional TCs are generated to close every identified gap before writing the JSON file.

Test Cases are held in memory.

---

### Step 3.5 — Save Test Cases to Local Markdown (`--save-local` or `--local-only`)

Skipped unless `--save-local` or `--local-only` was passed. Does not stop execution — Step 4 runs next (and is skipped for `--local-only`).

Serializes `testCases[]` to `test_cases/<FeatureName>_TestCases.md` using the **exact same
format** as `/uss-to-tcs` — grouped by parent User Story:

```markdown
### Story: US-<FeatureName>-<USTitleSlug>
**Test Case ID:** TC-<TitleSlug>: <Full Title in Title Case>
**Type:** Positive
**Preconditions:** User is logged in and on the Employees page.
**Steps:**
1. Click the "Add Employee" button.
2. Fill in all required fields with valid data.
3. Click "Save".
**Expected Result:** Employee record is created and appears in the list.
```

Output file: `test_cases/<FeatureName>_TestCases[_<AgentName>].md`
(suffix auto-detected from active API key in `.env`: `ANTHROPIC_API_KEY` → `_Claude`, `OPENAI_API_KEY` → `_OpenAI`, `GEMINI_API_KEY` → `_Gemini`; no suffix if no key found)

If `--local-only` was passed, execution stops here after confirming the file was saved.

---

### Step 4 — Create Test Case Issues in Jira

Skipped when `--local-only` is passed.

Writes and executes a temporary Node.js script that creates each Test Case as a Task issue in Jira using the REST API (`POST /rest/api/3/issue`) with:

- `summary` — TC title
- `description` — ADF document containing preconditions, steps, and expected result
- `issuetype` — `{ name: JIRA_TC_ISSUE_TYPE }` (default: `Task`)
- `labels` — `['test-case', <feature-slug>, <type>]`
- A "Tests" issue link to the parent User Story issue (`POST /rest/api/3/issueLink`)

Issue URL format: `${JIRA_BASE_URL}/browse/${key}`

---

### Step 5 — Report and Save Mapping JSON

Always runs. Behaviour differs by mode:

- **Default / `--save-local`:** Saves `test_cases/<FeatureName>_Jira_TCs[_<AgentName>].json` with real Jira issue keys. Prints the full creation summary.
- **`--local-only`:** Saves `test_cases/<FeatureName>_Jira_TCs[_<AgentName>].json` with `jiraKey: null` per TC and `"localOnly": true`. Prints a local-save summary. Step 5.5 is then skipped (null keys cannot be used by downstream scripts).

Prints a summary table and saves the TC key mapping:

```text
jira-uss-to-tcs — Complete for: Add_Employee

US Jira Key   TC ID                        TC Jira Key   Status
───────────────────────────────────────────────────────────────
PROJ-123      TC-Valid_Employee_Creation   PROJ-456      Created + Linked
PROJ-123      TC-Invalid_Missing_Fields    PROJ-457      Created + Linked
PROJ-124      TC-Valid_Employee_List_View  PROJ-458      Created + Linked
───────────────────────────────────────────────────────────────
Total: 3 Test Cases created in Jira, 0 failed
Mapping saved: test_cases/Add_Employee_Jira_TCs_OpenAI.json
```

Temporary scripts are removed from the project root.

---

## All artifacts produced

| Artifact | Location | When produced |
| --- | --- | --- |
| TC mapping JSON (with Jira keys) | `test_cases/<FeatureName>_Jira_TCs[_<AgentName>].json` | Default and `--save-local` runs |
| TC mapping JSON (jiraKey: null) | `test_cases/<FeatureName>_Jira_TCs[_<AgentName>].json` | `--local-only` runs — TCs not pushed to Jira |
| **US Jira key mapping** | `stories/<FeatureName>_Jira_IDs.json` | **`--local-only` runs** — real US Jira keys from Step 2; required by `tcs-to-jira` later |
| Test Case issues | Jira | Default and `--save-local` runs only |
| Local TC markdown | `test_cases/<FeatureName>_TestCases[_<AgentName>].md` | `--save-local` and `--local-only` runs — suffix auto-detected from active API key in `.env` |

---

## Error handling

- Stops with a clear message if any required Jira env var is missing.
- Stops with an error if the User Stories query returns zero results.
- **Idempotency guard** — requires explicit `confirm overwrite` if the TC mapping file already exists; never creates duplicate Test Case issues silently.
- **Graceful link failure** — if the "Tests" issue link cannot be added (e.g. the parent US key is not in Jira), the Task issue is still created and the warning is logged; execution continues.
- No auto-chaining — the orchestrator (`jira-full-pipeline`) controls sequencing.

---

## Going from Jira User Stories → Playwright scripts

After `jira-uss-to-tcs` completes (Step 5), **Step 5.5 automatically patches
`config/testCaseFilter.js`** with the new Jira TC keys — append-only, no existing
entries or comments are touched. This means you can run `jira-tcs-to-plscript`
immediately without any manual step.

```text
1.  /jira-uss-to-tcs <feature-label-or-keys>
         └─ Creates TC issues in Jira
         └─ Saves test_cases/<FeatureName>_Jira_TCs.json
         └─ Step 5.5 patches config/testCaseFilter.js (append-only)

2.  /jira-tcs-to-plscript <ModuleName>
         └─ Fetches TCs → generates 4-layer Playwright scripts
         └─ Auto-chains to polish-generated-code
```

### Step 5.5 behaviour

| Case | Action |
| --- | --- |
| Module already exists in filter | Appends only keys not already present; skips duplicates |
| Module does not exist | Adds new module entry + adds to `activeModules` |
| `config/testCaseFilter.js` missing | Warns and skips — does not fail |
| All new keys already present | Prints "no changes" and exits cleanly |
| Some TCs failed to create in Jira | Only successful keys are added to the filter |

---

## When to use this vs. related skills

| Scenario | Use |
| --- | --- |
| Fetch User Stories from Jira, generate TCs, push TCs back to Jira | `jira-uss-to-tcs` |
| Same as above but also save TCs locally as a markdown file | `jira-uss-to-tcs --save-local` |
| Fetch Jira USs → generate TCs → save all three files locally (no Jira write) | `jira-uss-to-tcs --local-only` |
| Re-run locally and compare new TC set against existing local file before overwriting | `jira-uss-to-tcs --local-only --compare-coverage` |
| Save locally + compare coverage against prior file, then also push to Jira | `jira-uss-to-tcs --save-local --compare-coverage` |
| After `--local-only`, merge Claude + OpenAI TC sets into one | `merge-tc-sets` |
| After merge (or directly after `--local-only`), push TCs to Jira + create Epic | `tcs-to-jira` |
| After `tcs-to-jira`, generate Playwright scripts from local markdown | `tcs-to-plscript` |
| After `jira-uss-to-tcs` (default/save-local), generate Playwright scripts from Jira | `jira-tcs-to-plscript` (filter auto-patched by Step 5.5) |
| Already have a local `TestCases.md`, want to push to Jira | `tcs-to-jira` |
| Full BRD → local files + Jira in one command | `jira-full-pipeline` |
| Generate Test Cases from a local User Stories markdown file (no Jira) | `uss-to-tcs` |

---

## Complete flow

```text
<feature label / JQL / issue keys>  [--save-local | --local-only]
      │
      ▼ Step 1 — validate env vars + idempotency guard
      │
      ▼ Step 2 — fetch User Stories from Jira (read-only) ────────► (in memory: stories[])
      │           + fetch comments per story (GET /issue/{key}/comment)
      │
      ▼ Step 2c — detect Definition of Done ───────────────────────► definitionOfDone + dodSource
      │             sources: Custom DoD field → description →
      │                      acceptanceCriteria → comments (first match wins)
      │             null when no DoD found — Step 3 unaffected
      │
      ▼ Step 2d — fetch existing linked TCs from Jira ─────────────► tmp_existing_tcs_<FeatureName>.json
      │             expand all issue links (any type) per US
      │             deduplicate linked keys; keep only Task issues
      │             builds byUsKey map for Step 3 coverage analysis
      │
      ▼ Step 3 — generate ONLY uncovered Test Cases ──────────────► (in memory: testCases[])
      │           coverage analysis per US against existing TCs
      │           AC-derived TCs + DoD-derived TCs (uncovered criteria only)
      │
      ▼ Step 3.5 — save local markdown (--save-local/--local-only)
      │             └─ test_cases/<FeatureName>_TestCases.md
      │
      ▼ Step 4 — create TC issues in Jira ─────────────────────────► Jira Task issues
      │           (SKIPPED for --local-only)                          (Tests link → parent US)
      │
      ▼ Step 5 — save mapping files
      │           default / --save-local:
      │             └─ test_cases/<FeatureName>_Jira_TCs.json  (jiraKey = real Jira key)
      │           --local-only (all three saved locally):
      │             └─ test_cases/<FeatureName>_TestCases.md   (already done in Step 3.5)
      │             └─ test_cases/<FeatureName>_Jira_TCs.json  (jiraKey = null, localOnly: true)
      │             └─ stories/<FeatureName>_Jira_IDs.json     (real US Jira keys from Step 2)
      │
      ▼ Step 5.5 — patch config/testCaseFilter.js ─────────────────► filter updated (append-only)
                   (SKIPPED for --local-only)
```
