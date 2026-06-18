# brd-to-uss — ProductOwnerSkill

## What it does

Transforms raw Business Requirements Document (BRD) text into a structured, Agile-ready list of **User Stories** with full **Acceptance Criteria**. It acts as an expert Product Owner / Business Analyst, applying the INVEST principle to produce atomic, testable stories that cover both happy paths and error/validation flows.

After generating the stories it automatically saves the output to a local markdown file named after the feature. Optionally, passing `--local-only=false` pushes the generated User Stories to Jira as User Story issues and saves a `_Jira_IDs.json` mapping file.

---

## Input

| Variable | Description |
| --- | --- |
| `{{input_brd}}` | Raw BRD text **or** a file path to a BRD document (see supported formats below). |
| `--local-only=false` | Optional flag. When present, pushes generated User Stories to Jira as issues after saving locally. |
| `--local-only=true` | Optional flag. Save locally only. This is also the **default** when the flag is omitted. |

### Supported file formats

When `{{input_brd}}` is a file path, the skill detects the extension and parses silently:

| Format | Extensions | Notes |
| --- | --- | --- |
| Plain text / Markdown | `.txt` `.md` | Read directly |
| Word HTML / Legacy Word | `.doc` `.html` `.htm` | HTML tags stripped automatically |
| Word Open XML | `.docx` | Auto-installs `mammoth` if not present |
| PDF | `.pdf` | Auto-installs `pdf-parse` if not present |
| Other | any | UTF-8 plain-text fallback |

> `mammoth` and `pdf-parse` are installed with `--no-save` — `package.json` is never modified.

### Required environment variables (only for `--local-only=false`)

| Variable | Description |
| --- | --- |
| `JIRA_BASE_URL` | e.g. `https://your-org.atlassian.net` |
| `JIRA_EMAIL` | Jira account email address |
| `JIRA_API_TOKEN` | Jira API token with Issues read/write scope |
| `JIRA_PROJECT_KEY` | Your Jira project key (e.g. `PROJ`) |
| `JIRA_US_ISSUE_TYPE` | Issue type for User Stories (default: `Story`) |

---

## Output

A markdown document containing one or more User Stories, each following this template:

```markdown
### US-[ID]: [Feature/Action]
**As a** [user persona],
**I want to** [perform an action],
**So that** [achieve a goal/value].

**Acceptance Criteria:**
* **AC1:** [Criteria 1]
* **AC2:** [Criteria 2]
* **AC3:** [Criteria 3 — edge case / error handling]
```

### Saved files

```text
stories/<FeatureName>_UserStories.md          (always)
stories/<FeatureName>_Jira_IDs.json           (only when --local-only=false)
```

The `FeatureName` is extracted from the BRD title or primary subject and sanitized (e.g., `"Add Employee"` → `Add_Employee`).

---

## Key rules applied

| Rule | Description |
| --- | --- |
| **INVEST** | Every story is Independent, Negotiable, Valuable, Estimable, Small, and Testable |
| **Atomic** | One story per flow — complex features are broken into separate stories |
| **No code** | Pure business logic only — no implementation or automation code |
| **Coverage** | At least one Happy Path and one Unhappy Path per feature area |

---

## Pipeline position

```text
[brd-to-uss] --local-only (default)──► uss-to-tcs → tcs-to-plscript
             --local-only=false    ──► Jira (User Story issues created)
                                        └──► jira-uss-to-tcs / tcs-to-jira
```

This is **Step 1** of the pipeline. Its output (`stories/<FeatureName>_UserStories.md`) feeds directly into `uss-to-tcs`.

---

## Example invocation

Provide a BRD file path or raw text as the input. The skill will:

1. Detect whether the input is a file path or raw text
2. If a file path: silently parse the file to plain text
3. Generate all User Stories
4. Save them to `stories/<FeatureName>_UserStories.md`
5. Confirm the saved path
6. If `--local-only=false`: push each US to Jira and save `stories/<FeatureName>_Jira_IDs.json`
