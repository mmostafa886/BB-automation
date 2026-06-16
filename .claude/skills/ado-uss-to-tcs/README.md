# ado-uss-to-tcs

## What it does

A **fully ADO-native skill** that fetches existing User Story work items directly from Azure DevOps, generates **coverage-aware** Test Cases from their acceptance criteria (in memory), and creates those Test Cases back in Azure DevOps as Test Case work items linked to their parent User Stories via the `TestedBy` relationship.

Before generating any TCs, the skill fetches all Test Case work items already linked to each User Story (via **any** relation type — not limited to "Tests"), deduplicates them, and maps their coverage against the AC and Definition of Done criteria. Only TCs for **uncovered criteria** are generated — preventing duplicate work items on re-runs or incremental AC additions.

No local markdown files are read as input — all content flows from ADO to ADO. Two optional flags alter the write behaviour:

- `--save-local` — also saves generated TCs to `test_cases/<FeatureName>_TestCases.md`; ADO write still runs.
- `--local-only` — saves three local files and **skips all ADO write calls** (Step 4 and Step 5.5). ADO read (Step 2) still runs to fetch the User Stories. Files saved:
- `--compare-coverage` — presence flag (no value; default: absent = disabled). When combined with `--save-local` or `--local-only` and a prior `_TestCases.md` file already exists, the skill scores both the old and newly generated TC sets, displays a comparison table, and asks via `AskUserQuestion` which version to keep before writing the local file. Has no effect when no prior file exists or when neither local-save flag is active.
  - `test_cases/<FeatureName>_TestCases.md` — TC markdown (same format as `/uss-to-tcs`)
  - `test_cases/<FeatureName>_ADO_TCs[_<AgentName>].json` — TC mapping with `adoId: null` + `"localOnly": true`
  - `stories/<FeatureName>_ADO_IDs.json` — **real ADO US IDs** from Step 2, using the same slug keys as the markdown headings so `tcs-to-ado` can resolve `TestedBy` links later

---

## Input

| Variable | Description |
| --- | --- |
| Feature tag | e.g. `add-employee` — queries ADO for all User Stories tagged with it |
| Area path | e.g. `MyProject\HR\Employee` — queries all User Stories under it |
| Work item IDs | Space-separated list of ADO work item IDs (e.g. `12345 12346`) |
| WIQL snippet | Used as-is after the `WHERE` clause in the ADO query |
| `config/ado-us-ids.json` | **Auto-detected.** Place a JSON file at the project root to supply US IDs without passing them manually. See format below. |
| `--save-local` | Optional. Saves generated TCs to `test_cases/<FeatureName>_TestCases.md`; ADO write still runs. |
| `--local-only` | Optional. Saves both `_TestCases.md` and `_ADO_TCs.json` locally; skips all ADO write calls (Step 4, Step 5.5). JSON uses `adoId: null` + `"localOnly": true`. |
| `--compare-coverage` | Optional. When combined with `--save-local` or `--local-only` and a prior `_TestCases.md` file exists, scores both old and new TC sets and prompts to choose which version to keep. |
| `--wireframe-url=<url>` | Optional flag. If provided, the skill uses this URL directly. If NOT provided, the skill will **automatically prompt** you via `AskUserQuestion` to enter a wireframe URL or skip wireframe enrichment. Wireframe prompt is **mandatory** for direct invocations (not skipped for pipeline orchestrators). Activates wireframe-aware TC generation to add UI-specific test scenarios. |
| AI agent (auto-detected) | **No flag needed.** The skill reads `.env` to detect the active AI key (`ANTHROPIC_API_KEY` → `_Claude`, `OPENAI_API_KEY` → `_OpenAI`, `GEMINI_API_KEY` → `_Gemini`) and appends the suffix to the markdown filename automatically. No suffix is added if no key is found. |

### `config/ado-us-ids.json` format

The file is checked automatically at the project root before prompting for input. Supported formats:

```json
[12345, 12346, 12347]
```

```json
{ "ids": [12345, 12346, 12347] }
```

```json
{ "featureName": "Add_Employee", "ids": [12345, 12346, 12347] }
```

Including `featureName` lets the skill skip the derivation step and use it directly for output file naming.

If nothing is provided the skill asks for one of the above.

### Required environment variables

| Variable | Description |
| --- | --- |
| `AZURE_DEVOPS_ORG_URL` | e.g. `https://dev.azure.com/your-org` |
| `AZURE_PROJECT_NAME` | Your ADO project name |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT with Work Items read/write and Test Plans read/write |

---

## Steps

## Usage Examples

### 1. Basic ADO-native: Fetch USs, generate TCs, push to ADO

```bash
/ado-uss-to-tcs reagents-upload
```

This queries ADO for User Stories tagged `reagents-upload`, generates Test Cases, and creates them in ADO. Outputs: `test_cases/Reagents_Upload_ADO_TCs_Claude.json` (with real ADO TC IDs).

### 2. With wireframe URL for UI-specific TC generation

```bash
/ado-uss-to-tcs --wireframe-url=https://figma.com/file/abc123/reagents-ui
```

When a wireframe URL is provided:
- The skill captures all UI elements visible in the wireframe (buttons, forms, dropdowns, etc.)
- Each element becomes an implicit test scenario
- Example: wireframe shows "Reagent Status" dropdown with [Active, Inactive] options → generates TCs to test each status, invalid values, empty selection, etc.
- Generated TCs explicitly reference the wireframe element names and selectors

### 3. Automatic wireframe prompt (default behavior)

```bash
/ado-uss-to-tcs projects-create
```

By default, the skill will **automatically prompt** you via `AskUserQuestion` to provide a wireframe URL (or skip wireframe enrichment). This prompt is **mandatory** for all direct invocations of `/ado-uss-to-tcs` (unless invoked from a pipeline orchestrator like `/ado-full-pipeline`). You can:

- **Enter a wireframe URL** at the prompt (e.g., `https://figma.com/file/abc123/projects-ui`)
- **Skip wireframe** by selecting "No — skip wireframe" — TC generation will proceed with AC/DoD text only

### 4. Save locally + auto-prompt for wireframe

```bash
/ado-uss-to-tcs projects-create --save-local
```

Same as above, but also saves `test_cases/Projects_Create_TestCases_Claude.md` locally after TC generation. The automatic wireframe prompt will still fire.

### 4. Use config file + compare coverage

```bash
# First time:
/ado-uss-to-tcs --local-only --wireframe-url=https://figma.com/design/wireframe1

# Second time (re-running with updated wireframe):
/ado-uss-to-tcs --local-only --wireframe-url=https://figma.com/design/wireframe2 --compare-coverage
```

First run: generates TCs based on wireframe1, saves locally.
Second run: generates TCs from wireframe2, compares coverage scores, asks which version to keep.

### 5. Full workflow: wireframe → ADO TCs → Playwright scripts

```bash
# Step 1: Generate TCs from User Stories + wireframe
/ado-uss-to-tcs --wireframe-url=https://figma.com/design/myfeature add-employee

# Step 2: Generate Playwright automation scripts directly from ADO (config/testCaseFilter.js auto-patched)
/ado-tcs-to-plscript Add-Employee

# Step 3: Fix any failures
/execute-and-fix-tests
```

---

### Step 1 — Validate Prerequisites

Resolves the query parameters, derives `FeatureName` (underscored) and `feature-slug` (lowercase-hyphenated), verifies ADO env vars are set, and runs an idempotency guard: if `test_cases/<FeatureName>_ADO_TCs[_<AgentName>].json` already exists the skill warns and requires an explicit `confirm overwrite` before continuing.

---

### Step 2 — Fetch User Stories from ADO

Writes and executes a temporary Node.js script that queries ADO via `azure-devops-node-api`, retrieves the matching User Story work items with their titles, descriptions, acceptance criteria, and tags. After fetching work items, it makes an additional `getComments()` call per story to retrieve work item comments (used by Step 2c for Definition of Done detection). Comment fetch failures are swallowed gracefully — a failed comment call never aborts the skill.

The temp file `tmp_us_raw.json` is written as `{ items, commentsMap }` where `commentsMap` maps each work item ID to its concatenated comment HTML.

```text
Fetched 3 User Stories from ADO:
  #12345: Add a New Employee Record
  #12346: Validate Required Fields on Employee Form
  #12347: Delete Employee with Confirmation Dialog
Generating Test Cases...
```

---

### Step 2c — Extract Definition of Done (automatic)

Runs automatically after Step 2 for every fetched User Story. Scans four sources in priority order (first match wins):

0. **`Custom.DefinitionofDone` custom ADO field** — checked first. If the field is present and non-empty, its HTML content is stripped and used directly. No further sources are scanned for that story. This field is silently absent on ADO configurations that do not define it.
1. `System.Description`
2. `Microsoft.VSTS.Common.AcceptanceCriteria`
3. ADO work item **comments** (fetched in Step 2)

Sources 1–3 use pattern matching:

| Pattern | Example |
| --- | --- |
| HTML / markdown heading titled "Definition of Done" (case-insensitive) | `<h2>Definition of Done</h2>` \| `## Definition of Done` |
| Bold / inline title anywhere in the text | `<b>Definition of Done</b>` \| `**Definition of Done**` |

All HTML tags are stripped from the matched DoD block. The result is stored as plain text alongside the story:

```json
{ "definitionOfDone": "- Code reviewed\n- Tests passing\n- Documented",
  "dodSource": "customField" }
```

`dodSource` is one of `"customField"`, `"description"`, `"acceptanceCriteria"`, `"comment"`, or `null`.
When no DoD is found in any source, both fields are `null` and Step 3 is unaffected.

When at least one story has a non-null DoD, the skill prints:

```text
Definition of Done found in 2 of 3 User Stories — will be included in TC generation.
  #12345 "Add a New Employee Record"          →  source: customField
  #12346 "Validate Required Fields on Form"   →  source: acceptanceCriteria
```

---

### Step 2d — Fetch Existing Linked Test Cases (mandatory)

Runs automatically after Step 2c — always, with no skip path. For each User Story, expands
**all** relations (regardless of relation type — "Tests", "Related", "Child", "Duplicate",
custom types, etc.) and collects every linked work item ID. IDs are deduplicated before
fetching, so a TC linked via multiple relation types is counted exactly once. Only work items
of type `Test Case` are kept.

Results are stored in `tmp_existing_tcs_<FeatureName>.json` keyed by US id. Step 3 reads
this file to drive its coverage analysis — **no TCs are generated for criteria already
covered by existing ADO TCs**.

---

### Step 3 — Generate Test Cases (in memory)

Reads `tmp_existing_tcs_<FeatureName>.json` from Step 2d and performs a **coverage analysis** per User Story before generating. For each US, it maps existing TC titles and steps to AC/DoD criteria, marks covered criteria, then generates NEW TCs only for **uncovered** criteria. A US where all criteria are already covered is skipped entirely.

For each User Story, generates Test Cases following the same quality standards as `/uss-to-tcs`. There is **no upper limit** on the number of TCs per story — generate as many as the AC scenarios and risk areas demand:

- Types covered: **Positive**, **Negative**, **Boundary**, **Security** (auth, injection, access control), **Performance** (response-time thresholds, load limits, concurrency), **DB** (data persistence, integrity, transactions, constraint violations), **API** (contract validation, HTTP status codes, payload schema, error response format) — wherever the feature context makes them applicable
- TC ID format: `TC-<TitleSlug>` where `TitleSlug` = 3–5 qualifier + subject words, underscore-joined (e.g. `TC-Valid_Employee_Creation`, `TC-Performance_Load_Limit`)
- Each TC: title, type, preconditions, steps[], expectedResult
- Builds ADO step XML (same rules as `tcs-to-ado`)

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

### Step 4 — Create Test Case Work Items in ADO

Skipped when `--local-only` is passed.

Writes and executes a temporary Node.js script that creates each Test Case work item in ADO with:

- `System.Title` — TC title
- `System.Description` — preconditions
- `Microsoft.VSTS.TCM.Steps` — step XML
- `System.Tags` — `<feature-slug>; <type>`
- A `TestedBy-Reverse` relation link to the parent User Story work item

---

### Step 5 — Report and Save Mapping JSON

Always runs. Behaviour differs by mode:

- **Default / `--save-local`:** Saves `test_cases/<FeatureName>_ADO_TCs[_<AgentName>].json` with real ADO work item IDs. Prints the full creation summary.
- **`--local-only`:** Saves `test_cases/<FeatureName>_ADO_TCs[_<AgentName>].json` with `adoId: null` per TC and `"localOnly": true`. Prints a local-save summary. Step 5.5 is then skipped (null IDs cannot be used by `ado-tcs-to-plscript`).

Prints a summary table and saves the TC ID mapping:

```text
ado-uss-to-tcs — Complete for: Add_Employee

US ADO ID   TC ID                        TC ADO ID   Status
────────────────────────────────────────────────────────────
#12345      TC-Valid_Employee_Creation   #67890      Created + Linked
#12345      TC-Invalid_Missing_Fields    #67891      Created + Linked
#12346      TC-Valid_Employee_List_View  #67892      Created + Linked
────────────────────────────────────────────────────────────
Total: 3 Test Cases created in ADO, 0 failed
Mapping saved: test_cases/Add_Employee_ADO_TCs_OpenAI.json
```

Temporary scripts are removed from the project root.

---

## All artifacts produced

| Artifact | Location | When produced |
| --- | --- | --- |
| TC mapping JSON (with ADO IDs) | `test_cases/<FeatureName>_ADO_TCs[_<AgentName>].json` | Default and `--save-local` runs |
| TC mapping JSON (adoId: null) | `test_cases/<FeatureName>_ADO_TCs[_<AgentName>].json` | `--local-only` runs — TCs not pushed to ADO |
| **US ADO ID mapping** | `stories/<FeatureName>_ADO_IDs.json` | **`--local-only` runs** — real US ADO IDs from Step 2; required by `tcs-to-ado` later |
| Test Case work items | Azure DevOps | Default and `--save-local` runs only |
| Local TC markdown | `test_cases/<FeatureName>_TestCases[_<AgentName>].md` | `--save-local` and `--local-only` runs — suffix auto-detected from active API key in `.env` |

---

## Error handling

- Stops with a clear message if any required ADO env var is missing.
- Stops with an error if the User Stories query returns zero results.
- **Idempotency guard** — requires explicit `confirm overwrite` if the TC mapping file already exists; never creates duplicate Test Cases silently.
- **Graceful link failure** — if the `TestedBy` relation cannot be added (e.g. the parent US ID is not in ADO), the Test Case is still created and the warning is logged; execution continues.
- No auto-chaining — the orchestrator (`ado-full-pipeline`) controls sequencing.

---

## Going from ADO User Stories → Playwright scripts

After `ado-uss-to-tcs` completes (Step 5), **Step 5.5 automatically patches
`config/testCaseFilter.js`** with the new ADO TC IDs — append-only, no existing
entries or comments are touched. This means you can run `ado-tcs-to-plscript`
immediately without any manual step.

```text
1.  /ado-uss-to-tcs <feature-tag-or-ids>
         └─ Creates TCs in ADO
         └─ Saves test_cases/<FeatureName>_ADO_TCs.json
         └─ Step 5.5 patches config/testCaseFilter.js (append-only)

2.  /ado-tcs-to-plscript <ModuleName>
         └─ Fetches TCs from ADO → generates 4-layer Playwright scripts
         └─ Auto-chains to polish-generated-code
```

### Step 5.5 behaviour

| Case | Action |
| --- | --- |
| Module already exists in filter | Appends only IDs not already present; skips duplicates |
| Module does not exist | Adds new module entry + adds to `activeModules` |
| `config/testCaseFilter.js` missing | Warns and skips — does not fail |
| All new IDs already present | Prints "no changes" and exits cleanly |
| Some TCs failed to create in ADO | Only successful IDs are added to the filter |

---

## When to use this vs. related skills

| Scenario | Use |
| --- | --- |
| Fetch User Stories from ADO, generate TCs, push TCs back to ADO | `ado-uss-to-tcs` |
| Same as above but also save TCs locally as a markdown file | `ado-uss-to-tcs --save-local` |
| Fetch ADO USs → generate TCs → save all three files locally (no ADO write) | `ado-uss-to-tcs --local-only` |
| Re-run locally and compare new TC set against existing local file before overwriting | `ado-uss-to-tcs --local-only --compare-coverage` |
| Save locally + compare coverage against prior file, then also push to ADO | `ado-uss-to-tcs --save-local --compare-coverage` |
| After `--local-only`, merge Claude + OpenAI TC sets into one | `merge-tc-sets` |
| After merge (or directly after `--local-only`), push TCs to ADO + create Test Plan | `tcs-to-ado` |
| After `tcs-to-ado`, generate Playwright scripts from local markdown | `tcs-to-plscript` |
| After `ado-uss-to-tcs` (default/save-local), generate Playwright scripts from ADO | `ado-tcs-to-plscript` (filter auto-patched by Step 5.5) |
| Already have a local `TestCases.md`, want to push to ADO | `tcs-to-ado` |
| Full BRD → local files + ADO in one command | `ado-full-pipeline` |
| Generate Test Cases from a local User Stories markdown file (no ADO) | `uss-to-tcs` |

---

## Complete flow

```text
<feature tag / area path / IDs / WIQL>  [--save-local | --local-only]
      │
      ▼ Step 1 — validate env vars + idempotency guard
      │
      ▼ Step 2 — fetch User Stories from ADO (read-only) ─────► (in memory: stories[])
      │           + fetch comments per story (getComments)
      │
      ▼ Step 2c — detect Definition of Done ──────────────────► definitionOfDone + dodSource
      │             sources: Custom.DefinitionofDone (field) → description →
      │                      acceptanceCriteria → comments (first match wins)
      │             null when no DoD found — Step 3 unaffected
      │
      ▼ Step 2d — fetch existing linked TCs from ADO ─────────► tmp_existing_tcs_<FeatureName>.json
      │             expand all relations (any type) per US
      │             deduplicate linked IDs; keep only Test Case work items
      │             builds byUsId map for Step 3 coverage analysis
      │
      ▼ Step 3 — generate ONLY uncovered Test Cases ─────────► (in memory: testCases[])
      │           coverage analysis per US against existing TCs
      │           AC-derived TCs + DoD-derived TCs (uncovered criteria only)
      │
      ▼ Step 3.5 — save local markdown (--save-local/--local-only)
      │             └─ test_cases/<FeatureName>_TestCases.md
      │
      ▼ Step 4 — create TC work items in ADO ─────────────────► ADO Test Case WIs
      │           (SKIPPED for --local-only)                     (TestedBy link → parent US)
      │
      ▼ Step 5 — save mapping files
      │           default / --save-local:
      │             └─ test_cases/<FeatureName>_ADO_TCs.json  (adoId = real ADO WI ID)
      │           --local-only (all three saved locally):
      │             └─ test_cases/<FeatureName>_TestCases.md  (already done in Step 3.5)
      │             └─ test_cases/<FeatureName>_ADO_TCs.json  (adoId = null, localOnly: true)
      │             └─ stories/<FeatureName>_ADO_IDs.json     (real US ADO IDs from Step 2)
      │
      ▼ Step 5.5 — patch config/testCaseFilter.js ────────────► filter updated (append-only)
                   (SKIPPED for --local-only)
```
