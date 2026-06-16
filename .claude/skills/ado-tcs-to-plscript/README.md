# ado-tcs-to-plscript

## What it does

Fetches test cases directly from Azure DevOps based on the IDs and modules configured in
`config/testCaseFilter.js`, then generates production-ready Playwright TypeScript automation
scripts following the project's self-healing TAF architecture.

For every active module it produces four layers:

| Layer | Output | Action |
|-------|--------|--------|
| 1 — Locators | `src/locators/<page>-page-locators.ts` | Created or extended |
| 2 — Page class | `src/pages/<page>-page-self-healing.ts` | Created or extended |
| 3 — POM registration | `src/pages/pom-lazy-self-healing.ts` | Updated in-place |
| 4 — Spec files | `tests/generated/<Module>/tc-<id>-<slug>.spec.ts` | One per TC (stale copies renamed to `_old`) |

Chains automatically into `/polish-generated-code` when complete, scoped to only the modules processed in this run.

---

## Prerequisites

| Variable | Description |
|----------|-------------|
| `AZURE_DEVOPS_ORG_URL` | e.g. `https://dev.azure.com/MyOrg` |
| `AZURE_PROJECT_NAME` | e.g. `MyProject` |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT with Work Items **read** scope |
| `config/testCaseFilter.js` | Module ↔ TC-IDs mapping (already in repo) |

---

## Flags

**`--execute-tests=<true|false>`** (default: `false`)

When `true`, runs the generated specs after saving (up to 2 rounds with fixes) before handing off to Polish.
When `false` or omitted, saves all files, prints `"Test execution skipped."`, and proceeds directly to Polish.

**`--wireframe-url=<url>`** (optional; default: prompt is automatic)

URL of the wireframe / UI prototype (e.g. Figma, Zeplin, live staging app). When provided:
- The skill captures all interactive UI elements visible in the wireframe via MCP browser snapshot
- Element selectors (role, name, label, test-id) are extracted from the live DOM
- When inferring selectors from TC steps, the skill matches step text against wireframe elements semantically and uses real selectors instead of guessing from text alone
- Improves locator accuracy and reduces brittle `text=` or positional selectors

If absent, the skill **automatically prompts** via `AskUserQuestion` (Step 3b) asking whether you have a wireframe URL. This prompt is **mandatory** for direct invocations — it cannot be skipped unless the skill is called from a pipeline orchestrator (`ado-full-pipeline`).

---

## Input

| Variable | Description |
|----------|-------------|
| `{{module_name_or_all}}` | Optional. A module name (`Login`), comma-separated list (`Login,Reagents`), or empty / `all` to process every `activeModule` in the filter config. |

---

## Output

```
src/
  locators/
    login-page-locators.ts         ← Layer 1
    reagents-page-locators.ts
    ...
  pages/
    login-page-self-healing.ts     ← Layer 2
    reagents-page-self-healing.ts
    ...
    pom-lazy-self-healing.ts       ← Layer 3 (updated)

tests/generated/
  Login/
    tc-3871-verify-redirection-to-login-page.spec.ts   ← Layer 4
    tc-3874-verify-login-page-displays-correctly.spec.ts
  Reagents/
    tc-3914-verify-reagents-page-content.spec.ts
    ...
```

---

## Spec file naming

Format: `tc-<id>-<title-slug>.spec.ts` — both tokens are always present.

`<id>` is the numeric ADO work item ID.
`<title-slug>` is the TC title lowercased, non-alphanumeric characters replaced with `-`, max 80 chars.

**Existing file handling (stale detection is MANDATORY before every write):**

| Situation | Action |
| --------- | ------ |
| Different filename matches the same `<title-slug>` | `git mv` stale file → `<stale-base>_old.spec.ts`; write fresh spec |
| Exact filename already exists | `git mv` existing → `tc-<id>-<title-slug>_old.spec.ts`; write fresh spec |
| No existing file | Write directly |

The `_old` copy is kept in git history so no work is ever silently lost.

---

## Usage Examples

### 1. Generate scripts from ADO test cases (no wireframe)

```bash
/ado-tcs-to-plscript
```

Fetches all active modules' test cases from ADO and generates Playwright scripts. The skill will prompt via `AskUserQuestion` asking if you have a wireframe URL to provide; you can skip it or provide a URL.

### 2. With wireframe URL for accurate locator selection

```bash
/ado-tcs-to-plscript Login,Reagents --wireframe-url=https://figma.com/file/abc123/app-ui
```

When a wireframe URL is provided:
- The skill captures all interactive elements from the live UI
- TC steps like "click the Save button" are matched against wireframe elements semantically
- Real selectors (`[data-testid="save"]` or role-based locators) are used instead of guessed ones
- Reduces brittle `text=` selectors and improves overall test reliability

### 3. Single module with wireframe + test execution

```bash
/ado-tcs-to-plscript Reagents --wireframe-url=https://staging.example.com/reagents --execute-tests=true
```

Generates scripts with wireframe-enhanced selectors, runs tests (up to 2 rounds with fixes), and chains to Polish if pass rate meets the gate.

### 4. All modules with wireframe

```bash
/ado-tcs-to-plscript --wireframe-url=https://figma.com/design/full-app
```

Processes all active modules defined in `config/testCaseFilter.js`, using wireframe context for locator selection across all modules.

### 5. Full workflow: ADO USs → ADO TCs → Playwright scripts with wireframe

```bash
# Step 1: Generate TCs from ADO User Stories + wireframe
/ado-uss-to-tcs reagents-upload --wireframe-url=https://figma.com/design/reagents

# Step 2: Generate Playwright scripts from ADO TCs (config/testCaseFilter.js auto-patched)
/ado-tcs-to-plscript Reagents --wireframe-url=https://figma.com/design/reagents --execute-tests=true
```

---

## Example invocations (basic)

```bash
# All active modules — no test run (default)
/ado-tcs-to-plscript

# Single module, no test run
/ado-tcs-to-plscript Login

# Multiple specific modules, no test run
/ado-tcs-to-plscript Login,Reagents,Products

# All modules + run generated tests after
/ado-tcs-to-plscript --execute-tests=true

# Single module + run tests
/ado-tcs-to-plscript Login --execute-tests=true
```

---

## Automation Filtering

Only TCs that satisfy **all** of the following are scripted:

| Condition | Check |
|-----------|-------|
| Has `@automation` tag | `System.Tags` split on `;`, normalised to lowercase, must contain `@automation` |
| Not Closed | `System.State` ≠ `Closed` |
| Not Removed/Deleted | `System.State` ≠ `Removed` / `Deleted` |

TCs that fail any check are **skipped** with a summary printed after each module.

---

## Tags Propagated to Specs

The following tags are automatically extracted from ADO and added to every generated spec:

| Tag | Source | Example |
|-----|--------|---------|
| `@automation` | `System.Tags` contains `@automation` (case-insensitive, with `@` prefix) | `@automation` |
| `@regression` | `System.Tags` contains `@regression` (case-insensitive, with `@` prefix) | `@regression` |
| `@smoke` | `System.Tags` contains `@smoke` (case-insensitive, with `@` prefix) | `@smoke` |
| `@US-<id>` | `Microsoft.VSTS.Common.TestedBy-Reverse` relation links | `@US-1234` |

These appear in the **test title** (enabling `--grep @regression`, `--grep @US-1234`) and in the JSDoc block (`@tags`, `@UserStory`, `@ado_tc`).

---

## Test Data Files

All concrete values (input data, expected texts, field counts, etc.) are stored in `test-data/` instead of being hardcoded. The skill selects the target file by TC title heuristic:

| TC title contains | Target file |
|-------------------|------------|
| "creat" / "add" / "new" | `test-data/new-<module-kebab>.json` |
| "list" / "filter" / "search" / "view" | `test-data/<module-kebab>-listing.json` |
| "edit" / "update" / "modif" | `test-data/edit-<module-kebab>.json` |
| "delete" / "remov" | `test-data/delete-<module-kebab>.json` |
| (default) | `test-data/<module-kebab>.json` |

Existing files are **extended** (new keys added, existing keys preserved). Specs import the JSON:

```typescript
import testData from '../../../test-data/new-reaction-class.json';
// ...
await pomSelfHealing.reactionClassPage.fillClassName(testData.className);
```

---

## Architecture constraints enforced

- All selectors live **only** in the locator repository (`src/locators/`) — never inline in specs or page classes.
- Page classes use `this.actions.*` and `this.assert.*` exclusively — no bare `page.*` or inline `expect()`.
- **Every page method body is wrapped in `test.step()`** — named steps appear in the HTML report at page-object level; import `test` from `@playwright/test` in the page class.
- **No `test.step()` wrappers in spec bodies** — page methods own the step wrapping.
- Spec files call page object methods — no direct element access.
- Locator files compile with zero runtime dependencies (no `Page` import).
- **`test.fixme` by default** — All generated specs use `test.fixme(...)` instead of `test(...)`. Marks the test as known-pending; remove `.fixme` manually once the feature is verified.
- **Post-generation cleanup** — Unused locators/methods **added in this session** are removed; pre-existing code is never touched.

---

## Pipeline position

```
ADO (config/testCaseFilter.js)
        │  fetches TCs
        ▼
[ado-tcs-to-plscript]          ← this skill
        ↓
[--execute-tests=true]  Run tests (up to 2 rounds) → Final Report
[--execute-tests=false] "Test execution skipped."
        ↓  (both paths)
polish-generated-code <ModuleName>  ← auto-chains (scoped to this run only)
```

> Polish is invoked with the module name(s) processed in this run so it only touches the
> files created or modified during this execution — not every file in the project.

This skill is a standalone alternative to `/tcs-to-plscript` when test cases already exist
in Azure DevOps and you want to regenerate Playwright scripts directly from them without
manually pasting TC markdown.

---

## Going from ADO User Stories → Playwright scripts

No manual steps required. `ado-uss-to-tcs` Step 5.5 automatically patches
`config/testCaseFilter.js` after creating the TC work items:

```text
1.  /ado-uss-to-tcs <feature-tag-or-ids>
         └─ Creates TC work items in ADO
         └─ Saves test_cases/<FeatureName>_ADO_TCs.json
         └─ Step 5.5: appends new TC IDs to config/testCaseFilter.js (append-only)

2.  /ado-tcs-to-plscript <ModuleName>
         └─ Fetches TCs from ADO → generates 4-layer Playwright scripts → Polish
```

> A single-command `/ado-uss-to-plscript` skill (OPT-1) is still planned for a true
> one-liner experience. See `docs/skills-review-2026-03-16.md`.

---

## When to use this vs. related skills

| Scenario | Use |
| -------- | --- |
| TC IDs already in `config/testCaseFilter.js`, want Playwright scripts | `ado-tcs-to-plscript` |
| Have local TC markdown, want Playwright scripts (no ADO needed) | `tcs-to-plscript` |
| Have ADO User Stories, want to derive TCs and push to ADO | `ado-uss-to-tcs` |
| Have ADO User Stories, want Playwright scripts | `ado-uss-to-tcs` + manual filter update + `ado-tcs-to-plscript` |
| Full BRD → ADO + Playwright in one command | `ado-full-pipeline` |
