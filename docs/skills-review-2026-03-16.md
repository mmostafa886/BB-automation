# SKILLS Review & Gap Analysis — 2026-03-16

> Branch reviewed: `fix-reagents`

---

## Q1 — Does any workflow create a TestPlan + Test Suite + TCs in ADO?

**YES — `TCs_To_ADO` creates all three.** It is not skipped by default; it runs whenever its prerequisites are met.

### What it creates in ADO

| ADO Artifact | Detail |
| --- | --- |
| **Test Plan** | `Automated: <FeatureName>` |
| **Static Test Suite** | Named `<FeatureName>`, nested under the plan |
| **Test Case work items** | One per TC, with proper step XML (`ActionStep` format) |
| **Traceability links** | `TestedBy-Reverse` — each TC linked to its parent User Story |

### What it saves locally

| File | Content |
| --- | --- |
| `test_cases/<FeatureName>_ADO_TCs.json` | Test Plan ID + Suite ID + `tcId → ADO WI ID` mapping |

### Required inputs

| Requirement | Detail |
| --- | --- |
| `test_cases/<FeatureName>_TestCases.md` | Local TC markdown (produced by `USs_To_TCs` or `BRD_Full_Pipeline`) |
| `stories/<FeatureName>_ADO_IDs.json` | US → ADO ID mapping (produced by `USs_To_ADO`) |
| `AZURE_DEVOPS_ORG_URL` | ADO org URL env var |
| `AZURE_PROJECT_NAME` | ADO project name env var |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT with Work Items + Test Plans read/write |

### When it is called

- **Automatically:** `ADO_Full_Pipeline` Phase 2.5 (skipped only if ADO env vars are absent)
- **Directly:** `/TCs_To_ADO <FeatureName>`

### Idempotency guard

If `test_cases/<FeatureName>_ADO_TCs.json` already exists, the skill warns and requires
explicit `confirm overwrite` before proceeding — preventing duplicate Test Plans.

---

## Q2 — Can ADO User Stories generate Playwright scripts directly?

**YES — two steps, no manual intervention required (OPT-3 implemented).**

`USs_To_ADO` now auto-patches `config/testCaseFilter.js` (Step 5.5) immediately after
saving the TC mapping. You can run `ADO_TCs_To_PLScript` directly afterwards.

```text
Step 1:  /USs_To_ADO <feature-tag-or-ids>
         └─ Fetches ADO User Stories
         └─ Derives TCs from Acceptance Criteria (in-memory)
         └─ Creates TC work items in ADO
         └─ Saves: test_cases/<FeatureName>_ADO_TCs.json
         └─ Step 5.5: patches config/testCaseFilter.js (append-only, no manual step)

Step 2:  /ADO_TCs_To_PLScript <module-name>
         └─ Reads config/testCaseFilter.js
         └─ Fetches TCs from ADO
         └─ Generates 4-layer Playwright scripts
         └─ Auto-chains to Polish_Generated_Code
```

### How Step 5.5 patches the filter (append-only)

| Case | Behaviour |
| --- | --- |
| Module already exists | Appends only IDs not yet in `testCaseIds`; skips duplicates |
| Module does not exist | Adds new entry + appends to `activeModules` |
| `config/testCaseFilter.js` missing | Warns and skips — skill does not fail |
| All new IDs already present | Prints "no changes" and exits cleanly |

Existing entries, comments, and file formatting are **never touched**.

### OPT-1 (future) — single-command `ADO_USs_To_PLScript` skill

For a single `/ADO_USs_To_PLScript <tag>` command that runs both steps in one invocation,
a new orchestrator skill is still planned (see OPT-1 below). The two-step path above
already works without manual intervention.

---

## Q3 — Can ADO TCs generate Playwright scripts directly?

**YES — `ADO_TCs_To_PLScript` does exactly this.**

### How it works

1. Reads `config/testCaseFilter.js` → resolves active modules and their TC IDs
2. Fetches TCs from ADO in batches (max 200 IDs per call)
3. Parses ADO step XML (`<steps>/<step>/<parameterizedString>`)
4. Generates 4 TAF layers per module:

| Layer | Output |
| --- | --- |
| Locators | `src/locators/<page-kebab>-page-locators.ts` |
| Page class | `src/pages/<page-kebab>-page-self-healing.ts` |
| POM registration | `src/pages/pom-lazy-self-healing.ts` (updated in-place) |
| Spec files | `tests/generated/<Module>/tc-<id>-<slug>.spec.ts` (one per TC) |

Then auto-chains to `Polish_Generated_Code`.

### Usage

```bash
/ADO_TCs_To_PLScript Reagents           # single module
/ADO_TCs_To_PLScript Login,Reagents     # comma-separated modules
/ADO_TCs_To_PLScript                    # all active modules in filter config
```

### Key constraint

TC IDs must already be present in `config/testCaseFilter.js` under the correct module.
Existing spec files are **never overwritten** (idempotent).

---

## Q4 — Local TC markdown only (no JSON mapping) — push to ADO? Generate PL scripts?

### A. Push to ADO — blocked without the US mapping file

`TCs_To_ADO` hard-requires `stories/<FeatureName>_ADO_IDs.json`:

```text
MAP_MISSING: "stories/<FeatureName>_ADO_IDs.json not found. Run /USs_To_ADO first." Stop.
```

#### Workarounds (ranked by effort)

| Option | Effort | Notes |
| --- | --- | --- |
| Run `/USs_To_ADO <feature-tag>` first | Low | Best path when USs already exist in ADO; generates the mapping automatically |
| Manually create `stories/<FeatureName>_ADO_IDs.json` | Medium | If you know the ADO US IDs: `{ "feature": "X", "mapping": { "US-X-Story1": 12345 }, "errors": [] }` |
| OPT-2: Add `--no-link` flag to `TCs_To_ADO` | Low (skill edit) | Creates TCs in ADO without US links; saves TC mapping file; no mapping file needed |

### B. Generate PL scripts — works today without any mapping

`TCs_To_PLScript` only needs `test_cases/<FeatureName>_TestCases.md`:

```bash
/TCs_To_PLScript Reagents   # reads test_cases/Reagents_TestCases.md
```

- No ADO connection required
- No JSON mapping required
- Generates all 4 TAF layers locally
- Auto-chains to `Polish_Generated_Code`

---

## Recommended Optimizations

### OPT-1 — New skill: `ADO_USs_To_PLScript`

**Problem:** No single skill bridges ADO User Stories → Playwright scripts.

**Proposed skill behaviour:**

1. Accepts feature tag / area path / work item IDs
2. Fetches USs from ADO, derives TCs, pushes to ADO (reuses `USs_To_ADO` logic)
3. Auto-updates `config/testCaseFilter.js` with the new TC IDs
4. Chains to `ADO_TCs_To_PLScript` → `Polish_Generated_Code`

**Invoke as:** `/ADO_USs_To_PLScript <feature-tag-or-ids>`

---

### OPT-2 — Add `--no-link` mode to `TCs_To_ADO`

**Problem:** `TCs_To_ADO` fails hard if the US mapping file is absent, even when the user
only wants to push TCs to ADO without traceability links.

**Proposed change to `TCs_To_ADO/SKILL.md`:**

- If user passes `--no-link` or `standalone`:
  - Skip the `stories/<FeatureName>_ADO_IDs.json` check
  - Create TCs without `TestedBy-Reverse` relations
  - Log `"created without US link"` per TC
  - Still save `test_cases/<FeatureName>_ADO_TCs.json` (without `testPlanId`/`testSuiteId` if
    Test Plan creation is also skipped)

---

### OPT-3 — ✅ IMPLEMENTED: `USs_To_ADO` auto-updates `config/testCaseFilter.js`

**Status:** Implemented in `USs_To_ADO/SKILL.md` as Step 5.5 (2026-03-16).

**What was added:** A Node.js string-patch script that runs automatically after Step 5
(report & cleanup). It reads the new ADO TC IDs from the saved mapping and injects them
into `config/testCaseFilter.js` using in-place string patching — never a full rewrite.

**Key properties of the implementation:**

- Uses `require()` to parse the existing config and detect already-present IDs
- Uses string-position search to inject IDs before the closing `]` of the target array
- Never removes existing IDs, never loses inline comments, never reformats the file
- New modules are appended at the end of the `modules` array with a dated description
- Fails gracefully if `config/testCaseFilter.js` is absent (warns + continues)

---

### OPT-5 — ✅ IMPLEMENTED: `USs_To_ADO --save-local` and `--local-only`

**Status:** Implemented in `USs_To_ADO/SKILL.md` as Step 3.5 (2026-03-16). Enhanced
`--local-only` to also save `stories/<FeatureName>_ADO_IDs.json` (2026-03-16).

**Problem:** No skill fetched ADO User Stories, generated Test Cases from them, and saved
the result locally as a markdown file. `USs_To_ADO` was fully ADO-native (input and output
both in ADO) so the generated TCs were never persisted locally.

**What was added:** Two new optional flags:

- `--save-local` — Step 3.5 serializes the in-memory `testCases[]` to
  `test_cases/<FeatureName>_TestCases.md` using the exact same format as `/USs_To_TCs`.
  ADO write (Steps 4, 5, 5.5) still runs.
- `--local-only` — Step 3.5 saves the markdown, Step 4 (ADO write) is skipped, Step 5
  saves three files locally and Step 5.5 is skipped:
  - `test_cases/<FeatureName>_TestCases.md` — TC markdown (from Step 3.5)
  - `test_cases/<FeatureName>_ADO_TCs.json` — mapping with `adoId: null`, `"localOnly": true`
  - `stories/<FeatureName>_ADO_IDs.json` — **real ADO US IDs** from Step 2, using the same
    slug keys as the markdown headings. This unlocks `TCs_To_ADO` for a later push without
    any manual setup.

**Usage:**

```bash
/USs_To_ADO add-employee --save-local   # ADO write + local markdown
/USs_To_ADO add-employee --local-only   # all three files locally, no ADO write
```

---

### OPT-6 — ✅ IMPLEMENTED: `Merge_TC_Sets` skill (multi-AI TC workflow)

**Status:** Implemented as `.claude/skills/Merge_TC_Sets/` (2026-03-16).

**Problem:** No skill existed to combine TC sets produced by different AI models (Claude +
OpenAI) into one unified, deduplicated set ready for downstream skills.

**New skill: `Merge_TC_Sets`**

Takes two TC markdown files for the same feature, deduplicates them, and writes a merged
output. Also merges the JSON mapping files if both are present.

**Deduplication rules (in priority order):**

| Priority | Rule | Action |
| --- | --- | --- |
| 1 | Exact TC ID match | Keep File A; discard File B duplicate |
| 2 | Title similarity ≥ 0.80 (normalised Levenshtein) | Keep File A; log near-duplicate |
| 3 | Unique TC from File B | Append under its story group |

File A is always the primary source — its TCs are never removed or modified.

**Complete multi-AI TC workflow:**

```text
Step 1.  /USs_To_ADO <FeatureName> --local-only
           └─ Fetches USs from ADO (real ADO IDs)
           └─ Generates TCs with Claude (in memory)
           └─ Saves: test_cases/<FeatureName>_TestCases.md    ← Claude TCs
           └─ Saves: test_cases/<FeatureName>_ADO_TCs.json    (adoId: null)
           └─ Saves: stories/<FeatureName>_ADO_IDs.json       (real US ADO IDs)

Step 2.  [External / manual]
           └─ Generate TCs with OpenAI from the same USs
           └─ Save to: test_cases/<FeatureName>_TestCases_OpenAI.md

Step 3.  /Merge_TC_Sets <FeatureName> test_cases/<FeatureName>_TestCases_OpenAI.md
           └─ Deduplicates both sets (File A primary)
           └─ Saves merged: test_cases/<FeatureName>_TestCases.md

Step 4.  /TCs_To_ADO <FeatureName>
           └─ Reads merged test_cases/<FeatureName>_TestCases.md
           └─ Reads stories/<FeatureName>_ADO_IDs.json  (from Step 1 — no manual setup)
           └─ Creates ADO Test Plan + Suite + TC work items with TestedBy links

Step 5.  /TCs_To_PLScript <FeatureName>
           └─ Reads merged test_cases/<FeatureName>_TestCases.md
           └─ Generates Playwright automation scripts
           └─ Auto-chains to Polish_Generated_Code
```

This workflow produces both an **ADO Test Plan** (Step 4) and **Playwright scripts** (Step 5).

---

### OPT-4 — `ADO_Full_Pipeline` ADO-first entry point

**Problem:** `ADO_Full_Pipeline` always starts from a BRD. There is no entry point for
"I already have User Stories in ADO; generate scripts without re-generating anything".

**Clarification:** `from ado-stories` re-pushes stories to ADO but does **not** flow through
to Phase 3 (Playwright generation). A `from ado-scripts <FeatureName>` entry point would:

- Skip Phases 1, 1.5, 2, 2.5
- Fetch TCs from ADO via `ADO_TCs_To_PLScript`
- Polish and commit

---

## Skill Dependency Map

```text
Local BRD
  └─ BRD_To_USs ──────────────────────► stories/*.md
       └─ USs_To_TCs ─────────────────► test_cases/*.md
            ├─ TCs_To_PLScript ────────► Playwright scripts (no ADO needed)
            └─ TCs_To_ADO ─────────────► ADO Test Plan + Suite + TCs
                  (requires stories/*_ADO_IDs.json)

ADO User Stories
  └─ USs_To_ADO ─────────────────────► ADO TCs + test_cases/*_ADO_TCs.json
       └─ Step 5.5 auto-patches config/testCaseFilter.js (no manual step)
       └─ --save-local → test_cases/*_TestCases.md
       └─ --local-only → test_cases/*_TestCases.md
                       + test_cases/*_ADO_TCs.json (adoId: null)
                       + stories/*_ADO_IDs.json (real US IDs — unlocks TCs_To_ADO)
            └─ ADO_TCs_To_PLScript ───► Playwright scripts + Polish

Multi-AI TC workflow (Claude + OpenAI):
  USs_To_ADO --local-only → [OpenAI step] → Merge_TC_Sets
       └─ TCs_To_ADO ──────────────────► ADO Test Plan + Suite + TCs
       └─ TCs_To_PLScript ─────────────► Playwright scripts + Polish

ADO Test Cases (IDs in config/testCaseFilter.js)
  └─ ADO_TCs_To_PLScript ────────────► Playwright scripts
       └─ Polish_Generated_Code ──────► (auto-chains)

Orchestrators:
  BRD_Full_Pipeline:   BRD → USs → TCs → PL (local, no ADO)
  ADO_Full_Pipeline:   BRD → USs → ADO USs → TCs → ADO TCs → PL → commit
```

---

## Summary

| Scenario | Supported today | Skill(s) | Gaps / Notes |
| --- | --- | --- | --- |
| Create ADO TestPlan + Suite + TCs | ✅ Yes | `TCs_To_ADO` | Needs local TC.md + US mapping JSON |
| ADO USs → Playwright scripts | ✅ Yes | `USs_To_ADO` then `ADO_TCs_To_PLScript` | OPT-3: filter auto-patched by Step 5.5; no manual step needed |
| ADO USs → local TC markdown | ✅ Yes | `USs_To_ADO --save-local` | OPT-5: Step 3.5 saves `test_cases/*_TestCases.md` |
| ADO USs → local markdown only (no ADO write) | ✅ Yes | `USs_To_ADO --local-only` | OPT-5 enhanced: saves 3 files — `_TestCases.md`, `_ADO_TCs.json` (null IDs), `stories/_ADO_IDs.json` (real IDs) |
| ADO TCs → Playwright scripts | ✅ Yes | `ADO_TCs_To_PLScript` | TC IDs must be in `config/testCaseFilter.js` |
| Local TC markdown only → push to ADO | ✅ Yes (if from `--local-only`) | `TCs_To_ADO` after `--local-only` | `stories/*_ADO_IDs.json` now saved automatically by `--local-only`; no manual setup needed |
| Local TC markdown only → push to ADO (no prior `--local-only`) | ⚠ Blocked | `TCs_To_ADO` fails without US mapping | Workaround: run `/USs_To_ADO` first or manually create JSON (OPT-2 planned) |
| Local TC markdown only → PL scripts | ✅ Yes | `TCs_To_PLScript` | No ADO connection needed |
| Combine Claude + OpenAI TC sets → ADO Test Plan + PL scripts | ✅ Yes | `USs_To_ADO --local-only` → `Merge_TC_Sets` → `TCs_To_ADO` → `TCs_To_PLScript` | OPT-6: full multi-AI workflow; produces both Test Plan and Playwright scripts |
