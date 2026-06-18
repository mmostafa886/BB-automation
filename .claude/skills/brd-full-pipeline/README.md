# brd-full-pipeline

## What it does

An **end-to-end, single-invocation pipeline** that takes a raw BRD and automatically executes all transformation and automation steps in sequence — from requirements to committed, runnable Playwright scripts.

It orchestrates three specialist roles (Product Owner, QA Analyst, Automation Engineer) without any manual hand-off between steps. All intermediate and final artifacts are saved locally, and a dedicated **git feature branch** is created and committed automatically.

---

## Input

| Variable | Description |
| --- | --- |
| `{{input_brd}}` | Raw BRD text **or** a file path to a BRD document (see supported formats below). |

### BRD source — `brd/` directory

All BRD files should be placed in the `brd/` folder at the project root. The pipeline resolves input using this priority order:

| Input | Resolution |
| --- | --- |
| *(empty)* | Auto-discovers the single BRD file in `brd/`; prompts if multiple exist |
| Bare filename — `Add_Employee.pdf` | Resolved as `brd/Add_Employee.pdf` |
| Relative/absolute path — `brd/Add_Employee.pdf` | Used as-is |
| Raw BRD text (multi-line) | Passed directly — no file lookup |

### Supported file formats

| Format | Extensions | Parser |
| --- | --- | --- |
| Plain text / Markdown | `.txt` `.md` | Read directly (UTF-8) |
| Word HTML / Legacy Word | `.doc` `.html` `.htm` | HTML tags stripped, entities decoded |
| Word Open XML | `.docx` | Auto-installs `mammoth` if absent |
| PDF | `.pdf` | Auto-installs `pdf-parse` if absent |
| Other | any | UTF-8 plain-text fallback |

> `mammoth` and `pdf-parse` are installed with `--no-save` — `package.json` is never modified.

---

## Pipeline phases

### Phase 0 — Setup

Derives all naming tokens from the BRD feature name and creates required directories.

| Token | Format | Example |
| --- | --- | --- |
| `FeatureName` | Underscored | `Add_Employee` |
| `PageName` | PascalCase | `AddEmployee` |
| `feature-slug` | lowercase-hyphenated | `add-employee` |
| `branch-name` | `feature/<FeatureName>` | `feature/Add_Employee` |

Directories created (if missing): `stories/`, `test_cases/`, `scripts/pages/`, `scripts/tests/`

---

### Phase 0.5 — Entry Point Detection

After workspace setup, determines where the pipeline should begin using a 3-tier priority system.

**Tier 1 — Explicit `from` keyword**

| Input | Start at |
| --- | --- |
| `from brd <text>` or no keyword | Phase 1 — BRD → User Stories |
| `from stories <FeatureName>` | Phase 2 — reads existing stories file |
| `from test-cases <FeatureName>` | Phase 3 — reads existing test-cases file |

**Tier 2 — Filesystem state** (when no `from` keyword)

Checks for existing files: `test_cases/<FeatureName>_TestCases.md` → Phase 3; `stories/<FeatureName>_UserStories.md` → Phase 2; neither → Phase 1.

**Tier 3 — Inline content auto-detection** (pasted text, no `from` keyword)

Scans first 20 lines for markers: `TC-*` / `**Test Case ID:**` → Phase 3; `US-*` / `**As a**` → Phase 2; neither → Phase 1 (treated as BRD).

**State announcement** — always printed before execution:

```text
BRD Pipeline — starting from Phase <N> (<PhaseName>) for feature: <FeatureName>
Reason: <explicit 'from' keyword | test_cases/<file> exists | stories/<file> exists | BRD content detected>
```

**`status` command** — `status <FeatureName>` prints the pipeline state table and stops without running any phase:

```text
BRD Pipeline State — <FeatureName>
──────────────────────────────────────────────────────────
Phase 1  BRD → User Stories        ✅ Complete / ⬜ Needed
Phase 2  User Stories → Test Cases ✅ Complete / ⬜ Needed
Phase 3  Test Cases → Playwright   ✅ Complete / ⬜ Needed
──────────────────────────────────────────────────────────
```

---

### Phase 1 — BRD → User Stories *(ProductOwnerSkill)*

Applies the INVEST principle to break the BRD into atomic, testable User Stories with Acceptance Criteria covering happy paths and error flows. There is **no cap** on the number of AC items per story — every distinct behaviour, constraint, and edge case gets its own criterion.

**Saved to:** `stories/<FeatureName>_UserStories.md`

---

### Phase 2 — User Stories → Manual Test Cases *(QAAnalystSkill)*

Converts each User Story's Acceptance Criteria into explicit, step-by-step test cases with exact field names, data values, and expected outcomes. There is no cap on the number of TCs per User Story. Coverage spans all seven test types: **Positive**, **Negative**, **Boundary/Edge**, **Security**, **Performance**, **DB** (data persistence, integrity, transactions), and **API** (contract validation, status codes, payload schema, error responses) — wherever applicable. After the initial pass a gap analysis is run — any AC scenarios, edge cases, security concerns, performance aspects, DB interactions, or API contracts without a TC are identified and backfilled before saving.

**Saved to:** `test_cases/<FeatureName>_TestCases.md`

---

### Phase 3 — Test Cases → Playwright Scripts *(AutomationEngineerSkill)*

Generates two TypeScript files following Playwright best practices and POM architecture:

- A Page Object Model class with encapsulated locators and action methods
- A test spec file with fully isolated `test()` blocks and web-first assertions

**Saved to:**

- `scripts/pages/<PageName>.page.ts`
- `scripts/tests/<feature-slug>.spec.ts`

---

### Phase 4 — Git Branch & Commit

Creates a feature branch, stages all generated artifacts, and commits them.

```bash
git init
git checkout -b feature/<FeatureName>
git add stories/<FeatureName>_UserStories.md
git add test_cases/<FeatureName>_TestCases.md
git add scripts/pages/<PageName>.page.ts
git add scripts/tests/<feature-slug>.spec.ts
git commit -m "feat(<FeatureName>): add user stories, test cases, and playwright scripts"
```

---

## All artifacts produced

| Artifact | Path | Description |
| --- | --- | --- |
| User Stories | `stories/<FeatureName>_UserStories.md` | Agile User Stories with Acceptance Criteria |
| Test Cases | `test_cases/<FeatureName>_TestCases.md` | Manual test cases with explicit steps |
| Page Object Model | `scripts/pages/<PageName>.page.ts` | Playwright POM class (TypeScript) |
| Test Spec | `scripts/tests/<feature-slug>.spec.ts` | Playwright test spec (TypeScript) |
| Git branch | `feature/<FeatureName>` | All artifacts committed |

---

## Error handling

- If git operations fail (e.g., no git installed or permission denied), all files are still saved locally and the user is warned to commit manually.
- The pipeline never aborts mid-phase — content generation always completes before any file-save or git operation is attempted.

---

## When to use this vs. individual skills

| Scenario | Use |
| --- | --- |
| New feature, full automation needed in one shot | `brd-full-pipeline` |
| Resume from existing User Stories | `/brd-full-pipeline from stories <FeatureName>` |
| Resume from existing Test Cases | `/brd-full-pipeline from test-cases <FeatureName>` |
| Check which phases are complete for a feature | `/brd-full-pipeline status <FeatureName>` |
| Regenerate only the User Stories for an existing feature | `brd-to-uss` |
| Regenerate only the test cases from updated stories | `uss-to-tcs` |
| Regenerate only the Playwright scripts from updated test cases | `tcs-to-plscript` |
| Set up a fresh workspace before using individual skills | `setup-workspace` |
| Full pipeline with Jira push | `jira-full-pipeline` |

---

## Complete flow

```text
{{input_brd}} / from <keyword> <FeatureName> / status <FeatureName>
      │
      ▼ Phase 0 — extract names, create directories
      │
      ▼ Phase 0.5 — entry-point detection
  ┌──────────────────────────────────────────────────────────┐
  │ from brd / BRD content detected           → Phase 1      │
  │ from stories / stories/<name>.md exists   → Phase 2      │
  │ from test-cases / test_cases/<name>.md    → Phase 3      │
  │ status <FeatureName>                      → state table  │
  └──────────────────────────────────────────────────────────┘
      │
      ▼ Phase 1 — User Stories ──────────────► stories/<FeatureName>_UserStories.md
      │
      ▼ Phase 2 — Test Cases ─────────────────► test_cases/<FeatureName>_TestCases.md
      │
      ▼ Phase 3 — Playwright Scripts ─────────► scripts/pages/<PageName>.page.ts
      │                                         scripts/tests/<feature-slug>.spec.ts
      │
      ▼ Phase 3.5 — polish-generated-code
      │
      ▼ Phase 4 — git branch feature/<FeatureName>  ──► commit all artifacts
```
