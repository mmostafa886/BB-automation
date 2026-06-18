# AI Generation & Test Automation Pipeline

`.github/workflows/qa-automation.yml`

---

## Overview

This pipeline automates the full journey from a Business Requirements Document (BRD) to running, self-healing Playwright tests — using Claude Code skills as the execution engine.

```
BRD file in repo
      │
      ▼ Stage 1: AI Generation  (manual, opt-in)
  Jira_Full_Pipeline
      ├─ BRD → User Stories         (local file + Jira Story issues)
      ├─ User Stories → Test Cases   (local file + Jira Epic + Task issues)
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
| Push to `feature/**` | Skipped | Disabled* |
| Manual queue | Runs | Disabled* |

\* Stage 2 is currently disabled pending deployment of the application at `BASE_URL`. Remove the `condition: false` block to re-enable it.

---

## Prerequisites

### 1. Claude Code CLI

The pipeline installs Claude Code globally at runtime:
```bash
npm install -g @anthropic-ai/claude-code
```
No pre-installation is required on the runner image.

### 2. GitHub Repository Secrets

Add the following secrets in **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Description | Notes |
|--------|-------------|-------|
| `ANTHROPIC_API_KEY` | Claude API key from console.anthropic.com | Required |
| `JIRA_BASE_URL` | `https://yourcompany.atlassian.net` | Required |
| `JIRA_EMAIL` | Jira account email | Required |
| `JIRA_API_TOKEN` | Jira API token (generate at id.atlassian.com/manage-profile/security/api-tokens) | Required |
| `JIRA_PROJECT_KEY` | Jira project key (e.g. `BB`) | Required |
| `JIRA_TC_ISSUE_TYPE` | Issue type for test cases (default: `Task`) | Optional |
| `JIRA_US_ISSUE_TYPE` | Issue type for user stories (default: `Story`) | Optional |
| `BASE_URL` | Base URL of the application under test | Optional |
| `OPENAI_API_KEY` | OpenAI key (if using OpenAI instead of Anthropic) | Optional |

### 3. Jira API Token Permissions

The Jira API token must belong to an account with these Jira project permissions:

| Permission | Required for |
|-----------|-------------|
| Browse Projects | Reading issues |
| Create Issues | Creating User Story / Test Case issues |
| Edit Issues | Updating labels and descriptions |
| Link Issues | Creating "Tests" issue links |

### 4. Repository Permissions

The pipeline uses `persist-credentials: true` (checkout action default) to allow `git push`. The GitHub Actions token must have **write** permission on the repository contents.

In GitHub: **Settings → Actions → General → Workflow permissions** → set to "Read and write permissions".

---

## Pipeline Parameters

When you manually trigger the workflow via **Actions → Run workflow**, you can configure:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **BRD file path** | string | `brd/*.doc` | Repo-relative glob to the BRD file |
| **Prompt override** | string | `(use BRD file)` | Entry-point keyword to skip BRD file read (e.g. `from stories Add_Employee`) |
| **Test scope** | string | `Projects` | Scope passed to `execute-and-fix-tests` |

---

## Stage 1: AI Generation

**Skill:** `/jira-full-pipeline`
**Condition:** Any manual workflow dispatch

### What it does — phase by phase

| Phase | Action | Output |
|-------|--------|--------|
| 0 | Workspace setup — creates `stories/`, `test_cases/`, `src/pages/`, `tests/generated/` | Directories |
| 0.5 | Entry-point detection — BRD file / `promptOverride` keyword / filesystem state | Start phase selected |
| 1 | BRD → User Stories (INVEST principle, Acceptance Criteria) | `stories/<Feature>_UserStories.md` |
| 1.5 | User Stories → Jira Story issues | Jira Story issues + `stories/<Feature>_Jira_IDs.json` |
| 2 | User Stories → Test Cases (step-by-step, typed, with preconditions) | `test_cases/<Feature>_TestCases.md` |
| 2.5 | Test Cases → Jira Epic + Task issues + Tests links | Jira Epic/Task issues + `test_cases/<Feature>_Jira_TCs.json` |
| 3 | Test Cases → Playwright POM + spec files | `src/locators/<page>-page-locators.ts`, `src/pages/<page>-page-self-healing.ts`, `tests/generated/<Module>/tc-<key>-<slug>.spec.ts` |
| 3.5 | Polish generated TypeScript | Refined POM + spec |
| 4 | git commit → push `feature/<Feature>` branch | Remote branch with all artifacts |

Phases 1.5 and 2.5 (Jira push) are **skipped gracefully** if Jira env vars are absent — local generation always proceeds.

### Technical invocation (Stage 1)

The step that calls Claude Code:

```bash
printf '/jira-full-pipeline\n%s' "$(cat "$BRD_INPUT_FILE")" \
  | claude --dangerously-skip-permissions --output-format stream-json -p
```

- **`--output-format stream-json`** — each tool call and assistant turn is streamed to the Actions log in real time.
- **BRD via stdin** — the BRD content is piped through `printf` to prevent shell expansion of special characters.

### How to provide a BRD

**Option A — File in repo (recommended):**
1. Write your BRD as `brd/<FeatureName>.doc` (see `brd/README.md` for structure).
2. Commit and push.
3. Trigger the workflow manually; the default **BRD file path** glob (`brd/*.doc`) will pick it up.

**Option B — Prompt override (no file needed):**

Use the **Prompt override** field to pass an entry-point keyword:

| Scenario | Prompt override value |
|----------|-----------------------|
| Resume from existing User Stories | `from stories Add_Employee` |
| Resume from existing Test Cases | `from test-cases Add_Employee` |
| Re-push stories to Jira only | `from jira-stories Add_Employee` |
| Re-push test cases to Jira only | `from jira-test-cases Add_Employee` |
| Check current pipeline state | `status Add_Employee` |

### Published artifacts (Stage 1)

| Artifact name | Contents |
|---------------|---------|
| `generated-stories` | `stories/` directory — User Stories markdown + Jira issue key mapping JSON |
| `generated-test-cases` | `test_cases/` directory — Test Cases markdown + Jira TC mapping JSON |

---

## Stage 2: Execute & Fix Tests

**Skill:** `/execute-and-fix-tests`
**Condition:** Currently **disabled** — pending deployment of the application at `BASE_URL`.

> To re-enable Stage 2: remove `condition: false` from the `execute-and-fix` job in `.github/workflows/qa-automation.yml` and ensure `BASE_URL` is set in the repository secrets.

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

| Scope value | Tests executed |
|-------------|---------------|
| `Projects` _(default)_ | All tests under `tests/` |
| `Add_Employee` | Tests for a specific feature module |
| `tests/generated/Add_Employee/tc-BB-1234-valid-creation.spec.ts` | Single spec file |
| `@smoke` | Tests matching a grep pattern |

### Published artifacts (Stage 2)

| Artifact name | Contents |
|---------------|---------|
| `test-reports` | `playwright-report/` — JSON execution summary + HTML report |
| `playwright-report` | `playwright-report/` — interactive HTML report |
| _(JUnit results)_ | Published via `dorny/test-reporter` action |

---

## Trigger Reference

### Automatic — Push to `feature/**`

Any push to a `feature/**` branch triggers the workflow automatically. Stage 1 is skipped. Stage 2 (once re-enabled) will run tests for the pushed code.

### Manual — Workflow dispatch

Trigger via **Actions → Run workflow** in the GitHub UI.

**Generate from a BRD file:**
- BRD file path: `brd/Add_Employee.doc`
- Prompt override: `(use BRD file)` _(leave as default)_
- Test scope: `Add_Employee`

**Resume from existing stories (skip BRD re-read):**
- Prompt override: `from stories Add_Employee`

**Resume from existing test cases:**
- Prompt override: `from test-cases Add_Employee`

---

## GitHub Secrets Setup (Step-by-Step)

1. Open your GitHub repository.
2. Go to **Settings → Secrets and variables → Actions**.
3. Click **New repository secret** for each secret in the table above.
4. For `JIRA_API_TOKEN`: generate it at https://id.atlassian.com/manage-profile/security/api-tokens.
5. Mark `ANTHROPIC_API_KEY` and `JIRA_API_TOKEN` as secrets (they are automatically masked in logs).

---

## Security Notes

- Stage 1 (`jira-full-pipeline`) runs Claude with `--dangerously-skip-permissions` because the skill dynamically chains multiple sub-skills whose exact tool needs cannot be fully enumerated in advance. A pre-approved allow-list is committed to `.claude/settings.json`.
- All secrets (`ANTHROPIC_API_KEY`, `JIRA_API_TOKEN`) are passed via environment variables; they are never written to disk or echoed in logs.
- The BRD file content is written to `/tmp/brd_input.txt` on the runner before being passed to Claude, so it does not appear in the command line or in Actions logs.

---

## Relationship to Existing Pipelines

| Pipeline | File | Purpose |
|----------|------|---------|
| Main test runner | `.github/workflows/qa-automation.yml` | Runs tests on PR/push; hosts AI generation job |
| Legacy runner (kept for reference) | `pipelines/azure-pipelines.yml` | Original Azure Pipelines config — no longer active |

---

## Related Documentation

| Document | Location |
|----------|---------|
| jira-full-pipeline skill | `.claude/skills/jira-full-pipeline/README.md` |
| execute-and-fix-tests skill | `.claude/skills/execute-and-fix-tests/SKILL.md` |
| All skills index | `docs/skills-index.md` |
| BRD file convention | `brd/README.md` |
| Claude Code CI/CD config | `.claude/README.md` |
