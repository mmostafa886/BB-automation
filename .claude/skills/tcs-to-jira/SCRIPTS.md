# tcs-to-jira — Script Templates

Reference file for `tcs-to-jira`. Linked from [WORKFLOW.md](WORKFLOW.md) and [SKILL.md](SKILL.md).
Contains the full Node.js script templates used during execution. Do not link back to WORKFLOW.md
or SKILL.md from below — this file is a leaf reference.

---

## Table of contents

1. [Epic search script (`tcs_epic_search.js`)](#epic-search-script-tcs_epic_searchjs) — Step 1e-i
2. [Fetch existing linked TCs script (`<F>_fetch_existing_tcs.js`)](#fetch-existing-linked-tcs-script-f_fetch_existing_tcsjs) — Step 2.5
3. [Per-feature TC creation script (`tcs_to_jira_run.js`)](#per-feature-tc-creation-script-tcs_to_jira_runjs) — Step 3

---

## Epic search script (`tcs_epic_search.js`)

Written at the project root during Step 1e-i (only when `EpicMode = true`). Searches Jira for an
Epic whose summary exactly matches (case-insensitive) `RequestedEpicName`.

```javascript
const https = require('https');

const JIRA_BASE_URL  = '<JIRA_BASE_URL>';   // injected from .env
const JIRA_EMAIL     = '<JIRA_EMAIL>';
const JIRA_API_TOKEN = '<JIRA_API_TOKEN>';
const JIRA_PROJECT_KEY = '<JIRA_PROJECT_KEY>';
const epicName       = '<RequestedEpicName>';  // exact string from --epic-name

function jiraRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = new URL(path, JIRA_BASE_URL);
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

async function run() {
  const jql = `project = "${JIRA_PROJECT_KEY}" AND issuetype = Epic AND summary ~ "${epicName.replace(/"/g, '\\"')}" ORDER BY created DESC`;
  const res = await jiraRequest('GET', `/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=10`, null);
  if (res.status !== 200) {
    console.log('SEARCH_FAILED');
    process.exit(0);
  }
  const issues = res.body?.issues || [];
  const match = issues.find(i => i.fields.summary.toLowerCase() === epicName.toLowerCase());
  if (match) {
    console.log(`FOUND:${match.key}`);
  } else {
    console.log('NOT_FOUND');
  }
}
run().catch(err => { console.error(err.message); process.exit(1); });
```

Run it:
```bash
node tcs_epic_search.js
```

Parse stdout:
- Output starts with `FOUND:<key>` → `ResolvedEpicKey = <key>`, `EpicAction = "USE_EXISTING"`
- Output is `NOT_FOUND` → proceed to Epic-not-found confirmation (Step 1e-ii in WORKFLOW.md)
- Output is `SEARCH_FAILED` or script exits with code 1 → warn and set `EpicMode = false` (TC issues still created)

Delete the search script immediately after running:
```bash
rm -f tcs_epic_search.js
```

---

## Fetch existing linked TCs script (`<F>_fetch_existing_tcs.js`)

Written at the project root once per feature during Step 2.5, before creating any TC issues.
Discovers Test Case issues already linked to each User Story in Jira so re-runs never create
duplicate issues.

```javascript
'use strict';
require('./node_modules/dotenv').config();
const https = require('https');
const fs    = require('fs');

const JIRA_BASE_URL   = process.env.JIRA_BASE_URL;
const JIRA_EMAIL      = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN  = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;
const usKeys = [<'key1'>, <'key2'>, ...];  // Jira keys from usKeyMapping[F].mapping values

function jiraRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = new URL(path, JIRA_BASE_URL);
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

async function run() {
  const byUsKey = {};
  let totalExisting = 0;

  for (const usKey of usKeys) {
    // Fetch the US issue with all issue links expanded
    const res = await jiraRequest('GET', `/rest/api/3/issue/${usKey}?expand=issuelinks`, null);
    if (res.status !== 200) {
      console.warn(`  WARN: Could not fetch ${usKey} — HTTP ${res.status}`);
      byUsKey[usKey] = [];
      continue;
    }
    const usIssue = res.body;
    const links = usIssue.fields?.issuelinks || [];

    // Collect all linked issue keys (any direction, any link type)
    const linkedKeys = [...new Set(
      links
        .map(l => (l.inwardIssue || l.outwardIssue)?.key)
        .filter(Boolean)
        .filter(k => k !== usKey)
    )];

    const tcs = [];
    for (const linkedKey of linkedKeys) {
      const lRes = await jiraRequest('GET', `/rest/api/3/issue/${linkedKey}`, null);
      if (lRes.status !== 200) continue;
      const lIssue = lRes.body;
      const issueType = lIssue.fields?.issuetype?.name || '';
      // Keep issues of type Task, Test Case, or Sub-task (adjust as needed)
      if (['task', 'test case', 'sub-task'].includes(issueType.toLowerCase())) {
        tcs.push({
          jiraKey:     lIssue.key,
          title:       lIssue.fields?.summary || '',
          description: lIssue.fields?.description || '',
          labels:      lIssue.fields?.labels || [],
        });
      }
    }

    byUsKey[usKey] = tcs;
    totalExisting += tcs.length;
    console.log(`  US ${usKey}: ${tcs.length} existing TC issue(s) found`);
  }

  fs.writeFileSync('tmp_existing_tcs_<F>.json', JSON.stringify({ byUsKey, totalExisting }, null, 2));
  console.log(`\nExisting TCs written to tmp_existing_tcs_<F>.json (total: ${totalExisting})`);
}

run().catch(err => { console.error(err); process.exit(1); });
```

> **Note:** Replace `<F>` in the filename string and `usKeys` array with actual values before writing.
> The `usKeys` array = the string values from `usKeyMapping[F].mapping` (US Jira keys, not TC keys).

Run:
```bash
cd <project-root> && node <F>_fetch_existing_tcs.js
rm -f <F>_fetch_existing_tcs.js
```

Use the Read tool to read `tmp_existing_tcs_<F>.json`, then delete it after the deduplication
check (see WORKFLOW.md Step 2.5):
```bash
rm -f tmp_existing_tcs_<F>.json
```

---

## Per-feature TC creation script (`tcs_to_jira_run.js`)

Written to the **project root** (never `/tmp` — on Windows it maps to AppData and breaks
`require` resolution). Generated and executed **once per feature**, overwriting the file each
iteration, during Step 3.

```javascript
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ── Values injected from .env by the skill before script generation ─────────
const JIRA_BASE_URL     = '<JIRA_BASE_URL>';         // no trailing slash
const JIRA_EMAIL        = '<JIRA_EMAIL>';
const JIRA_API_TOKEN    = '<JIRA_API_TOKEN>';
const JIRA_PROJECT_KEY  = '<JIRA_PROJECT_KEY>';
const JIRA_TC_ISSUE_TYPE = process.env.JIRA_TC_ISSUE_TYPE || 'Task';

const featureName = '<F>';
const featureSlug = '<F>';

// ── Epic mode — ONE of three values injected by the skill: ──────────────────
//   'NONE'         → EpicMode is OFF; skip all epic/label-grouping operations
//   'USE_EXISTING' → use an already-found epic; resolvedEpicKey is its Jira key
//   'CREATE_NEW'   → create a new epic (user confirmed); isFirstFeature controls creation
const epicMode        = '<NONE|USE_EXISTING|CREATE_NEW>';
const resolvedEpicKey = '<null|JIRA_KEY>';  // non-null only when epicMode === 'USE_EXISTING'
const epicName        = '<RequestedEpicName>';  // empty string when epicMode === 'NONE'
const isFirstFeature  = <true|false>;           // true only for the very first feature

// ── Single-feature data — ONLY this feature's mappings and TCs ──────────────
const usKeyMapping = <US_KEY_MAPPING_FOR_F>;
// { mapping: { "US-<slug>": "<jira-key>", ... } }

const testCases = <TEST_CASES_FOR_F>;
// [{ parentStoryId, tcId, title, type, preconditions, tags[], steps[], expectedResult }]
// descriptionAdf is pre-built inline by Claude before writing the file — NOT computed at runtime.

function jiraRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = new URL(urlPath, JIRA_BASE_URL);
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

function buildDescriptionAdf(preconditions, steps, expectedResult) {
  const content = [];
  if (preconditions) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: `Preconditions: ${preconditions}` }],
    });
  }
  content.push({ type: 'paragraph', content: [{ type: 'text', text: 'Steps:' }] });
  content.push({
    type: 'orderedList',
    content: steps.map(s => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: s }] }],
    })),
  });
  if (expectedResult) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: `Expected Result: ${expectedResult}` }],
    });
  }
  return { type: 'doc', version: 1, content };
}

async function run() {
  // ── Resolve epicKey ───────────────────────────────────────────────────────────
  let epicKey = null;
  const epicKeyFile = path.join(__dirname, 'tcs_epic_key.json');

  if (epicMode === 'NONE') {
    epicKey = null;

  } else if (epicMode === 'USE_EXISTING') {
    epicKey = resolvedEpicKey;
    console.log(`Using existing Epic ${epicKey} — "${epicName}"`);

  } else if (epicMode === 'CREATE_NEW') {
    if (isFirstFeature) {
      try {
        const body = {
          fields: {
            project: { key: JIRA_PROJECT_KEY },
            issuetype: { name: 'Epic' },
            summary: epicName,
          },
        };
        const res = await jiraRequest('POST', '/rest/api/3/issue', body);
        if (res.status === 201 && res.body?.key) {
          epicKey = res.body.key;
          fs.writeFileSync(epicKeyFile, JSON.stringify({ epicKey }));
          console.log(`Epic created: ${epicKey} — ${epicName}`);
        } else {
          console.warn(`WARN: Could not create Epic — HTTP ${res.status}: ${JSON.stringify(res.body)}`);
          console.warn('TC issues will still be created as standalone items.');
          fs.writeFileSync(epicKeyFile, JSON.stringify({ epicKey: null }));
        }
      } catch (e) {
        console.warn(`WARN: Could not create Epic — ${e.message}`);
        fs.writeFileSync(epicKeyFile, JSON.stringify({ epicKey: null }));
      }
    } else {
      try {
        epicKey = JSON.parse(fs.readFileSync(epicKeyFile, 'utf8')).epicKey;
        if (epicKey) console.log(`Using Epic ${epicKey} (created by first feature)`);
      } catch (e) {
        console.warn('WARN: Could not read tcs_epic_key.json — label grouping skipped.');
      }
    }
  }

  // ── Create TC issues ─────────────────────────────────────────────────────────
  const tcKeyMapping       = {};
  const tcIssueKeys        = [];
  const tcIssueKeysByUs    = {};
  const errors             = [];

  for (const tc of testCases) {
    const descriptionAdf = buildDescriptionAdf(tc.preconditions, tc.steps, tc.expectedResult);
    const labels = [featureSlug, tc.type.toLowerCase(), ...(tc.tags || []).map(t => t.replace(/^@/, ''))];

    // Add epic label if epic is available
    if (epicKey) labels.push(`epic-${epicKey}`);

    // Add parent US label for grouping
    const parentUsLabel = tc.parentStoryId.replace(/[^a-zA-Z0-9-]/g, '-');
    labels.push(parentUsLabel);

    const issueBody = {
      fields: {
        project: { key: JIRA_PROJECT_KEY },
        issuetype: { name: JIRA_TC_ISSUE_TYPE },
        summary: tc.title,
        description: descriptionAdf,
        labels,
      },
    };

    // Link to parent User Story
    const parentJiraKey = usKeyMapping.mapping[tc.parentStoryId];

    try {
      const res = await jiraRequest('POST', '/rest/api/3/issue', issueBody);
      if (res.status !== 201 || !res.body?.key) {
        throw new Error(`HTTP ${res.status}: ${JSON.stringify(res.body)}`);
      }
      const tcKey = res.body.key;
      tcKeyMapping[tc.tcId] = tcKey;
      tcIssueKeys.push(tcKey);
      if (!tcIssueKeysByUs[tc.parentStoryId]) tcIssueKeysByUs[tc.parentStoryId] = [];
      tcIssueKeysByUs[tc.parentStoryId].push(tcKey);
      console.log(`Created: ${tc.tcId} -> Jira ${tcKey}: ${tc.title}`);

      // Link TC to parent User Story via "Tests" link
      if (parentJiraKey) {
        try {
          const linkBody = {
            type: { name: 'Tests' },
            inwardIssue: { key: tcKey },
            outwardIssue: { key: parentJiraKey },
          };
          const linkRes = await jiraRequest('POST', '/rest/api/3/issueLink', linkBody);
          if (linkRes.status === 201 || linkRes.status === 204) {
            console.log(`  Linked: ${tcKey} Tests ${parentJiraKey}`);
          } else {
            console.warn(`  WARN: Link failed for ${tcKey} → ${parentJiraKey} — HTTP ${linkRes.status}`);
          }
        } catch (linkErr) {
          console.warn(`  WARN: Could not create issue link for ${tcKey} → ${parentJiraKey}: ${linkErr.message}`);
        }
      } else {
        console.warn(`No Jira key for ${tc.parentStoryId} — TC created without US link`);
      }
    } catch (err) {
      errors.push({ tcId: tc.tcId, error: err.message });
      console.error(`FAILED: ${tc.tcId}: ${err.message}`);
    }
  }

  // ── Save per-feature TC mapping ──────────────────────────────────────────────
  const tcMappingPath = path.join('test_cases', `${featureName}_Jira_TCs.json`);
  fs.writeFileSync(tcMappingPath, JSON.stringify({
    feature: featureName, epicKey,
    labelGroups: Object.fromEntries(
      Object.entries(tcIssueKeysByUs).map(([usSlug]) => [usSlug, `epic-${epicKey || 'none'}`])
    ),
    mapping: tcKeyMapping, errors,
  }, null, 2));
  console.log(`TC mapping saved: ${tcMappingPath}`);

  if (errors.length) { process.exit(1); }
}

run().catch(err => { console.error(err); process.exit(1); });
```

Execute once per feature (overwrite the file for each iteration):
```bash
node tcs_to_jira_run.js
```

Final cleanup (see WORKFLOW.md Step 4):
```bash
rm -f tcs_to_jira_run.js tcs_epic_key.json
```
(`tcs_epic_search.js` was already deleted in Step 1e.)
