# BRD Input Directory

This directory holds **Business Requirements Document (BRD)** markdown files used as input to the AI generation pipeline (`azure-pipelines-ai-generation.yml`, Stage 1).

---

## File Convention

| Convention | Details |
| ---------- | ------- |
| One file per feature | Name each file after the feature it describes |
| Naming | `<FeatureName>.<ext>` using underscores — e.g. `Add_Employee.md` |
| Supported formats | `.md` (Markdown), `.doc` (plain-text doc), `.pdf` (PDF — text extracted via `pdftotext`) |
| Default pipeline glob | `brd/*.doc` — override the **BRD file path** parameter to point to your file |
| Encoding | UTF-8 |

### How to use

1. Write your BRD as a markdown file in this directory.
2. Commit and push it to your branch (or directly to `main`/`develop`).
3. Manually queue the AI generation pipeline in Azure DevOps:
   - Set **Run Stage 1** = ✅
   - Set **BRD file path** = `brd/<YourFile>.md` (default: `brd/input.md`)
4. The pipeline reads the file and passes its full content to the `ADO_Full_Pipeline` Claude Code skill.

---

## Alternate: Prompt Override

If you don't want to commit a BRD file — or want to resume the pipeline from a specific point — use the **Prompt override** parameter when queuing the pipeline:

| Goal | Prompt override value |
| ---- | --------------------- |
| Re-run from existing User Stories | `from stories Add_Employee` |
| Re-run from existing Test Cases | `from test-cases Add_Employee` |
| Re-push User Stories to ADO only | `from ado-stories Add_Employee` |
| Re-push Test Cases to ADO only | `from ado-test-cases Add_Employee` |
| Check pipeline state | `status Add_Employee` |

---

## BRD File Structure (recommended)

```markdown
# <Feature Title>

## Overview
<1-3 sentence description of the feature and its business value>

## Goals
- <Goal 1>
- <Goal 2>

## Functional Requirements
1. <Requirement 1>
2. <Requirement 2>

## Non-Functional Requirements
- <Performance / security / accessibility constraints>

## Acceptance Criteria
- [ ] <Criterion 1>
- [ ] <Criterion 2>

## Out of Scope
- <What this feature does NOT cover>
```

The AI will auto-detect the feature name from the main heading and derive all naming tokens (`FeatureName`, `EntityName`, `feature-slug`, `branch-name`) automatically.

---

## Example

`brd/Add_Employee.md`:

```markdown
# Add Employee

## Overview
HR administrators need to add new employee records to the system,
including personal details, department assignment, and role.

## Functional Requirements
1. A form with fields: First Name, Last Name, Email, Department (dropdown), Role, Start Date.
2. All fields except Start Date are mandatory.
3. Email must be unique — show an inline error if duplicate.
4. On success, redirect to the Employee List page with a success toast.
5. On validation failure, highlight invalid fields without losing other entered data.

## Acceptance Criteria
- [ ] Valid submission creates the employee and shows success message.
- [ ] Duplicate email shows "Email already in use" inline error.
- [ ] Empty mandatory fields show individual field-level errors.
- [ ] Cancel button returns to Employee List without saving.
```
