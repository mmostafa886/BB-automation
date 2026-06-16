# patch-ado-tc-tags

## What it does

Patches the `System.Tags` field of every Test Case work item in Azure DevOps for a given module,
so that ADO tags match the tags defined in the local test artifacts.

Each TC receives a tag string of the form:
```
@<featureSlug>; <type>; @Smoke; @Regression; @automation
```

Tags are sourced in priority order:

| Priority | Source | Where found |
|---|---|---|
| 1 (primary) | `**Tags:**` line in `test_cases/<module>_TestCases.md` | `test_cases/` folder |
| 2 (fallback) | `@tags` JSDoc line in the spec file | `tests/generated/<module>/tc-<adoId>-*.spec.ts` |

The TC-to-ADO-WI-ID mapping always comes from `test_cases/<module>_ADO_TCs.json`.

---

## Input

| Variable | Description |
|---|---|
| `{{module_name}}` | Module name exactly as used in the file system (e.g. `Campaign-Listing`, `Workflow_Shell`, `Instruments`) |

### Invocation examples

```text
/patch-ado-tc-tags Campaign-Listing
/patch-ado-tc-tags Workflow_Shell
/patch-ado-tc-tags Instruments
```

### Required files

| File | Purpose | Produced by |
|---|---|---|
| `test_cases/<module>_ADO_TCs.json` | TC slug → ADO WI ID mapping | `/tcs-to-ado` |
| `test_cases/<module>_TestCases.md` *(optional)* | Primary tag source | `/uss-to-tcs` or `/brd-full-pipeline` |
| `tests/generated/<module>/tc-<adoId>-*.spec.ts` *(fallback)* | Secondary tag source | `/tcs-to-plscript` |

### ADO credentials — sourced from `.env` at project root

| Variable | Description |
|---|---|
| `AZURE_DEVOPS_ORG_URL` | e.g. `https://dev.azure.com/your-org` |
| `AZURE_PROJECT_NAME` | Your ADO project name |
| `AZURE_PERSONAL_ACCESS_TOKEN` | PAT with Work Items read/write |

---

## Steps

### Step 1 — Validate prerequisites

Checks that `test_cases/<module>_ADO_TCs.json` exists and all three ADO credentials are
present in `.env`. Stops immediately with a clear error if anything is missing.

### Step 2 — Resolve tags per TC

For each TC in the mapping:

1. **Primary:** Parse `**Type:**` and `**Tags:**` from `test_cases/<module>_TestCases.md`.
   Tags are split on `;` and trimmed. Type is lowercased.
2. **Fallback (per TC):** If TestCases.md is absent, or this specific TC is not in it,
   read `tests/generated/<module>/tc-<adoId>-*.spec.ts` and extract space-separated `@word`
   tokens from the `@tags` JSDoc line. Type is inferred from the TC ID prefix:

   | Prefix | Type |
   |---|---|
   | `TC-Valid_*` | `positive` |
   | `TC-Invalid_*` / `TC-Negative_*` | `negative` |
   | `TC-Boundary_*` | `boundary` |
   | `TC-Security_*` | `security` |
   | `TC-Performance_*` | `performance` |
   | `TC-API_*` | `api` |
   | `TC-DB_*` | `db` |
   | *(anything else)* | `functional` |

Final tag string format:
```
@<featureSlug>; <type>; <tag1>; <tag2>; ...
```

### Step 3 — Generate and run patch script

Writes `patch_ado_tc_tags.js` at the project root with all `adoId → tagsString` pairs
inlined, then runs it.

Before any PATCH, the script batch-fetches the current `System.Tags` value from ADO for all
TCs in a single `getWorkItems` call. It then compares the current and computed tag strings
using **normalised comparison** (split on `;` → trim → lowercase → sort alphabetically →
rejoin). If they are already equal the TC is skipped — no unnecessary API write is made.

### Step 4 — Report and cleanup

Prints a per-TC summary table (ADO WI, TC slug, final tags), a grand total, and any TCs
where tags could not be resolved from either source. Deletes `patch_ado_tc_tags.js`.

---

## Tag field format in each source

### TestCases.md
```markdown
**Tags:** @Smoke; @Regression; @automation
```
Semicolon-separated. Tokens kept as-is (including `@` prefix).

### Spec file JSDoc
```typescript
/**
 * @tags      @automation @smoke @regression
 */
```
Space-separated. Tokens starting with `@` are kept; metadata tokens
(`@testcase`, `@title`, `@module`, `@priority`, `@UserStory`, `@ado_tc`, `@P0`/`@P1`/`@P2`,
`@<ModuleName>`) are excluded.

---

## Error handling

- **Missing mapping file** → immediate stop with instructions to run `/tcs-to-ado` first
- **Missing `.env` credentials** → lists which are missing and stops
- **TC not in TestCases.md + spec file not found** → TC patched with `@<featureSlug>; <type>` only; listed in WARN section of the report
- **ADO PATCH failure per TC** → logged as FAILED; remaining TCs still processed; exits with code 1 if any failures occurred

---

## When to use this vs. related skills

| Scenario | Use |
|---|---|
| Tags missing on ADO TCs for a module | `patch-ado-tc-tags <module>` |
| Push new TCs to ADO for the first time | `/tcs-to-ado <module>` |
| Regenerate TCs from User Stories | `/uss-to-tcs` then `/tcs-to-ado` |
