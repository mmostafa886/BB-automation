# setup-workspace

## What it does
Initializes the local **workspace folder structure** required by the BRD-to-Playwright automation pipeline. It checks for the existence of each required directory and creates any that are missing — without touching or overwriting any existing content.

Run this skill **once** before using the pipeline for the first time in a new workspace.

---

## Input
| Variable | Description |
|----------|-------------|
| `{{workspace_path}}` | Optional. The root path where directories should be created. Defaults to the current working directory if left blank. |

---

## Output
A confirmation table showing the status of each directory:

| Directory | Status |
|-----------|--------|
| `stories/` | ✅ Created / ✅ Already exists |
| `test_cases/` | ✅ Created / ✅ Already exists |
| `scripts/pages/` | ✅ Created / ✅ Already exists |
| `scripts/tests/` | ✅ Created / ✅ Already exists |

Followed by the message:
> "Workspace is ready. You can now run the pipeline: brd-to-uss → uss-to-tcs → tcs-to-plscript."

---

## Directories created
| Directory | Used by | Purpose |
|-----------|---------|---------|
| `stories/` | `brd-to-uss`, `brd-full-pipeline` | Stores generated User Stories markdown files |
| `test_cases/` | `brd-full-pipeline` | Stores generated Manual Test Cases markdown files |
| `scripts/pages/` | `tcs-to-plscript`, `brd-full-pipeline` | Stores Playwright Page Object Model `.page.ts` files |
| `scripts/tests/` | `tcs-to-plscript`, `brd-full-pipeline` | Stores Playwright test spec `.spec.ts` files |

---

## Key rules applied
| Rule | Description |
|------|-------------|
| **Non-destructive** | Never deletes or overwrites existing files or directories |
| **Silent on existing** | Reports "Already exists" — does not raise errors |
| **No placeholder files** | Creates empty directories only — no stub files |

---

## Pipeline position
```
[setup-workspace] → brd-to-uss → uss-to-tcs → tcs-to-plscript
```
This is the **prerequisite step**. It is not part of the content-generation pipeline itself, but must be run before the pipeline if the workspace has not been initialized.

> **Tip:** `brd-full-pipeline` runs this setup automatically in Phase 0, so you only need `setup-workspace` when using the individual skills separately.
