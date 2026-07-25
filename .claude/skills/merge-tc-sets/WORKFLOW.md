# merge-tc-sets — Full Workflow

Full step-by-step execution detail for `merge-tc-sets`. Loaded from [SKILL.md](SKILL.md) —
read this file when executing any step; SKILL.md only holds the outline and checklist.

Script templates referenced below live in [SCRIPTS.md](SCRIPTS.md).

## Table of contents

- [Step 1 — Validate prerequisites](#step-1--validate-prerequisites)
- [Step 1.5 — Fetch existing Jira Test Cases](#step-15--fetch-existing-jira-test-cases)
- [Step 1.6 — UI wireframe discovery (optional)](#step-16--ui-wireframe-discovery-optional)
- [Step 2 — Parse both TC sets](#step-2--parse-both-tc-sets)
- [Step 3 — Deduplicate and merge](#step-3--deduplicate-and-merge)
- [Step 4 — Write merged markdown](#step-4--write-merged-markdown)
- [Step 5 — Gap analysis: suggest missing Test Cases](#step-5--gap-analysis-suggest-missing-test-cases)
- [Step 6 — Assign test tags](#step-6--assign-test-tags)
- [Step 7 — Report and next steps](#step-7--report-and-next-steps)

---

## STEP 1 — VALIDATE PREREQUISITES

### 1a. Resolve inputs

All positional arguments are optional. The skill auto-detects files and derives FeatureName
from filenames when arguments are omitted.

**Optional positional arguments:**
- `FeatureName` — the shared feature label (e.g. `Reagents`, `Add_Employee`). Derived from
  filenames when not provided (see below).
- `FileA` — filename of the first TC markdown inside `test_cases/`
  (e.g. `Projects_TestCases.md`). Auto-detected when not provided.
- `FileB` — filename of the second TC markdown inside `test_cases/`
  (e.g. `Projects_TestCases_OpenAI.md`). Auto-detected when not provided.

**Optional flags:**
- `--out <filename>` — override the output filename inside `test_cases/`
  (default: `test_cases/<FeatureName>_TestCases.md` — always a new named file, never overwrites either input)
- `--wireframe-url=<url>` — optional. URL of the wireframe / UI prototype for this feature.
  If provided, wireframe context enriches the gap analysis to suggest UI-specific TCs.

#### Path resolution rule
- If the user provides a bare filename (e.g. `Projects_TestCases.md`), prepend `test_cases/`
  to get the full path.
- If the user already includes the folder prefix (`test_cases/...` or `./test_cases/...`),
  use it as-is — no double-prefix.
- The `--out` flag follows the same rule.

#### Auto-detect FileA and FileB from `./test_cases/`

When FileA and/or FileB are not provided, scan the folder:

```bash
ls test_cases/*.md 2>/dev/null
```

Apply the following logic based on how many `*.md` files are found:

- **0 files** → stop with error:
  `"No markdown files found in test_cases/. Please add TC files before running this skill."`

- **1 file** → warn and stop:
  `"Only one TC markdown file found in test_cases/: <filename>. A second file is required
  to merge. Please provide the second file (bare filename inside test_cases/)."`

- **2 files** → auto-assign (lexicographic order): first = FileA, second = FileB.
  Print confirmation before proceeding:
  `"Auto-detected — FileA: <name>, FileB: <name>"`

- **3 or more files** → list them and ask the user to pick two:
  ```
  Multiple TC markdown files found in test_cases/:
    1. <file1>
    2. <file2>
    3. <file3>
  Which is FileA (primary)? Which is FileB (additive)?
  Enter two numbers (e.g. 1 2):
  ```
  Wait for the user's response before continuing.

#### Derive FeatureName from filenames

When `FeatureName` is not supplied, derive it from the resolved FileA and FileB names:

1. Strip the `test_cases/` folder prefix from each filename.
2. Remove known suffixes (case-insensitive): `_TestCases_OpenAI.md`, `_TestCases_Merged.md`,
   `_TestCases_B.md`, `_TestCases.md`, `_TCs.md` — and any remaining `_*.md` suffix.
3. If both names produce the same result → use it as `FeatureName`.
4. If only one file is known → derive from that file's name.
5. If derivation fails or produces an empty / non-meaningful string → use `feature-name`.

Examples:
- `Projects_TestCases.md` + `Projects_TestCases_OpenAI.md` → `Projects`
- `Reagents_TestCases.md` + `Reagents_TCs_v2.md` → `Reagents`
- `fileA.md` + `fileB.md` → `feature-name`

Print the resolved values before proceeding:
```
Resolved inputs:
  FeatureName: <FeatureName>
  FileA:       test_cases/<FileA>
  FileB:       test_cases/<FileB>
  Output:      test_cases/<OUTPUT_FILENAME>
```

### 1b. Check files exist

```bash
ls test_cases/<FileA_resolved> 2>/dev/null && echo "A_OK" || echo "A_MISSING"
ls test_cases/<FileB_resolved> 2>/dev/null && echo "B_OK" || echo "B_MISSING"
```

If either is missing: print the full resolved path and stop.

---

## STEP 1.5 — FETCH EXISTING JIRA TEST CASES

Before parsing the input files, check whether existing Test Case issues are already linked
to the User Stories in Jira. When found, they are excluded from the merged output (so that
`/tcs-to-jira` does not create duplicates) and treated as covered in the gap analysis.

The skill always continues past this step — but when the fetch cannot run, it prints a
prominent warning so the user knows the merged output was **not** compared against Jira.

### 1.5a. Check for Jira mapping file

```bash
ls stories/<FeatureName>_Jira_IDs.json 2>/dev/null && echo "MAP_OK" || echo "MAP_MISSING"
```

- **MAP_OK** → read `stories/<FeatureName>_Jira_IDs.json` and extract the US Jira keys (values from `mapping` object). Proceed to credentials check.

- **MAP_MISSING** → print:
  `"stories/<FeatureName>_Jira_IDs.json not found — attempting to derive from local TC mapping files."`

  Then scan for a TC mapping file:

  ```bash
  ls test_cases/<FeatureName>_Jira_TCs*.json 2>/dev/null | head -1
  ```

  **If a TC mapping file is found:**

  Read it and extract all unique `parentJiraKey` string values from the `mapping` object. Write a minimal `stories/<FeatureName>_Jira_IDs.json` to the `stories/` folder (create folder if needed):

  ```json
  {
    "feature": "<FeatureName>",
    "mapping": { "US-<slug1>": "<key1>", "US-<slug2>": "<key2>", ... },
    "generatedFrom": "<TC mapping filename>"
  }
  ```

  Print: `"Derived <N> US Jira key(s) from <filename> → stories/<FeatureName>_Jira_IDs.json written."`

  Set `usKeys` to the extracted keys and proceed to the credentials check below.

  **If no TC mapping file is found either:**

  Print: `"No Jira mapping or TC mapping files found for <FeatureName> — Jira TC comparison skipped. Run /jira-uss-to-tcs first to generate these files."`

  Skip to Step 2. This is a normal first-run state — no warning is needed.

Also verify Jira credentials are set:

```bash
cd <project-root> && node -e "
require('./node_modules/dotenv').config();
console.log('BASE_URL=' + (process.env.JIRA_BASE_URL    || '(not set)'));
console.log('EMAIL='    + (process.env.JIRA_EMAIL        || '(not set)'));
console.log('TOKEN='    + (process.env.JIRA_API_TOKEN    ? 'set' : '(not set)'));
console.log('PROJECT='  + (process.env.JIRA_PROJECT_KEY  || '(not set)'));
"
```

If any Jira credential is missing: print the warning below and skip to Step 2:
```
⚠ WARNING — Jira deduplication skipped for <FeatureName>
  Reason : Missing Jira environment variable(s): <list unset vars>
  Impact : Existing Jira Test Cases were NOT compared against the merged set.
           /tcs-to-jira may create duplicate TCs if any already exist in Jira.
  Fix    : Add the missing variable(s) to .env and re-run /merge-tc-sets.
```

### 1.5b. Fetch existing linked Test Cases

→ Script template: [SCRIPTS.md#1-fetch-existing-jira-test-cases](SCRIPTS.md#1-fetch-existing-jira-test-cases)

Write, run, and clean up the fetch script per the SCRIPTS.md template.

If the script exits with code 1 (Jira error): print the warning below, set `existingJiraTcs = []`, and continue to Step 2:
```
⚠ WARNING — Jira deduplication skipped for <FeatureName>
  Reason : Jira fetch script failed — <error message from script output>
  Impact : Existing Jira Test Cases were NOT compared against the merged set.
           /tcs-to-jira may create duplicate TCs if any already exist in Jira.
  Fix    : Check your Jira credentials and network access, then re-run /merge-tc-sets.
```

Use the Read tool to read `tmp_existing_tcs_<FeatureName>.json`. Build a flat `existingJiraTcs[]` array by merging all `byUsKey` values.

Delete the temp file (see SCRIPTS.md for the exact command).

Print a summary:
```
Step 1.5 — Existing Jira Test Cases:
  US PROJ-5692: 7 existing TC(s) found
  US PROJ-5693: 3 existing TC(s) found
Total existing Jira TCs: 10 — will be excluded from merged set and gap analysis.
```

If `totalExisting === 0`:
```
Step 1.5 — No existing Test Cases found in Jira — full merge will run.
```

`existingJiraTcs[]` is available to Steps 3 and 5b.

---

## STEP 1.6 — UI WIREFRAME DISCOVERY (OPTIONAL)

> **Skip condition**: If invoked from within a pipeline orchestrator, set `wireframeContext = null` and skip.

### 1 — Resolve wireframe URL

- If `--wireframe-url=<url>` was present in the invocation text: use `<url>`.
- Otherwise: use `AskUserQuestion`:
  - **Question**: `"Do you have a wireframe / UI prototype URL for this feature? (Providing one enriches the gap analysis to suggest UI-specific TCs.)"`
  - **Option A** — label: `"Yes — enter URL"`, description: `"Type the URL in the Other field below"`
  - **Option B** — label: `"No — skip wireframe"`, description: `"Gap analysis will focus on AC/DoD coverage gaps only"`

  If user selects "No" or provides no URL: set `wireframeUrl = ''`.

### 2 — Skip if no URL

If `wireframeUrl` is empty:
```
No wireframe provided — gap analysis will focus on AC/DoD coverage gaps only.
```
Set `wireframeContext = null`. Continue to Step 2.

### 3 — Capture wireframe

If `wireframeUrl` is non-empty:

1. `mcp__playwright__browser_navigate` → `wireframeUrl`
2. `mcp__playwright__browser_snapshot` → capture accessibility tree
3. `mcp__playwright__browser_take_screenshot` → visual confirmation

Parse snapshot into:
```
wireframeContext = {
  url: <wireframeUrl>,
  elements: [ { role, name, label, placeholder, testId, selector }, ... ]
}
```

Derive `selector` (priority): `[data-testid="..."]` → `<tag>[aria-label="..."]` → `*:has-text("...")`

Print:
```
Wireframe captured: <wireframeUrl> — <N> interactive elements identified.
  role=button   name="Create"   selector=[data-testid="create-btn"]
  ...
```

`wireframeContext` is available to Step 5b (gap analysis).

---

## STEP 2 — PARSE BOTH TC SETS

Read and parse both markdown files using the standard TC block format:

```
### Story: US-<FeatureName>-<USTitleSlug>
**Test Case ID:** TC-<TitleSlug>: <Full Title>
**Type:** <type>
**Preconditions:** <text>
**Steps:**
1. <action>
**Expected Result:** <text>
```

Extract per TC: `storyHeading`, `tcId`, `title`, `type`, `preconditions`, `steps[]`, `expectedResult`.

Print a parse summary:

```
File A: <FileA>  →  <N_A> Test Cases across <M_A> User Stories
File B: <FileB>  →  <N_B> Test Cases across <M_B> User Stories
```

---

## STEP 3 — DEDUPLICATE AND MERGE

### Deduplication strategy (in this priority order)

1. **Exact TC ID match** — if the same `TC-<TitleSlug>` exists in both files, keep File A's
   version (primary source) and log `"Duplicate TC ID: <id> — kept File A version"`.
2. **Title similarity** — compare every File B TC title against every File A TC title using
   normalised Levenshtein ratio (strip articles/punctuation, lowercase, compare word sets).
   If similarity ≥ 0.80, treat as duplicate. Keep File A's version. Log
   `"Near-duplicate: '<File B title>' ≈ '<File A title>' (similarity=<ratio>) — kept File A"`.
3. **Unique TCs from File B** — all File B TCs that are not duplicates are appended after the
   last TC of their matching `### Story:` group. If the story heading does not exist in File A,
   a new `### Story:` group is added at the end of the merged file.
4. **Already in Jira** *(only when `existingJiraTcs[]` is non-empty from Step 1.5)* — after
   rules 1–3 are applied, compare every TC in the candidate merged set (from File A and
   unique File B TCs) against each entry in `existingJiraTcs[]` using the same normalised
   Levenshtein ratio. If similarity ≥ 0.80, mark the TC as `ALREADY IN JIRA` and exclude it
   from the merged set. Log `"TC-Foo already covered in Jira (PROJ-67890) — excluded"`. This
   prevents `/tcs-to-jira` from creating duplicate issues on the next run.

### TC ID collision on unique TCs

If a File B TC is unique by content but its `tcId` collides with a File A TC id
(different titles, same slug), suffix the File B TC id with `-B`:
`TC-Valid_Employee_Creation` → `TC-Valid_Employee_Creation-B`. Log the rename.

### Build the merged TC list (in memory)

Keep the story grouping from File A as the base. Append unique File B TCs under their
correct story heading.

Print a merge preview before writing:

```
Merge preview for: <FeatureName>

From File A (kept as-is):        <N_A_kept> Test Cases
From File B (unique, added):     <N_B_added> Test Cases
Duplicates discarded (A vs B):   <N_dup> Test Cases
Already in Jira (excluded):      <N_ado> Test Cases
─────────────────────────────────────────────────────
Total in merged set:             <N_total> Test Cases

Duplicate details (A vs B):
  [TC-Valid_Employee_Creation] exact match — kept File A
  ["Verify Employee Form Validation" ≈ "Invalid Missing Fields"] similarity=0.83 — kept File A

Already in Jira (excluded from merged set):
  TC-Boundary_Max_Employee_Records → ALREADY IN JIRA (PROJ-67890) — excluded
  TC-Security_SQL_Injection_Name   → ALREADY IN JIRA (PROJ-67891) — excluded

Unique TCs added from File B:
  TC-Concurrent_Save_Conflict      (added under US-Add_Employee-Add_New_Employee_Record)
```

The `Already in Jira (excluded)` line and section are **omitted entirely** when `existingJiraTcs[]`
is empty (Step 1.5 was skipped or found zero TCs). Do not show a `0 Test Cases` line in that case.

Confirm with the user before writing (show `"Write merged files? [y/N]"`).

---

## STEP 4 — WRITE MERGED MARKDOWN

Serialize the merged TC list to the output path using the **exact same format** as
`/uss-to-tcs` — grouped by parent User Story.

→ Script template: [SCRIPTS.md#3-write-merged-markdown](SCRIPTS.md#3-write-merged-markdown)

Write, run, and clean up the serializer script per the SCRIPTS.md template.

---

## STEP 5 — GAP ANALYSIS: SUGGEST MISSING TEST CASES

Analyse the merged TC set for coverage gaps and suggest additional Test Cases that neither
File A nor File B generated. This is a **Claude reasoning step** — no script is needed.

**Wireframe-enriched gap analysis (when `wireframeContext` is non-null):**

When wireframe context is available, the gap analysis identifies missing TCs for:
- **Form fields** not yet covered by positive/negative/boundary TCs
- **Dropdown options** or selections not yet exercised
- **Buttons and navigation** elements visible in the wireframe but not yet in merged TCs
- **Modal/dialog interactions** discovered from wireframe snapshots
Suggest new TCs to cover these UI-specific scenarios (in addition to AC/DoD gaps).

### 5a. Load User Stories context (optional but recommended)

Check for a local User Stories markdown to get the full acceptance criteria text:

```bash
ls stories/<FeatureName>_UserStories.md 2>/dev/null && echo "US_MD_OK" || echo "US_MD_MISSING"
ls stories/<FeatureName>_Jira_IDs.json  2>/dev/null && echo "US_IDS_OK" || echo "US_IDS_MISSING"
```

- If `stories/<FeatureName>_UserStories.md` exists: read it for acceptance criteria text.
- If only `stories/<FeatureName>_Jira_IDs.json` exists: derive context from story slugs + TC
  content already parsed.
- If neither exists: proceed with gap analysis based solely on the merged TC set.

#### Extract Definition of Done (optional)

Scan **three sources** per User Story for a "Definition of Done" section — in this priority
order (first match per story wins):

**Source 1 — `stories/<FeatureName>_UserStories.md`** (when available; primary source)

Scan each User Story block in the markdown file. Recognise DoD in either form:

1. **Separate heading** — a markdown heading (`#`–`######`) whose text is exactly
   `Definition of Done` (case-insensitive). DoD content = text until the next heading of
   equal or higher level, or end of the User Story block.

2. **Bold inline title** — `**Definition of Done**` or `__Definition of Done__`
   (case-insensitive) appearing as a standalone bold line or prefixing a bullet list.
   DoD content = the remainder of that paragraph / bullet list.

**Source 2 — Jira `description`, `acceptanceCriteria`, and comments** (optional; requires Jira credentials)

When `stories/<FeatureName>_Jira_IDs.json` is available and no DoD was found in the markdown,
check whether Jira env vars are set:

```bash
cd <project-root> && node -e "
require('./node_modules/dotenv').config();
console.log('BASE_URL=' + (process.env.JIRA_BASE_URL    || '(not set)'));
console.log('EMAIL='    + (process.env.JIRA_EMAIL        || '(not set)'));
console.log('TOKEN='    + (process.env.JIRA_API_TOKEN    ? 'set' : '(not set)'));
console.log('PROJECT='  + (process.env.JIRA_PROJECT_KEY  || '(not set)'));
"
```

If all four are set, write and run a script to fetch the `description`, `acceptanceCriteria`,
and issue comments for each US Jira key found in `stories/<FeatureName>_Jira_IDs.json`:

→ Script template: [SCRIPTS.md#2-fetch-user-story-comments-definition-of-done](SCRIPTS.md#2-fetch-user-story-comments-definition-of-done)

Write, run, and clean up the fetch script per the SCRIPTS.md template.

After running, read `tmp_us_comments_<FeatureName>.json` (structure: `{ fieldsMap, commentsMap }`)
and scan **three sub-sources per story** in this priority order (first match wins):

1. `fieldsMap[key].description` — Jira issue description (Atlassian Document Format JSON, strip to plain text)
2. `fieldsMap[key].acceptanceCriteria` — Jira acceptance criteria custom field
3. `commentsMap[key]` — concatenated issue comment body

**Detection patterns** applied identically to all sub-sources (same as jira-uss-to-tcs):

| Pattern | Examples |
| --- | --- |
| HTML heading (`<h1>`–`<h6>`) or markdown heading (`#`–`######`) whose text is "Definition of Done" (case-insensitive) | `<h2>Definition of Done</h2>` \| `## Definition of Done` |
| Bold/inline title anywhere in the text | `<b>Definition of Done</b>` \| `<strong>Definition of Done</strong>` \| `**Definition of Done**` |

DoD content = all text until the next heading of equal or higher level (or end of block).
Strip all HTML/ADF markup from the extracted DoD block and store as plain text.

Delete `tmp_us_comments_<FeatureName>.json` after extraction is complete (see SCRIPTS.md for
the exact command).

If Jira env vars are **not** set, skip the Jira fetch silently — no error.

**Overall priority order across all sources** (first match per story wins):

```
Source 1 (userStoriesMd)  →  Source 2a (Jira description)  →  Source 2b (Jira acceptanceCriteria)  →  Source 2c (Jira comment)
```

**Recording the source**

For each story, record which source provided the DoD:

```
dodSource: "userStoriesMd" | "description" | "acceptanceCriteria" | "comment" | null
```

Print a summary once all sources have been scanned:

```
Definition of Done found in <N> of <Total> User Stories — will be used in Lens 5 gap analysis.
  US-Add_Employee-Add_New_Employee_Record  →  source: description
  US-Add_Employee-Validate_Required_Fields →  source: comment
```

If no DoD is found in any source, print:
```
No Definition of Done sections detected — Lens 5 will be skipped.
```

### 5b. Coverage gap analysis

**Jira-existing TCs as additional coverage context**

When `existingJiraTcs[]` is non-empty (from Step 1.5), treat those TCs as additional covered TCs
alongside the merged set for **all lenses below**. They were already excluded from the merged
output (Rule 4 in Step 3) precisely because they exist in Jira — but they still represent real
coverage that should suppress gap suggestions.

Print this header before gap analysis begins when Jira TCs are present:
```
Note: <N> existing Jira TCs are included in coverage analysis (excluded from merged set).
```

For each `### Story:` group in the merged set, apply all four lenses using both the merged TCs
**and** any `existingJiraTcs[]` entries whose labels or US mapping aligns with the story:

**Lens 1 — Type coverage per story**

Every story should have at least one TC of each applicable role: Positive, Negative, Boundary, Security. Also check for DB and API TCs when the feature involves data persistence or API interactions.
Flag any missing role per story:

```
US-Add_Employee-Add_New_Employee_Record  →  Positive ✓  Negative ✓  Boundary ✗  Security ✗  DB ✗  API ✗
US-Add_Employee-Validate_Required_Fields →  Positive ✓  Negative ✓  Boundary ✓  Security ✗  DB ✗  API ✗
```

**Lens 2 — Acceptance Criteria coverage** (when US markdown is available)

Read each AC bullet point and check whether at least one TC in the merged set directly tests
that condition. Flag AC bullets with zero TC coverage.

**Lens 3 — Scenario pattern heuristics**

Scan TC titles and steps for known patterns and flag common missing scenarios:

| Pattern detected in TCs | Likely missing scenario |
| --- | --- |
| "required fields" / "mandatory" | Boundary: exactly minimum required fields filled |
| "upload" / "file" | Negative: unsupported file type; Boundary: max file size |
| "delete" / "remove" | Negative: delete non-existent item; Security: delete without permission |
| "search" / "filter" | Boundary: empty search; Boundary: special characters in search |
| "list" / "grid" / "table" | Boundary: empty state (zero rows); Boundary: large dataset |
| "login" / "auth" / "permission" | Security: expired session; Security: role without permission |
| "save" / "submit" | Negative: concurrent save by two users; Boundary: max field length |
| "export" / "download" | Negative: export with no data; Boundary: large export |
| "database" / "persist" / "store" / "record" / "transaction" | DB: data saved correctly to DB; DB: duplicate key rejected; DB: rollback on failure |
| "api" / "endpoint" / "request" / "response" / "payload" | API: correct status code returned; API: response schema validated; API: error payload on failure |

**Lens 4 — Numeric / date field completeness**

If any TC step references numeric input or date fields, flag if there is no:
- Boundary TC for the minimum allowed value
- Boundary TC for the maximum allowed value
- Negative TC for out-of-range input

**Lens 5 — Definition of Done coverage** *(skipped when no DoD was found in Step 5a)*

For each User Story that has a `definitionOfDone`, check whether each DoD criterion has at
least one TC in the merged set whose steps or expected result verifiably demonstrates that
criterion is met.

- Compare criterion text against TC steps and expected results using keyword / semantic
  matching (e.g. "code reviewed" need not have a TC; skip non-testable process criteria).
- Flag only testable DoD criteria (observable via UI, API, or system state) that have no
  corresponding TC.

Example output:
```
US-Add_Employee-Add_New_Employee_Record
  DoD: "All required fields validated on save"  →  covered by TC-Invalid_Missing_Fields ✓
  DoD: "Duplicate employee ID rejected"         →  no TC found ✗
  DoD: "Audit log entry created on add"         →  no TC found ✗
```

### 5c. Generate suggested TCs

For each identified gap, generate a fully formed suggested TC using the same quality
standards as `/uss-to-tcs`:

- `tcId` = `TC-<TitleSlug>` with a new unique slug not already in the merged set
- `title`, `type`, `preconditions`, `steps[]`, `expectedResult` — complete, specific, not vague
- Mark each suggestion with source `[SUGGESTED — gap: <lens + reason>]` in parentheses after
  the title on one line (this comment is for the preview only — never written to the file)

### 5d. Present suggestions and ask for selection

Print the gap analysis report and suggestions:

```
Gap Analysis for: <FeatureName>

Coverage gaps identified: <N_gaps>

─── Lens 1: Missing TC types ──────────────────────────────────────────────
  US-Add_Employee-Add_New_Employee_Record
    ✗ Boundary — no boundary TC exists for this story
    ✗ Security — no security TC exists for this story
    ✗ DB — no DB TC exists for this story (data persistence/integrity applicable)
    ✗ API — no API TC exists for this story (API interactions applicable)

─── Lens 3: Heuristic patterns ────────────────────────────────────────────
  "required fields" detected → no Boundary TC for minimum-fields scenario

─── Lens 5: Definition of Done coverage ───────────────────────────────────
  US-Add_Employee-Add_New_Employee_Record
    ✗ "Duplicate employee ID rejected" — no TC found
    ✗ "Audit log entry created on add" — no TC found

─── Suggested TCs ─────────────────────────────────────────────────────────

[S1] TC-Boundary_Min_Required_Fields: Submit Form With Minimum Required Fields Only
     Type: Boundary | Story: US-Add_Employee-Add_New_Employee_Record
     Gap reason: No boundary TC covers minimum-fields scenario

[S2] TC-Security_Unauthorized_Employee_Create: Create Employee Without Permission
     Type: Security | Story: US-Add_Employee-Add_New_Employee_Record
     Gap reason: No security TC exists for this story

[S3] TC-Security_Unauthorized_Field_Edit: Edit Required Fields Without Admin Role
     Type: Security | Story: US-Add_Employee-Validate_Required_Fields
     Gap reason: No security TC exists for this story

─────────────────────────────────────────────────────────────────────────
Total suggestions: 3

Include which suggestions? Enter numbers (e.g. 1,3), "all", or "none":
```

Wait for the user's response.

### 5e. Append accepted suggestions to the merged set

For each accepted suggestion, generate the full TC block (complete steps, not just a title)
and append it under the correct `### Story:` heading in the in-memory merged set.

If the merged markdown file was **already written** in Step 4 before suggestions were accepted,
**re-write** the output file with the accepted suggestions appended. Print:

```
Appended <N> accepted suggestions to <OUTPUT_PATH>
```

If the user selects "none", print:
`"No suggestions accepted — merged file unchanged."` and continue to Step 7.

---

## STEP 6 — ASSIGN TEST TAGS

After the final merged TC list is confirmed (including accepted gap-analysis suggestions),
Claude assigns tags to every TC automatically. No user input is required.

### 6a. Tier tag(s) — assigned to EVERY TC

Assign one or both tier tags per TC based on analysis. Every TC must receive at least one
tier tag — no TC is left untagged.

**@Smoke** — assign when the TC meets this profile:
- TC type is Positive
- TC covers the primary happy path for its User Story (the first/simplest success scenario,
  e.g. "Successfully create a valid record", "Login with valid credentials")
- The scenario is fast to execute and reveals a critical breakage if it fails on a new deploy
- Guideline: prefer 1–2 @Smoke TCs per User Story; flag more only when multiple distinct
  critical paths exist

**@Regression** — assign when the TC covers broad or deep validation:
- All Negative TCs
- All Boundary TCs
- All Security TCs
- DB and API TCs
- Positive TCs that are secondary / alternate success paths
- Any TC that is not a fast critical-path check

**Both @Smoke AND @Regression** — assign when:
- The TC is the primary happy-path scenario (qualifies for @Smoke) AND
- It is important to keep it in the full regression suite as a baseline for comparing future
  runs (e.g. the most fundamental create/update/delete flow for a core entity)
- Claude uses judgment: if unsure, prefer both over just one

### 6b. Automation tag — assigned to qualifying TCs only

Additionally assign `@automation` (on top of the tier tag) if the TC meets ALL criteria:

1. **Deterministic steps** — every action maps to a concrete UI interaction (click, fill,
   navigate) or API call; no step requires visual comparison of images, reading physical
   printouts, or human judgment calls.
2. **Programmable preconditions** — the test setup can be replicated via API, test data
   seeding, or browser navigation; does not require physical hardware access or manual
   environment changes.
3. **Verifiable expected result** — the outcome is a UI state change, element presence/absence,
   text value, network response, or database record — something an assertion can check.
4. **Compatible type** — Positive, Negative, or Boundary; or Security TCs that test
   UI-level access control (permission denied, role-based UI hiding). Exclude Security TCs
   that test social engineering, physical access, or server-side pen-testing.
5. **Not a one-time manual operation** — TCs that exist to verify a one-time data migration,
   configuration change, or release checklist item are excluded.

### 6c. Print tagging rationale before writing

```
Test Tag Assignment: <FeatureName>
────────────────────────────────────────────────────────────────────────
Story: US-<slug>-<storySlug>
  TC-Valid_Login            @Smoke      @automation  primary happy path
  TC-Invalid_Password       @Regression @automation  negative scenario
  TC-Blank_Username         @Regression @automation  negative scenario
  TC-SQL_Injection_Username @Regression @automation  UI-level security (access control)
  TC-Manual_PDF_Review      @Regression              requires manual visual check

Story: US-<slug>-<storySlug2>
  TC-Add_Valid_Employee     @Smoke @Regression @automation  primary happy path; included in both suites
  TC-Duplicate_Employee     @Regression @automation         negative scenario
  TC-Max_Field_Length       @Regression @automation         boundary scenario
...
────────────────────────────────────────────────────────────────────────
Tags summary:
  @Smoke:        <X>  TCs  (<A> automated, <B> manual)
  @Regression:   <Y>  TCs  (<C> automated, <D> manual)
  @automation:   <N>  TCs  total
```

### 6d. Apply tags in memory

Set `tc.tags` for every TC (tier tags first, `@automation` last):

- `@Smoke` + `@automation`                   → `tc.tags = ['@Smoke', '@automation']`
- `@Smoke` + `@Regression` + `@automation`   → `tc.tags = ['@Smoke', '@Regression', '@automation']`
- `@Smoke` + `@Regression` (manual)          → `tc.tags = ['@Smoke', '@Regression']`
- `@Smoke` only (manual)                     → `tc.tags = ['@Smoke']`
- `@Regression` + `@automation`              → `tc.tags = ['@Regression', '@automation']`
- `@Regression` only (manual)               → `tc.tags = ['@Regression']`

### 6e. Re-write merged markdown with tags

Re-run the Step 4 serializer (SCRIPTS.md#3-write-merged-markdown) with the updated in-memory
TC list. This overwrites the file from Step 4 with an otherwise identical file that now
includes `**Tags:**` lines on every TC.

Print:
```
Merged markdown re-written with test tags: <OUTPUT_PATH>
```

### 6f. Update JSON mapping (if present)

If `test_cases/<FeatureName>_Jira_TCs.json` exists (produced earlier this run or already on
disk), update the `tags` array for every entry to match the assigned tags.

Write the updated JSON back to `test_cases/<FeatureName>_Jira_TCs.json`.

Print:
```
JSON mapping updated: test_cases/<FeatureName>_Jira_TCs.json
  @Smoke: <X> TCs  (@automation: <A>)
  @Regression: <Y> TCs  (@automation: <C>)
```

If no JSON mapping exists, skip 6f silently — the markdown tags are sufficient.

---

## STEP 7 — REPORT AND NEXT STEPS

Print a final summary:

```
merge-tc-sets — Complete for: <FeatureName>

Output file:
  Markdown: <OUTPUT_PATH>

TC counts:
  File A TCs kept:             <N_A_kept>
  File B unique TCs added:     <N_B_added>
  Duplicates removed (A vs B): <N_dup>
  Already in Jira (excluded):  <N_ado>   ← omit this line when N_ado = 0
  Suggestions accepted:        <N_suggestions_accepted> of <N_suggestions_total>
  Total TCs in final set:      <N_total>

Test tags:
  @Smoke TCs:              <X>  (<A> automated, <B> manual)
  @Regression TCs:         <Y>  (<C> automated, <D> manual)
  @automation TCs total:   <N>

Recommended next steps:

  A. Push TCs to Jira (creates Test Plan + Suite + TC issues with labels):
       /tcs-to-jira <FeatureName>
     Requires: stories/<FeatureName>_Jira_IDs.json
     Labels (@Smoke, @Regression, @automation) are written to labels on each issue.

  B. Generate Playwright scripts for @automation TCs (local markdown):
       /tcs-to-plscript <FeatureName>
     No Jira connection required — reads @automation tag from merged markdown directly.

  C. Generate Playwright scripts from Jira (after option A):
       /jira-tcs-to-plscript --tag @automation
     Generates scripts only for TCs labelled @automation in Jira.
     Use --tag @Smoke to generate the smoke suite only.
```

### Cleanup verification

Every temp file created in this workflow (`<FeatureName>_fetch_existing_tcs.js`,
`tmp_existing_tcs_<FeatureName>.json`, `<FeatureName>_fetch_comments.js`,
`tmp_us_comments_<FeatureName>.json`, `write_merged_tcs_<FeatureName>.js`) is deleted
immediately after use in its own step (see SCRIPTS.md for the exact `rm -f` commands). Before
declaring the skill complete, confirm none remain:

```bash
ls <FeatureName>_fetch_existing_tcs.js tmp_existing_tcs_<FeatureName>.json \
   <FeatureName>_fetch_comments.js tmp_us_comments_<FeatureName>.json \
   write_merged_tcs_<FeatureName>.js 2>/dev/null && echo "LEFTOVER TEMP FILES FOUND" || echo "CLEAN"
```

If any are found, delete them before printing the Step 7 summary.

---

## RULES (full detail)

1. Never overwrite either input file. The merged result is always written to a new file
   named `test_cases/<FeatureName>_TestCases.md` (or the path specified via `--out`).
2. File A is always the primary source — all File A TCs are kept unchanged.
3. Deduplication removes File B TCs, never File A TCs.
4. TC ID suffix `-B` is applied only when needed (id collision on otherwise unique TC).
5. The merged markdown must use the exact same format as `/uss-to-tcs` output so that
   downstream skills (`tcs-to-jira`, `tcs-to-plscript`) parse it correctly.
6. Gap analysis suggestions must be **fully formed TCs** — never vague stubs. Every
   suggestion must have a complete `tcId`, `title`, `type`, `preconditions`, `steps[]`,
   and `expectedResult` that could be pushed to Jira unchanged.
7. Suggestions are never written to the file without the user explicitly accepting them.
   Show the full TC block for each suggestion so the user can evaluate quality before
   deciding.
8. Accepted suggestions are appended in the same `### Story:` group as their parent.
   If a suggestion spans a story not in the merged set, create a new `### Story:` group.
9. The skill does NOT push anything to Jira — the user runs `/tcs-to-jira` afterwards.
10. No auto-chaining — inform the user of the next steps to run.
11. Every TC in the merged set receives at least one tier tag: `@Smoke`, `@Regression`, or
    both. No TC is left without a tier tag after Step 6. A TC may carry both when it
    qualifies as a critical happy-path check AND should be retained in full regression runs.
12. `@automation` is an additional (optional) tag assigned on top of the tier tag(s). A TC
    tagged `@automation` always also has at least one of `@Smoke` or `@Regression`.
13. Tags are stored in two places: the `**Tags:**` field in the markdown TC block (semicolon-
    separated, tier tags first, `@automation` last) and the `tags` array in the JSON mapping
    entry. Both are kept in sync by Step 6f (updates `test_cases/<FeatureName>_Jira_TCs.json`).
14. Tagging is fully automatic — no user prompting. The criteria in Steps 6a and 6b are the
    sole basis for tag assignment.
15. Every temp file written to the project root during this workflow is deleted with `rm -f`
    in the same step that consumed it — never left behind after the skill completes.
