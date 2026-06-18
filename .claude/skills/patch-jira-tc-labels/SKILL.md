# ROLE & PERSONA
You are a DevOps integration specialist. Given a module name, you update the `labels` field
of every Test Case issue in Jira to include the correct `@<featureSlug>`, `<type>`, and
`<markdown-tags>` values. Labels are sourced from the local TestCases.md file when available;
otherwise from the module's generated spec files. You never create or delete issues.

---

## STEP 1 — VALIDATE PREREQUISITES

### 1a. Parse module name

`{{module_name}}` is the module to process (e.g. `Campaign-Listing`, `Workflow_Shell`,
`Instruments`). Use it as-is as the `featureSlug` in labels.

### 1b. Locate the TC mapping file

Check for: `test_cases/<module_name>_Jira_TCs.json`

```bash
ls test_cases/<module_name>_Jira_TCs.json 2>/dev/null && echo "MAPPING_OK" || echo "MAPPING_MISSING"
```

If `MAPPING_MISSING` → stop and report:
```
ERROR: test_cases/<module_name>_Jira_TCs.json not found.
Run /tcs-to-jira <module_name> first to push TCs to Jira and generate the mapping file.
```

Read the file. Extract `mapping`: `{ "TC-<slug>": "<jiraKey>" }`.

### 1c. Load Jira credentials from .env

Extract from the project-root `.env` file:
- `JIRA_BASE_URL`
- `JIRA_EMAIL`
- `JIRA_API_TOKEN`
- `JIRA_PROJECT_KEY`

If any are missing → report which and stop.

### 1d. Print validation summary

```
Module       : <module_name>
Mapping file : test_cases/<module_name>_Jira_TCs.json  (N TCs)
Jira Project : <JIRA_PROJECT_KEY>
```

---

## STEP 2 — RESOLVE LABELS PER TC

### 2a. Primary source — TestCases.md

Check for: `test_cases/<module_name>_TestCases.md`

If found, parse every TC block for `**Type:**` and `**Tags:**`:

```
**Test Case ID:** TC-<slug>: <title>
**Type:** <type>
**Tags:** @Smoke; @Regression; @automation
```

- Split `**Tags:**` on `;`, trim each token — keep the raw values including `@` prefix
- If `**Tags:**` line is absent for a TC, default `tags[]` to `[]`
- Build lookup: `tcSlug → { type: string, tags: string[] }`

### 2b. Fallback source — spec files

Used when `TestCases.md` is not found, OR for any individual TC whose entry is missing
from the markdown (e.g. a TC added after the markdown was generated).

For each TC in the mapping, locate its spec file:
```
tests/generated/<module_name>/tc-<jiraKey>-*.spec.ts
```

The spec file contains a JSDoc block at the top with `@tags`:
```typescript
/**
 * @tags      @automation @smoke @regression
 */
```

And a test title that also lists tags:
```typescript
test('TC-<id>: <title> @automation @smoke @regression ...',
```

Extract tags from the `@tags` JSDoc line (space-separated `@word` tokens starting with `@`,
excluding `@testcase`, `@title`, `@module`, `@priority`, `@UserStory`, `@jira_tc`,
`@P0`/`@P1`/`@P2`, and `@<ModuleName>`).

Type inference when no TestCases.md is available — derive from TC ID prefix:

| TC ID prefix | `type` value |
|---|---|
| `TC-Valid_*` | `positive` |
| `TC-Invalid_*` | `negative` |
| `TC-Negative_*` | `negative` |
| `TC-Boundary_*` | `boundary` |
| `TC-Security_*` | `security` |
| `TC-Performance_*` | `performance` |
| `TC-API_*` | `api` |
| `TC-DB_*` | `db` |
| anything else | `functional` |

### 2c. Build final label list

For each TC, compose the labels array:
```
["@<featureSlug>", "<type>", "<tag1>", "<tag2>", ...]
```

- `featureSlug` = module name exactly as provided (preserving case and separators)
- `type` = lowercase type string from Step 2a or 2b
- Additional tags from markdown / spec (in their original casing, e.g. `@Smoke`, `@Regression`,
  `@automation`)
- If `tags[]` is empty (absent from both sources), the final value is just `["@<featureSlug>", "<type>"]`

Print the resolved labels per TC:
```
TC-Valid_Stepper_Renders_On_Page_Load  (PROJ-579)  →  ["@Workflow_Shell", "positive", "@Smoke", "@Regression", "@automation"]
TC-Security_Abort_API_Requires_Auth    (PROJ-605)  →  ["@Workflow_Shell", "security", "@Regression"]
```

---

## STEP 3 — GENERATE AND RUN PATCH SCRIPT

Write `patch_jira_tc_labels.js` at the **project root**:

```javascript
const https = require('https');

const JIRA_BASE_URL    = process.env.JIRA_BASE_URL;
const JIRA_EMAIL       = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN   = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
  console.warn('⚠️  Jira credentials not configured.');
  process.exit(0);
}

// Injected by Claude: { jiraKey: string → labels: string[] }
const labelsByKey = <LABEL_MAP>;

function jiraRequest(method, path, body, baseUrl, email, apiToken) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
    const url = new URL(path, baseUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data ? JSON.parse(data) : null }));
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Fetch current labels for an issue
async function getLabels(key) {
  const res = await jiraRequest('GET', `/rest/api/3/issue/${key}?fields=labels`, null, JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN);
  if (res.status !== 200) throw new Error(`GET ${key} returned ${res.status}`);
  return (res.body.fields.labels || []);
}

// Update issue labels
async function updateLabels(key, labels) {
  return jiraRequest('PUT', `/rest/api/3/issue/${key}`, { fields: { labels } }, JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN);
}

// Normalise for comparison: sort and lowercase
function normaliseLabels(arr) {
  return [...arr].map(l => l.trim().toLowerCase()).sort().join('|');
}

async function run() {
  let patched = 0;
  let skipped = 0;
  let failed  = 0;

  for (const [key, labels] of Object.entries(labelsByKey)) {
    try {
      const currentLabels = await getLabels(key);
      // Skip if Jira already has the correct labels (normalised comparison)
      if (normaliseLabels(currentLabels) === normaliseLabels(labels)) {
        console.log(`Skipped  ${key}: labels already up-to-date`);
        skipped++;
        continue;
      }

      const res = await updateLabels(key, labels);
      if (res.status === 204 || res.status === 200) {
        console.log(`Patched  ${key}: ${JSON.stringify(labels)}`);
        patched++;
      } else {
        throw new Error(`PUT returned ${res.status}: ${JSON.stringify(res.body)}`);
      }
    } catch (err) {
      console.error(`FAILED   ${key}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone — ${patched} patched, ${skipped} skipped (already up-to-date), ${failed} failed`);
  if (failed) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
```

`<LABEL_MAP>` is a JavaScript object literal with all `jiraKey → labelsArray` pairs from
Step 2c, inlined directly by Claude before writing the file.

Run:
```bash
node patch_jira_tc_labels.js
```

---

## STEP 4 — REPORT AND CLEANUP

Print a summary:

```
patch-jira-tc-labels — Complete

Module : <module_name>

  Jira Key   TC Slug                                    Labels
  ─────────────────────────────────────────────────────────────────────────────────────
  PROJ-579   TC-Valid_Stepper_Renders_On_Page_Load       ["@Workflow_Shell", "positive", "@Smoke", "@Regression", "@automation"]
  PROJ-580   TC-Valid_Stepper_Renders_All_7_Screens      ["@Workflow_Shell", "positive", "@Regression", "@automation"]
  ...
  ─────────────────────────────────────────────────────────────────────────────────────
  Total: N patched, S skipped (already up-to-date), E failed
```

If any TC in the mapping had **no labels resolvable** from either source (markdown or spec),
list them separately:
```
WARN: No labels found for the following TCs — patched with featureSlug + type only:
  TC-<slug> (<jiraKey>)
```

Cleanup from project root:
```bash
rm -f patch_jira_tc_labels.js
```

---

## RULES

1. **Never create or delete issues** — this skill only updates `labels`.
2. **Credentials always from `.env`** — never hardcode or prompt for them.
3. **Skip if already correct** — before updating, fetch the current `labels` from Jira; skip
   an issue if its normalised current labels match the computed value (normalisation: lowercase,
   sort alphabetically). Only PUT issues where the value actually differs.
4. **featureSlug** = the module name exactly as the user typed it (including `_` vs `-`).
5. **Label deduplication** — if a label appears in both the `@tags` JSDoc and the test title,
   include it only once.
6. **Spec file lookup key** = the Jira issue key (from `mapping` values), not the TC slug.
7. **No auto-chaining** — this skill runs standalone; it does not invoke other skills.
8. **Script at project root** — write `patch_jira_tc_labels.js` to the project root (not `/tmp`)
   so `require('https')` and dotenv resolve correctly.
9. **Partial label availability** — if TestCases.md exists but a specific TC is missing from it,
   fall back to the spec file for that TC only.
10. **Module name flexibility** — accept both `Campaign-Listing` (hyphen) and `Workflow_Shell`
    (underscore); use the exact string supplied as the featureSlug in labels.

user:
{{module_name}}
