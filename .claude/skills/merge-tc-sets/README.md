# merge-tc-sets

## What it does

Merges two locally saved Test Case sets (markdown + optional JSON mapping) for the same
feature into a single combined, deduplicated set, then performs a **coverage gap analysis**
to suggest additional Test Cases that neither source generated. Designed for the workflow
where **Claude** and **OpenAI** independently generate Test Cases from the same User Stories
— this skill combines both sets, removes duplicates, fills identified coverage gaps (with
your approval), and produces a clean output ready for:

- `/tcs-to-ado <FeatureName>` — push merged TCs to ADO (Test Plan + Suite + work items)
- `/tcs-to-plscript <FeatureName>` — generate Playwright automation scripts locally

If `stories/<FeatureName>_ADO_IDs.json` is present, the skill also fetches Test Case work
items already linked to the User Stories in ADO, **excludes** them from the merged output
(preventing `/tcs-to-ado` from creating duplicate work items), and counts them as covered
in the gap analysis so no gaps are flagged for criteria already tested in ADO.

After the merged and deduplicated set is finalised (including accepted gap-analysis
suggestions), Claude **automatically assigns test tags** to every TC — no user input required:

- **`@Smoke`** — primary happy-path Positive TCs for each User Story; run on every deploy
  for a quick sanity check.
- **`@Regression`** — all other TCs (negative, boundary, secondary positive, security);
  run on major releases and PRs for full regression coverage.
- A TC may carry **both `@Smoke` and `@Regression`** when it is the primary happy-path
  baseline that should also be included in full regression runs (Claude decides per TC).
- **`@automation`** *(additional)* — added on top of the tier tag(s) when the TC has
  deterministic steps, programmable preconditions, and a machine-verifiable result.
  Manual-only TCs (visual checks, physical interaction, one-time ops) do not receive this tag.

Tags are stored in the markdown (`**Tags:** @Smoke; @automation`) and in the JSON mapping
(`"tags": ["@Smoke", "@automation"]`), so `/tcs-to-ado` writes them to `System.Tags` in
ADO and downstream skills can filter on them.

---

## Input

All positional arguments are optional — files are auto-detected from `./test_cases/` and
`FeatureName` is derived from their names when arguments are omitted.

| Parameter | Required | Description |
| --- | --- | --- |
| `FeatureName` | No | Shared feature label (e.g. `Reagents`). Derived from filenames when omitted; falls back to `feature-name`. |
| `FileA` | No | Filename inside `test_cases/` — primary source (e.g. `Projects_TestCases.md`). Auto-detected when omitted. |
| `FileB` | No | Filename inside `test_cases/` — additive source (e.g. `Projects_TestCases_OpenAI.md`). Auto-detected when omitted. |
| `--out <filename>` | No | Output filename inside `test_cases/` (default: `test_cases/<FeatureName>_TestCases.md`). Never overwrites either input file. |
| `--wireframe-url=<url>` | No | Optional. URL of the wireframe/UI prototype (e.g. Figma, Zeplin). When provided, enriches gap analysis by capturing UI elements and suggesting missing TCs for form fields, dropdowns, buttons, navigation, and modals. |

**Path resolution:** bare filenames are auto-prefixed with `test_cases/`. Full paths with the
prefix already included are used as-is.

**Auto-detection behaviour** (when files are not specified):

- **0 files in `test_cases/`** → error, stops
- **1 file** → warns a second file is required, stops and asks for it
- **2 files** → auto-assigns (lexicographic order), prints resolved names, proceeds
- **3+ files** → lists all files and asks the user to pick two by number

---

## Steps

### Step 1 — Validate Prerequisites

Resolves input paths, checks both markdown files exist, reports any missing JSON mapping files
(not required — merge proceeds without them).

---

### Step 1.5 — Fetch Existing ADO Test Cases

Runs automatically after Step 1. Attempts to fetch all Test Case work items already linked
to the User Stories in ADO so duplicates are excluded from the merged output and gap analysis
treats those TCs as already covered.

1. Reads US ADO IDs from `stories/<FeatureName>_ADO_IDs.json`
2. Writes and runs `<FeatureName>_fetch_existing_tcs.js` — expands **all** relations per US
   (regardless of type), batch-fetches linked work items, keeps only those of type `Test Case`,
   and deduplicates by ID
3. Stores results in `existingAdoTcs[]` (flat list across all USs)
4. Deletes the temp file immediately after reading

```text
Step 1.5 — Existing ADO Test Cases:
  US #5692: 7 existing TC(s) found
  US #5693: 3 existing TC(s) found
Total existing ADO TCs: 10 — will be excluded from merged set and gap analysis.
```

`existingAdoTcs[]` is used in Step 3 (deduplication Rule 4) and Step 6 (gap analysis).

Behaviour depends on what is found:

| Scenario | What happens |
| --- | --- |
| Mapping file present, fetch runs, TCs found | Normal deduplication (Rule 4 in Step 3) |
| Mapping file present, fetch runs, 0 TCs found | Informational message — continue normally |
| Mapping file present, credentials missing | ⚠ WARNING — continue without ADO comparison |
| Mapping file present, fetch script error | ⚠ WARNING — continue without ADO comparison |
| Mapping file missing, `test_cases/<FeatureName>_ADO_TCs*.json` found | Auto-generates `stories/<FeatureName>_ADO_IDs.json` from `parentAdoId` values → proceeds to fetch |
| Mapping file missing, no TC mapping file either | Info message — skip (normal first-run state, no warning) |

---

### Step 2 — Parse Both TC Sets

Reads and parses both markdown files using the standard TC block format (same as `/uss-to-tcs`
output). Prints a summary of how many TCs and stories were found in each file.

---

### Step 3 — Deduplicate and Merge

Deduplication is applied in priority order:

| Priority | Rule | Action |
| --- | --- | --- |
| 1 | Exact TC ID match (`TC-<TitleSlug>`) | Keep File A version; log and discard File B duplicate |
| 2 | Title similarity ≥ 0.80 (normalised Levenshtein) | Keep File A version; log near-duplicate |
| 3 | Unique TC from File B | Append under its `### Story:` group in the merged file |
| 4 | TC (from File A or B) whose title matches an existing ADO TC (similarity ≥ 0.80) | Exclude from merged set; log "already covered in ADO (#ID)" — only applied when `existingAdoTcs[]` is non-empty from Step 1.5 |

If a File B TC is content-unique but its `tcId` collides with a File A ID, the File B TC
is renamed with a `-B` suffix (e.g. `TC-Valid_Employee_Creation-B`).

The skill shows a merge preview and asks for confirmation before writing any files.

---

### Step 4 — Write Merged Markdown

Serializes the merged TC list to the output path using the **exact same format** as
`/uss-to-tcs` — grouped by `### Story:` heading. Downstream skills parse this format
natively.

---

### Step 5 — Merge JSON Mappings (if both exist)

If both TC mapping JSON files are available (`test_cases/<FeatureName>_ADO_TCs.json`),
merges them:

- Prefers real ADO IDs over `null` (e.g. if File B has real IDs from an ADO run)
- Appends unique File B entries (with `-B` suffix if renamed)
- Preserves `testPlanId`, `testSuiteId`, `localOnly` metadata

---

### Step 6 — Gap Analysis: Suggest Missing TCs

Before gap analysis runs, the skill optionally loads User Stories context from two sources
(checked in priority order):

1. **Local markdown** — `stories/<FeatureName>_UserStories.md` (read for acceptance criteria text)
2. **ADO fetch** — when `stories/<FeatureName>_ADO_IDs.json` exists, the skill fetches
   `System.Description`, `Microsoft.VSTS.Common.AcceptanceCriteria`, and work item comments
   for each User Story directly from Azure DevOps. This allows Definition of Done detection
   even when no local User Stories markdown is present.

If neither source is available, gap analysis proceeds based solely on the merged TC set
(Lenses 1, 3, and 4 still apply; Lenses 2 and 5 are skipped).

#### Definition of Done detection

When User Stories context is loaded (from either source), the skill scans for a Definition
of Done section using the following patterns:

| Source | Heading pattern | Inline bold pattern |
| --- | --- | --- |
| Local markdown | `# Definition of Done` … `###### Definition of Done` (any heading level) | `**Definition of Done**` |
| ADO description / AC | `<h1>`–`<h6>` tags titled "Definition of Done" (case-insensitive) | `<b>Definition of Done</b>` or `<strong>Definition of Done</strong>` |
| ADO comments | Same HTML patterns as above | Same as above |

Detection priority per story: local markdown → ADO description → ADO acceptance criteria → ADO comment (first match wins).

The source that provided the DoD is tracked as `dodSource`:
`"userStoriesMd"` | `"description"` | `"acceptanceCriteria"` | `"comment"` | `null`

---

When `existingAdoTcs[]` is non-empty (from Step 1.5), those TCs are treated as additional
coverage alongside the merged set for all five lenses — gaps are only flagged for criteria
not covered by either the merged set OR the ADO-existing TCs.

Analyses the merged set for coverage gaps using five lenses:

- **Lens 1 — Type coverage per story:** flags any story missing a Positive, Negative,
  Boundary, or Security TC; also checks for DB and API TCs when the feature involves
  data persistence or API interactions
- **Lens 2 — AC coverage** (when User Stories context is available): flags acceptance
  criteria bullets with no directly covering TC
- **Lens 3 — Heuristic patterns:** detects keywords like `required fields`, `upload`,
  `delete`, `search`, `login`, `export`, `database`/`persist`/`transaction`, and
  `api`/`endpoint`/`payload` — flags commonly missing edge-case, DB, and API scenarios
- **Lens 4 — Numeric/date fields:** flags missing min-value, max-value, and out-of-range
  Boundary/Negative TCs when numeric or date inputs are referenced in steps
- **Lens 5 — Definition of Done coverage** (when a DoD section is detected): checks whether
  each DoD criterion is covered by at least one TC in the merged set; suggests dedicated TCs
  for uncovered criteria (type defaults to `Positive`; `Boundary` for constraint criteria;
  `Security` for access or quality-gate criteria; `DB` for data persistence/integrity
  criteria; `API` for API contract or response validation criteria)

For each gap, generates a **fully formed suggested TC** (complete `tcId`, `title`, `type`,
`preconditions`, `steps[]`, `expectedResult`) — never a stub. Suggestions are shown with
their gap reason and the user selects which to include (`1,3`, `all`, or `none`). Accepted
suggestions are appended to the output file and added to the JSON mapping with
`adoId: null, suggested: true`.

---

### Step 7 — Assign Test Tags

Automatically (no prompting) assigns tier and automation tags to every TC in the final
merged set.

**Tier tags — every TC receives one or both:**

| Tag | Assigned when |
| --- | --- |
| `@Smoke` | Primary happy-path Positive TC for a User Story |
| `@Regression` | Broader coverage TCs — negative, boundary, security, secondary positive |
| `@Smoke` + `@Regression` | Primary happy-path TC that should also be retained in full regression runs |

**Automation tag — added on top of tier tag(s) when eligible:**

| Tag | Assigned when |
| --- | --- |
| `@automation` | TC has deterministic steps, programmable preconditions, and a machine-verifiable result; type is Positive/Negative/Boundary or UI-level Security |

Prints a per-story tagging table with rationale, re-writes the merged markdown with
`**Tags:**` lines on every TC, and updates the JSON mapping `tags` arrays.

```text
Tags summary:
  @Smoke:        5 TCs  (3 automated, 2 manual)
  @Regression:  12 TCs  (9 automated, 3 manual)
  @automation:  12 TCs  total
```

---

### Step 8 — Report and Next Steps

Prints a final summary (TC counts including accepted suggestions, tag counts, output paths)
and shows the recommended next commands.

---

## All artifacts produced

| Artifact | Location | Notes |
| --- | --- | --- |
| Merged TC markdown | `test_cases/<FeatureName>_TestCases.md` (or `--out` path) | Always produced; every TC block includes `**Tags:** @Smoke; @automation` or `**Tags:** @Regression` etc. |
| Merged TC mapping JSON | `test_cases/<FeatureName>_ADO_TCs.json` | Only when both JSON mappings are present; every entry's `"tags"` array contains tier tag(s) and optionally `"@automation"` |

---

## Usage Examples

### 1. Merge two TC sets (no wireframe)

```bash
/merge-tc-sets Projects Projects_TestCases.md Projects_TestCases_OpenAI.md
```

Merges Claude-generated and OpenAI-generated TCs into one file, deduplicates, performs gap analysis, and assigns tags. The skill will prompt via `AskUserQuestion` asking if you have a wireframe URL to provide.

### 2. With wireframe URL for UI-aware gap analysis

```bash
/merge-tc-sets Projects Projects_TestCases.md Projects_TestCases_OpenAI.md --wireframe-url=https://figma.com/file/abc123/projects-ui
```

When a wireframe URL is provided:
- The skill captures all interactive UI elements (form fields, dropdowns, buttons, navigation, modals)
- Gap analysis includes wireframe-specific recommendations for missing TCs
- Example: wireframe shows "Project Status" dropdown → suggests TCs for each status value, invalid selection, empty state
- Suggests TCs for all form fields (positive and negative validation), buttons, modals, and navigation links not covered by existing TCs

### 3. Merge with ADO coverage exclusion + wireframe

```bash
/merge-tc-sets Reagents --wireframe-url=https://staging.example.com/reagents
```

If `stories/Reagents_ADO_IDs.json` exists from a prior `/ado-uss-to-tcs --local-only` run:
- Step 1.5 fetches existing TCs already linked to User Stories in ADO
- Merged output excludes those TCs (no duplicates when pushed to ADO later)
- Gap analysis treats ADO-existing TCs as covered — suggests only TCs for actual gaps
- Wireframe enhances gap detection by identifying missing UI-specific scenarios

### 4. Auto-detect input files + wireframe + compare coverage

```bash
/merge-tc-sets --wireframe-url=https://figma.com/design/projects
```

With no file arguments, the skill auto-detects files in `test_cases/`:
- 2 files found → auto-merges them
- Multiple files → lists them and asks which two to merge
- Wireframe context enriches gap analysis
- Merged TCs are tagged and ready for `/tcs-to-ado` or `/tcs-to-plscript`

### 5. Full workflow: Merge + push to ADO + generate scripts with wireframe

```bash
# Step 1: Generate Claude TCs from ADO USs (local)
/ado-uss-to-tcs projects-create --local-only --wireframe-url=https://figma.com/design/projects

# Step 2: Merge with OpenAI TCs (from external tool)
/merge-tc-sets Projects --wireframe-url=https://figma.com/design/projects

# Step 3: Push merged TCs to ADO
/tcs-to-ado Projects

# Step 4: Generate Playwright scripts from merged TCs
/tcs-to-plscript test_cases/Projects_TestCases.md --wireframe-url=https://figma.com/design/projects --execute-tests=true
```

---

## Typical workflow

This skill fits into the multi-AI TC generation workflow:

```text
Step 1.  /ado-uss-to-tcs <FeatureName> --local-only
           └─ Fetches USs from ADO
           └─ Generates TCs with Claude (in memory)
           └─ Saves: test_cases/<FeatureName>_TestCases.md          ← Claude TCs
           └─ Saves: test_cases/<FeatureName>_ADO_TCs.json          (adoId: null)
           └─ Saves: stories/<FeatureName>_ADO_IDs.json             (real US ADO IDs)

Step 2.  [Manual or external script]
           └─ Generate TCs with OpenAI from the same USs
           └─ Save to: test_cases/<FeatureName>_TestCases_OpenAI.md

Step 3.  /merge-tc-sets
           └─ Step 1.5: fetches TCs already linked to USs in ADO (uses stories/<F>_ADO_IDs.json)
           └─ Deduplicates both sets + excludes TCs already in ADO (Rule 4)
           └─ Gap analysis treats ADO-existing TCs as covered — no redundant suggestions
           └─ Saves merged: test_cases/<FeatureName>_TestCases.md   ← new TCs only
           └─ Updates: test_cases/<FeatureName>_ADO_TCs.json        (if JSON present)

Step 4.  /tcs-to-ado <FeatureName>
           └─ Reads merged test_cases/<FeatureName>_TestCases.md
           └─ Reads stories/<FeatureName>_ADO_IDs.json  (from Step 1)
           └─ Creates ADO Test Plan + Suite + TC work items with TestedBy links
           └─ Writes @Smoke / @Regression / @automation to System.Tags on each TC

Step 5a. /tcs-to-plscript <FeatureName>
           └─ Reads merged markdown, generates scripts for @automation TCs
           └─ Auto-chains to polish-generated-code

Step 5b. /ado-tcs-to-plscript --tag @automation   (after Step 4)
           └─ Fetches TCs tagged @automation from ADO
           └─ Use --tag @Smoke to generate the smoke suite only
```

---

## Deduplication details

| Case | Example | Action |
| --- | --- | --- |
| Exact TC ID | `TC-Valid_Employee_Creation` in both | Discard File B; keep File A |
| Near-duplicate title (≥ 0.80) | "Verify employee creation" ≈ "Valid Employee Creation" | Discard File B; keep File A; log similarity |
| Unique TC from File B | `TC-Boundary_Max_Employee_Count` not in File A | Add to merged set under same story group |
| TC ID collision on unique TC | Different title, same slug | Add with `-B` suffix: `TC-Valid_Employee_Creation-B` |

File A is always the **primary source** — its TCs are never removed or modified.

---

## Error handling

- Stops with a clear message if either input markdown file is missing.
- Never writes output without user confirmation (shows merge preview first).
- If `--keep-both` is passed, never overwrites either input file.
- JSON merge is skipped gracefully if only one (or neither) JSON mapping file exists.
- **Step 1.5 (ADO fetch) is non-fatal but never silent** — if `stories/<FeatureName>_ADO_IDs.json` is absent, ADO credentials are missing, or the fetch script fails, the skill prints a `⚠ WARNING` block explaining the reason, the impact (merged output was not compared against ADO; `/tcs-to-ado` may create duplicates), and the fix. The merge then continues with `existingAdoTcs[]` empty — no TCs are excluded and gap analysis treats the merged set as the sole source of coverage.
- No auto-chaining — next steps are printed as recommendations.

---

## When to use this vs. related skills

| Scenario | Use |
| --- | --- |
| Combine Claude TCs + OpenAI TCs for the same feature | `merge-tc-sets` |
| After merge, push TCs to ADO (Test Plan + Suite) | `tcs-to-ado` |
| After merge, generate Playwright scripts | `tcs-to-plscript` |
| Generate TCs from ADO User Stories (Claude) | `ado-uss-to-tcs --local-only` |
| Generate TCs from a local User Stories markdown | `uss-to-tcs` |
