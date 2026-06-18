# patch-jira-tc-labels

## What it does

Updates the `labels` field of every Test Case issue in Jira for a given module,
so that Jira labels match the labels defined in the local test artifacts.

Each TC receives a labels array of the form:
```
["@<featureSlug>", "<type>", "@Smoke", "@Regression", "@automation"]
```

Labels are sourced in priority order:

| Priority | Source | Where found |
|---|---|---|
| 1 (primary) | `**Tags:**` line in `test_cases/<module>_TestCases.md` | `test_cases/` folder |
| 2 (fallback) | `@tags` JSDoc line in the spec file | `tests/generated/<module>/tc-<jiraKey>-*.spec.ts` |

The TC-to-Jira-key mapping always comes from `test_cases/<module>_Jira_TCs.json`.

---

## Input

| Variable | Description |
|---|---|
| `{{module_name}}` | Module name exactly as used in the file system (e.g. `Campaign-Listing`, `Workflow_Shell`, `Instruments`) |

### Invocation examples

```text
/patch-jira-tc-labels Campaign-Listing
/patch-jira-tc-labels Workflow_Shell
/patch-jira-tc-labels Instruments
```

### Required files

| File | Purpose | Produced by |
|---|---|---|
| `test_cases/<module>_Jira_TCs.json` | TC slug → Jira issue key mapping | `/tcs-to-jira` |
| `test_cases/<module>_TestCases.md` *(optional)* | Primary label source | `/uss-to-tcs` or `/brd-full-pipeline` |
| `tests/generated/<module>/tc-<jiraKey>-*.spec.ts` *(fallback)* | Secondary label source | `/tcs-to-plscript` |

### Jira credentials — sourced from `.env` at project root

| Variable | Description |
|---|---|
| `JIRA_BASE_URL` | e.g. `https://your-org.atlassian.net` |
| `JIRA_EMAIL` | Jira account email address |
| `JIRA_API_TOKEN` | Jira API token with Issues read/write |
| `JIRA_PROJECT_KEY` | Your Jira project key (e.g. `PROJ`) |

---

## Steps

### Step 1 — Validate prerequisites

Checks that `test_cases/<module>_Jira_TCs.json` exists and all four Jira credentials are
present in `.env`. Stops immediately with a clear error if anything is missing.

### Step 2 — Resolve labels per TC

For each TC in the mapping:

1. **Primary:** Parse `**Type:**` and `**Tags:**` from `test_cases/<module>_TestCases.md`.
   Tags are split on `;` and trimmed. Type is lowercased.
2. **Fallback (per TC):** If TestCases.md is absent, or this specific TC is not in it,
   read `tests/generated/<module>/tc-<jiraKey>-*.spec.ts` and extract space-separated `@word`
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

Final labels array format:
```
["@<featureSlug>", "<type>", "<tag1>", "<tag2>", ...]
```

### Step 3 — Generate and run patch script

Writes `patch_jira_tc_labels.js` at the project root with all `jiraKey → labelsArray` pairs
inlined, then runs it.

Before any PUT, the script fetches the current `labels` value from Jira for each issue
individually. It then compares the current and computed label lists using **normalised
comparison** (lowercase → sort alphabetically → join). If they are already equal the issue
is skipped — no unnecessary API write is made.

The script uses Node.js built-in `https` module and authenticates via HTTP Basic Auth
(`JIRA_EMAIL:JIRA_API_TOKEN` base64-encoded), calling:

```
PUT /rest/api/3/issue/{key}
Body: { "fields": { "labels": [...] } }
```

### Step 4 — Report and cleanup

Prints a per-TC summary table (Jira key, TC slug, final labels), a grand total, and any TCs
where labels could not be resolved from either source. Deletes `patch_jira_tc_labels.js`.

---

## Label field format in each source

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
(`@testcase`, `@title`, `@module`, `@priority`, `@UserStory`, `@jira_tc`, `@P0`/`@P1`/`@P2`,
`@<ModuleName>`) are excluded.

---

## Error handling

- **Missing mapping file** → immediate stop with instructions to run `/tcs-to-jira` first
- **Missing `.env` credentials** → lists which are missing and stops
- **TC not in TestCases.md + spec file not found** → TC updated with `["@<featureSlug>", "<type>"]` only; listed in WARN section of the report
- **Jira PUT failure per TC** → logged as FAILED; remaining TCs still processed; exits with code 1 if any failures occurred

---

## When to use this vs. related skills

| Scenario | Use |
|---|---|
| Labels missing on Jira TCs for a module | `patch-jira-tc-labels <module>` |
| Push new TCs to Jira for the first time | `/tcs-to-jira <module>` |
| Regenerate TCs from User Stories | `/uss-to-tcs` then `/tcs-to-jira` |
