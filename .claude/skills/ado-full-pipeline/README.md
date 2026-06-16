# ado-full-pipeline

## What it does

An **end-to-end, single-invocation pipeline** that mirrors `brd-full-pipeline` but adds two Azure DevOps push phases (1.5 and 2.5). It generates all content locally **and** pushes it to Azure DevOps — User Story work items, a Test Plan, a Static Test Suite, and Test Case work items — then commits everything to a feature branch.

Supports the same flexible entry-point detection as `brd-full-pipeline`, plus two ADO-specific re-push entry points. ADO push phases are **skipped gracefully** if the required env vars are not set, so local generation always proceeds.

---

## Input

| Variable | Description |
|----------|-------------|
| `{{input_brd}}` | Raw BRD text, a `from <keyword> <FeatureName>` entry point, or `status <FeatureName>`. |

**Required environment variables** (ADO push phases only — skipped if absent)

| Variable | Description |
|----------|-------------|
| `AZURE_DEVOPS_ORG_URL` | e.g. `https://dev.azure.com/your-org` |
| `AZURE_PROJECT_NAME` | Your ADO project name |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT with Work Items read/write and Test Plans read/write |

---

## Pipeline phases

### Phase 0 — Setup

Derives naming tokens from the feature name and creates required directories. Also checks ADO env vars and prints a warning (but does not stop) if any are missing.

| Token | Format | Example |
|-------|--------|---------|
| `FeatureName` | Underscored | `Add_Employee` |
| `PageName` | PascalCase | `AddEmployee` |
| `feature-slug` | lowercase-hyphenated | `add-employee` |
| `branch-name` | `feature/<FeatureName>` | `feature/Add_Employee` |

---

### Phase 0.5 — Entry Point Detection

Determines where the pipeline should begin using a 3-tier priority system.

**Tier 1 — Explicit `from` keyword**

| Input | Start at |
|-------|----------|
| Raw BRD text / `from brd` | Phase 1 |
| `from stories <FeatureName>` | Phase 2 (reads existing stories file) |
| `from test-cases <FeatureName>` | Phase 3 (reads existing TC file) |
| `from ado-stories <FeatureName>` | Phase 1.5 only (re-push stories to ADO) |
| `from ado-test-cases <FeatureName>` | Phase 2.5 only (re-push TCs to ADO) |

**Tier 2 — Filesystem state** (no `from` keyword)

Checks for: `test_cases/<FeatureName>_ADO_TCs.json` → Phase 3; `test_cases/<FeatureName>_TestCases.md` → Phase 3; `stories/<FeatureName>_ADO_IDs.json` → Phase 2; `stories/<FeatureName>_UserStories.md` → Phase 2; none → Phase 1.

**Tier 3 — Inline content auto-detection** — same markers as `brd-full-pipeline`.

**`status` command** — `status <FeatureName>` prints the full pipeline state table (all 7 phases) and stops.

---

### Phase 1 — BRD → User Stories

Applies the INVEST principle to produce atomic, testable User Stories with Acceptance Criteria.

**Saved to:** `stories/<FeatureName>_UserStories.md`

---

### Phase 1.5 — User Stories → ADO Work Items

Auto-invokes `/ado-uss-to-tcs <FeatureName>`. Creates User Story work items in Azure DevOps and saves the mapping.

**Saved to:** `stories/<FeatureName>_ADO_IDs.json`

Skipped with a warning if ADO env vars are absent. On error, prompts: `"Continue to Phase 2 anyway? (yes / stop)"`.

---

### Phase 2 — User Stories → Test Cases

Converts each User Story's Acceptance Criteria into step-by-step manual test cases. There is no cap on the number of TCs per User Story. Coverage spans all seven test types: **Positive**, **Negative**, **Boundary/Edge**, **Security**, **Performance**, **DB** (data persistence, integrity, transactions), and **API** (contract validation, status codes, payload schema, error responses) — wherever applicable. After the initial pass a gap analysis is run — any AC scenarios, edge cases, security concerns, performance aspects, DB interactions, or API contracts without a TC are identified and backfilled before saving.

**Saved to:** `test_cases/<FeatureName>_TestCases.md`

---

### Phase 2.5 — Test Cases → ADO Test Plan + Suite

Auto-invokes `/tcs-to-ado <FeatureName>`. Creates a Test Plan, Static Test Suite, and Test Case work items with step XML and TestedBy links.

**Saved to:** `test_cases/<FeatureName>_ADO_TCs.json`

Skipped with a warning if ADO env vars are absent. On error, prompts: `"Continue to Phase 3 anyway? (yes / stop)"`.

---

### Phase 3 — Test Cases → Playwright Scripts

Generates a Page Object Model class and a test spec file following Playwright best practices.

**Saved to:**
- `scripts/pages/<PageName>.page.ts`
- `scripts/tests/<feature-slug>.spec.ts`

---

### Phase 3.5 — Polish Generated Code

Auto-chains `/polish-generated-code` to refine the generated TypeScript files.

---

### Phase 4 — Git Branch & Commit

Creates a feature branch, stages all generated artifacts (including ADO mapping JSONs if they were produced), and commits them.

```bash
git checkout -b feature/<FeatureName>
git add stories/<FeatureName>_UserStories.md
git add stories/<FeatureName>_ADO_IDs.json        # if Phase 1.5 ran
git add test_cases/<FeatureName>_TestCases.md
git add test_cases/<FeatureName>_ADO_TCs.json     # if Phase 2.5 ran
git add scripts/pages/<PageName>.page.ts
git add scripts/tests/<feature-slug>.spec.ts
git commit -m "feat(<FeatureName>): add user stories, test cases, playwright scripts, and ADO work items"
```

---

## All artifacts produced

| Artifact | Path | Description |
|----------|------|-------------|
| User Stories | `stories/<FeatureName>_UserStories.md` | Agile User Stories with Acceptance Criteria |
| US ADO mapping | `stories/<FeatureName>_ADO_IDs.json` | US ID → ADO work item ID |
| Test Cases | `test_cases/<FeatureName>_TestCases.md` | Manual test cases with explicit steps |
| TC ADO mapping | `test_cases/<FeatureName>_ADO_TCs.json` | TC ID → ADO WI ID + Plan + Suite IDs |
| Page Object Model | `scripts/pages/<PageName>.page.ts` | Playwright POM class (TypeScript) |
| Test Spec | `scripts/tests/<feature-slug>.spec.ts` | Playwright test spec (TypeScript) |
| Git branch | `feature/<FeatureName>` | All artifacts committed |
| (ADO) User Story WIs | Azure DevOps | Tagged + created in project |
| (ADO) Test Plan | Azure DevOps | `Automated: <FeatureName>` |
| (ADO) Test Suite | Azure DevOps | Static suite under the Test Plan |
| (ADO) Test Case WIs | Azure DevOps | Step XML + TestedBy links to parent USs |

---

## Error handling

- **Missing ADO env vars** — Phases 1.5 and 2.5 are skipped with a printed warning; all local generation continues normally.
- **Phase 1.5 or 2.5 failure** — prompts the user to continue or stop rather than aborting silently.
- **Git errors** — all files are still saved locally; the user is warned to commit manually.
- The pipeline never aborts mid-phase — content generation always completes before any file-save or git operation is attempted.

---

## When to use this vs. individual skills

| Scenario | Use |
|----------|-----|
| Full BRD → local files + ADO work items + commit in one command | `ado-full-pipeline` |
| Only want local files (no ADO push) | `brd-full-pipeline` |
| Push User Stories from ADO, generate TCs, push TCs back | `ado-uss-to-tcs` |
| Push local Test Cases markdown to ADO Test Plan | `tcs-to-ado` |
| Resume pipeline from existing User Stories | `/ado-full-pipeline from stories <FeatureName>` |
| Resume pipeline from existing Test Cases | `/ado-full-pipeline from test-cases <FeatureName>` |
| Re-push stories to ADO only (no re-generation) | `/ado-full-pipeline from ado-stories <FeatureName>` |
| Re-push test cases to ADO only (no re-generation) | `/ado-full-pipeline from ado-test-cases <FeatureName>` |
| Check pipeline state | `/ado-full-pipeline status <FeatureName>` |

---

## Complete flow

```
{{input_brd}} / from <keyword> <FeatureName> / status <FeatureName>
      │
      ▼ Phase 0 — workspace setup + ADO env check
      │
      ▼ Phase 0.5 — entry-point detection
  ┌──────────────────────────────────────────────────────────────┐
  │ from brd / BRD content detected             → Phase 1        │
  │ from stories / stories/<name>.md exists     → Phase 2        │
  │ from test-cases / test_cases/<name>.md      → Phase 3        │
  │ from ado-stories                            → Phase 1.5 only │
  │ from ado-test-cases                         → Phase 2.5 only │
  │ status <FeatureName>                        → state table    │
  └──────────────────────────────────────────────────────────────┘
      │
      ▼ Phase 1  — User Stories ────────────────────────────────► stories/<FeatureName>_UserStories.md
      │
      ▼ Phase 1.5 — ado-uss-to-tcs (skipped if no ADO env vars) ─► ADO User Story WIs
      │                                                            stories/<FeatureName>_ADO_IDs.json
      │
      ▼ Phase 2  — Test Cases ──────────────────────────────────► test_cases/<FeatureName>_TestCases.md
      │
      ▼ Phase 2.5 — tcs-to-ado (skipped if no ADO env vars) ───► ADO Test Plan + Suite + TC WIs
      │                                                            test_cases/<FeatureName>_ADO_TCs.json
      │
      ▼ Phase 3  — Playwright Scripts ─────────────────────────► scripts/pages/<PageName>.page.ts
      │                                                           scripts/tests/<feature-slug>.spec.ts
      │
      ▼ Phase 3.5 — polish-generated-code
      │
      ▼ Phase 4  — git branch feature/<FeatureName> ──────────► commit all artifacts
```
