# AI Generation & Test Automation Pipeline

`pipelines/ai-generation.yml`

---

## Overview

This pipeline automates the full journey from a Business Requirements Document (BRD) to running, self-healing Playwright tests — using Claude Code skills as the execution engine.

```
BRD file in repo
      │
      ▼ Stage 1: AI Generation  (manual, opt-in)
  ADO_Full_Pipeline
      ├─ BRD → User Stories         (local file + ADO work items)
      ├─ User Stories → Test Cases   (local file + ADO Test Plan/Suite)
      ├─ Test Cases → Playwright     (POM + spec files)
      └─ git commit + push feature branch
      │
      ▼ Stage 2: Execute & Fix Tests  (currently disabled — re-enable when app is at BASE_URL)
  Execute_And_Fix_Tests
      ├─ Run Playwright tests
      ├─ Live-inspect failures (Playwright MCP browser)
      ├─ Auto-fix locators / assertions
      └─ Re-run until passing (max 3 iterations)
```

| Trigger | Stage 1 | Stage 2 |
|---------|---------|---------|
| Push to `feature/*` or `pl-mcp-generate` | Skipped | Disabled* |
| Manual queue | Runs | Disabled* |

\* Stage 2 is currently disabled (`condition: false`) pending deployment of the application at `BASE_URL`. Remove that condition to re-enable it.

---

## Prerequisites

### 1. Claude Code CLI

The pipeline installs Claude Code globally at runtime:
```bash
npm install -g @anthropic-ai/claude-code
```
No pre-installation is required on the agent image.

### 2. ADO Variable Group

Create a variable group named **`ai-generation-secrets`** in your Azure DevOps project
(**Pipelines → Library → + Variable group**) with the following variables:

| Variable | Description | Secret |
|----------|-------------|--------|
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com | Yes |
| `AZURE_DEVOPS_ORG_URL` | `https://dev.azure.com/<your-org>` | No |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT — see PAT scopes below | Yes |
| `AZURE_PROJECT_NAME` | Your ADO project name | No |
| `BASE_URL` | Base URL of the application under test | No |

Link this variable group to the pipeline under **Pipeline → Edit → Variables → Variable groups**.

### 3. PAT Scopes

The Personal Access Token requires these scopes:

| Scope | Permission |
|-------|-----------|
| Work Items | Read & Write |
| Test Management | Read & Write |
| Code | Read (for API calls from skill scripts) |

### 4. Pipeline Agent Permissions

The pipeline uses `persistCredentials: true` in Stage 1 to allow `git push`. The pipeline service identity (or the PAT used for checkout) must have **Contribute** permission on the repository.

In Azure DevOps: **Project Settings → Repositories → Security → `<Project> Build Service`** → set **Contribute** = Allow.

---

## Pipeline Parameters

When you manually queue the pipeline, Azure DevOps shows these parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **BRD file path** | string | `brd/*.doc` | Repo-relative glob to the BRD file (`.doc` default; adjust to `.md` if using markdown) |
| **Prompt override** | string | `(use BRD file)` | Replace with an entry-point keyword (e.g. `from stories Add_Employee`) to skip BRD file read; leave as-is to use the BRD file |
| **Test scope** | string | `Projects` | Scope passed to `Execute_And_Fix_Tests` |

---

## Stage 1: AI Generation

**Skill:** `/ADO_Full_Pipeline`
**Condition:** Any manual queue (`Build.Reason = Manual`)

### What it does — phase by phase

| Phase | Action | Output |
|-------|--------|--------|
| 0 | Workspace setup — creates `stories/`, `test_cases/`, `src/pages/`, `tests/generated/` | Directories |
| 0.5 | Entry-point detection — BRD file / `promptOverride` keyword / filesystem state | Start phase selected |
| 1 | BRD → User Stories (INVEST principle, Acceptance Criteria) | `stories/<Feature>_UserStories.md` |
| 1.5 | User Stories → ADO work items | ADO User Story WIs + `stories/<Feature>_ADO_IDs.json` |
| 2 | User Stories → Test Cases (step-by-step, typed, with preconditions) | `test_cases/<Feature>_TestCases.md` |
| 2.5 | Test Cases → ADO Test Plan + Suite + Test Case WIs + TestedBy links | ADO Test Plan/Suite/TCs + `test_cases/<Feature>_ADO_TCs.json` |
| 3 | Test Cases → Playwright POM + spec files | `src/locators/<page>-page-locators.ts`, `src/pages/<page>-page-self-healing.ts`, `tests/generated/<Module>/tc-<id>-<slug>.spec.ts` |
| 3.5 | Polish generated TypeScript | Refined POM + spec |
| 4 | git commit → push `feature/<Feature>` branch | Remote branch with all artifacts |

Phases 1.5 and 2.5 (ADO push) are **skipped gracefully** if ADO env vars are absent — local generation always proceeds.

### Technical invocation (Stage 1)

The pipeline step that calls Claude Code:

```bash
printf '/ADO_Full_Pipeline\n%s' "$(cat "$BRD_INPUT_FILE")" \
  | claude --dangerously-skip-permissions --output-format stream-json -p
```

- **`--output-format stream-json`** — each tool call and assistant turn is streamed to the ADO log in real time; you will see JSON lines as Claude works rather than waiting for the final output.
- **`timeoutInMinutes: 30`** — the step is capped at 30 minutes (trial boundary; raise this once baseline timing is known).
- **BRD via stdin** — the BRD content is piped through `printf` rather than shell-expanded into the command-line argument, which prevents `$`, backticks, and backslashes in the BRD from being interpreted by the shell.

### How to provide a BRD

**Option A — File in repo (recommended):**
1. Write your BRD as `brd/<FeatureName>.doc` (see `brd/README.md` for structure).
2. Commit and push.
3. Queue the pipeline; the default **BRD file path** glob (`brd/*.doc`) will pick it up automatically, or set it explicitly to `brd/<FeatureName>.doc`.

> The default glob is `brd/*.doc`. If your BRD is a markdown file, change the **BRD file path** parameter to `brd/<FeatureName>.md`.

**Option B — Prompt override (no file needed):**

Use the **Prompt override** parameter to pass an entry-point keyword instead of a BRD file:

| Scenario | Prompt override value |
|----------|-----------------------|
| Resume from existing User Stories | `from stories Add_Employee` |
| Resume from existing Test Cases | `from test-cases Add_Employee` |
| Re-push stories to ADO only | `from ado-stories Add_Employee` |
| Re-push test cases to ADO only | `from ado-test-cases Add_Employee` |
| Check current pipeline state | `status Add_Employee` |

### Published artifacts (Stage 1)

| Artifact name | Contents |
|---------------|---------|
| `generated-stories` | `stories/` directory — User Stories markdown + ADO ID mapping JSON |
| `generated-test-cases` | `test_cases/` directory — Test Cases markdown + ADO TC mapping JSON |

---

## Stage 2: Execute & Fix Tests

**Skill:** `/Execute_And_Fix_Tests`
**Condition:** Currently **disabled** (`condition: false`) — pending deployment of the application at `BASE_URL`.

> To re-enable Stage 2: remove `condition: false` from the `ExecuteAndFix` stage in `pipelines/ai-generation.yml` and ensure `BASE_URL` is set in the `ai-generation-secrets` variable group.

### What it does

The skill executes an autonomous test-fix loop:

```
Run Playwright tests (scope: <testScope>)
      │
      ▼ Parse failures into structured table
      │
      ▼ Live-inspect each failure
      │    └─ Playwright MCP browser: navigate → snapshot → confirm selectors
      │
      ▼ Classify failure type
      │    LOCATOR / LOCATOR-STRICT / TEXT / TIMING / WAITFN / TIMEOUT / CODE / AUTH
      │
      ▼ Apply targeted fix (locator file → page class → spec, in priority order)
      │
      ▼ Re-run tests  (max 3 total executions)
      │
      ▼ Tag remaining failures as test.fixme (BLOCKED)
      │
      ▼ Final summary — pass/fail/fixed/blocked counts + modified files
```

### Test scope parameter

The **Test scope** parameter controls which tests are run:

| Scope value | Tests executed |
|-------------|---------------|
| `Projects` _(default)_ | All tests under `tests/` |
| `Add_Employee` | Tests for a specific feature module |
| `tests/generated/Add_Employee/tc-1234-valid-creation.spec.ts` | Single spec file |
| `TC-Valid_Employee_Creation` | Single test case by ID (slug format) |
| `@smoke` | Tests matching a grep pattern |

### Published artifacts (Stage 2)

| Artifact name | Contents |
|---------------|---------|
| `test-reports` | `playwright-report/` — JSON execution summary + HTML report |
| `playwright-report` | `playwright-report/` — interactive HTML report |
| _(JUnit results)_ | Published to the **Tests** tab in the pipeline run |

---

## Trigger Reference

### Automatic — Push to `feature/*` or `pl-mcp-generate`

Any push to a `feature/*` or `pl-mcp-generate` branch triggers the pipeline automatically. Stage 1 is skipped. Stage 2 is currently disabled — once re-enabled it will run tests for the pushed code.

### Manual — On-demand queue

Queue the pipeline from **Azure DevOps → Pipelines → Run pipeline**.

Use the parameter form to configure each run:

**Generate from a BRD file:**
- BRD file path: `brd/Add_Employee.doc` (or leave as `brd/*.doc` to auto-pick)
- Prompt override: `(use BRD file)` _(leave as default)_
- Test scope: `Add_Employee`

**Resume from existing stories (skip BRD re-read):**
- Prompt override: `from stories Add_Employee`
- Test scope: `Add_Employee`

**Resume from existing test cases:**
- Prompt override: `from test-cases Add_Employee`
- Test scope: `Add_Employee`

---

## Variable Group Setup (Step-by-Step)

1. Open your Azure DevOps project.
2. Go to **Pipelines → Library → + Variable group**.
3. Name it `ai-generation-secrets`.
4. Add each variable from the table in the Prerequisites section.
5. Mark `ANTHROPIC_API_KEY` and `AZURE_PERSONAL_ACCESS_TOKEN` as secret (lock icon).
6. Save.
7. Open the pipeline → **Edit → Variables → Variable groups** → link `ai-generation-secrets`.

---

## Security Notes

- Stage 1 (`ADO_Full_Pipeline`) runs Claude with `--dangerously-skip-permissions` because the skill dynamically chains multiple sub-skills whose exact tool needs cannot be fully enumerated in advance. Stage 2 (`Execute_And_Fix_Tests`) also uses this flag. A pre-approved allow-list is committed to `.claude/settings.json` and can be used instead if tighter control is required — see `.claude/README.md`.
- The allow-list in `.claude/settings.json` covers the tools the skills need: file reads/writes, git operations, node script execution, workspace setup, Playwright test runs, and Playwright MCP browser inspection.
- All secrets (`ANTHROPIC_API_KEY`, `AZURE_PERSONAL_ACCESS_TOKEN`) are passed via environment variables; they are never written to disk or echoed in logs.
- The BRD file content is written to `/tmp/brd_input.txt` on the agent before being passed to Claude, so it does not appear in the command line or in ADO pipeline logs.

---

## Relationship to Existing Pipeline

| Pipeline | File | Purpose |
|----------|------|---------|
| Existing test runner | `azure-pipelines.yml` | Runs `src/executeTests.js` for changed areas on PR/push to main |
| AI generation + test | `pipelines/ai-generation.yml` | Runs Claude Code skills for AI-driven generation and self-healing tests |

Both pipelines can coexist. The AI generation pipeline is opt-in and does not replace the existing one.

---

## Related Documentation

| Document | Location |
|----------|---------|
| ADO_Full_Pipeline skill | `.claude/skills/ADO_Full_Pipeline/README.md` |
| Execute_And_Fix_Tests skill | `.claude/skills/Execute_And_Fix_Tests/SKILL.md` |
| All skills index | `docs/skills-index.md` |
| BRD file convention | `brd/README.md` |
| Claude Code CI/CD config | `.claude/README.md` |
