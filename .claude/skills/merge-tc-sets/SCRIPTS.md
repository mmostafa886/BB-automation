# merge-tc-sets — Script Templates

Reference file for `merge-tc-sets`. Contains every embedded script template referenced from
WORKFLOW.md. Each script is written to the **project root** via the Write tool,
executed with `node`, then deleted with `rm -f` — never left behind.

## Table of contents

1. [Fetch Existing Jira Test Cases](#1-fetch-existing-jira-test-cases) — Step 1.5b
2. [Fetch User Story Comments (Definition of Done)](#2-fetch-user-story-comments-definition-of-done) — Step 5a
3. [Write Merged Markdown](#3-write-merged-markdown) — Step 4

---

## 1. Fetch Existing Jira Test Cases

Used by **WORKFLOW.md → Step 1.5b**. Fetches Test Case issues already linked (via "Tested By")
to the User Stories for this feature, so they can be excluded from the merged output and
counted as covered in the gap analysis.

Write `<FeatureName>_fetch_existing_tcs.js` to the **project root** via the Write tool:

```javascript
'use strict';
require('./node_modules/dotenv').config();
const https = require('https');
const fs    = require('fs');

const JIRA_BASE_URL  = process.env.JIRA_BASE_URL;
const JIRA_EMAIL     = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const usKeys = [<key1>, <key2>, ...];  // Jira issue keys from stories/<FeatureName>_Jira_IDs.json

function jiraRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = new URL(path, JIRA_BASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
    // Search for Test Cases linked to this User Story issue
    const jql = encodeURIComponent(`issueType = "Test Case" AND "Tested By" = ${usKey}`);
    const res = await jiraRequest('GET', `/rest/api/3/search?jql=${jql}&fields=summary,description,labels`, null);

    if (res.status !== 200) {
      console.warn(`  WARNING: failed to fetch TCs for ${usKey}: ${res.status}`);
      byUsKey[usKey] = [];
      continue;
    }

    const tcs = (res.body.issues || []).map(issue => ({
      jiraKey:     issue.key,
      title:       issue.fields.summary        || '',
      description: issue.fields.description    || '',
      labels:      issue.fields.labels         || [],
    }));

    byUsKey[usKey] = tcs;
    totalExisting += tcs.length;
    console.log(`  US ${usKey}: ${tcs.length} existing TC(s) found`);
  }

  fs.writeFileSync('tmp_existing_tcs_<FeatureName>.json', JSON.stringify({ byUsKey, totalExisting }, null, 2));
  console.log(`\nExisting TCs written to tmp_existing_tcs_<FeatureName>.json (total: ${totalExisting})`);
}

run().catch(err => { console.error(err); process.exit(1); });
```

> **Note:** Replace `<FeatureName>` in the filename string and `usKeys` array with actual values before writing.

Run, then delete the generator script (the JSON output is consumed and deleted separately in
WORKFLOW.md → Step 1.5b):

```bash
cd <project-root> && node <FeatureName>_fetch_existing_tcs.js
rm -f <FeatureName>_fetch_existing_tcs.js
```

If the script exits with code 1 (Jira error), WORKFLOW.md's Step 1.5b handles the warning and
fallback — no changes needed here.

Delete the JSON output after reading it:

```bash
rm -f tmp_existing_tcs_<FeatureName>.json
```

---

## 2. Fetch User Story Comments (Definition of Done)

Used by **WORKFLOW.md → Step 5a**, Source 2 (Jira `description`, `acceptanceCriteria`, and
comments). Only run when Jira env vars are set and no DoD was found in the local User Stories
markdown.

Write `<FeatureName>_fetch_comments.js` to the **project root** via the Write tool:

```javascript
// <FeatureName>_fetch_comments.js  (written to project root via Write tool)
'use strict';
require('./node_modules/dotenv').config();
const https = require('https');
const fs    = require('fs');

const JIRA_BASE_URL  = process.env.JIRA_BASE_URL;
const JIRA_EMAIL     = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

const keysMap = JSON.parse(fs.readFileSync('stories/<FeatureName>_Jira_IDs.json', 'utf8'));
const keys    = Object.values(keysMap.mapping || keysMap).filter(Boolean);

function jiraRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
    const url = new URL(path, JIRA_BASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
  const fieldsMap  = {};
  const commentsMap = {};

  for (const key of keys) {
    // Fetch issue fields
    const res = await jiraRequest('GET', `/rest/api/3/issue/${key}?fields=description,customfield_10014`, null);
    if (res.status === 200) {
      fieldsMap[key] = {
        description:        JSON.stringify(res.body.fields.description || ''),
        acceptanceCriteria: res.body.fields.customfield_10014 || '',
      };
    } else {
      fieldsMap[key] = { description: '', acceptanceCriteria: '' };
    }

    // Fetch comments
    try {
      const cRes = await jiraRequest('GET', `/rest/api/3/issue/${key}/comment`, null);
      commentsMap[key] = (cRes.body.comments || []).map(c => JSON.stringify(c.body || '')).join('\n');
    } catch (_) {
      commentsMap[key] = '';  // graceful — never fail the whole fetch
    }
  }

  fs.writeFileSync(
    'tmp_us_comments_<FeatureName>.json',
    JSON.stringify({ fieldsMap, commentsMap }, null, 2)
  );
  console.log(`Fetched description and comments for ${keys.length} User Stories.`);
}
run().catch(err => { console.error(err); process.exit(1); });
```

Run, then delete the generator script:

```bash
cd <project-root> && node <FeatureName>_fetch_comments.js
rm -f <FeatureName>_fetch_comments.js
```

After reading `tmp_us_comments_<FeatureName>.json` (see WORKFLOW.md → Step 5a for the parsing
rules and detection patterns), delete the temp file:

```bash
rm -f tmp_us_comments_<FeatureName>.json
```

---

## 3. Write Merged Markdown

Used by **WORKFLOW.md → Step 4** and re-run in **Step 6e** after tags are assigned. Serializes
the in-memory merged TC list to the output markdown file using the exact same format as
`/uss-to-tcs` — grouped by parent User Story.

Write `write_merged_tcs_<FeatureName>.js` to the **project root** using the Write tool:

```javascript
'use strict';
const fs   = require('fs');
const path = require('path');

const featureName = '<FeatureName>';
const outPath     = '<OUTPUT_PATH>';   // resolved from --out or default
// mergedGroups[] injected — each: { heading: 'US-...', tcs: [{ tcId, title, type,
//   preconditions, steps[], expectedResult }] }
const mergedGroups = <MERGED_GROUPS_JSON>;

let md = '';
for (const group of mergedGroups) {
  md += `### Story: ${group.heading}\n`;
  for (const tc of group.tcs) {
    md += `**Test Case ID:** TC-${tc.tcId}: ${tc.title}\n`;
    md += `**Type:** ${tc.type}\n`;
    if (tc.tags && tc.tags.length > 0) {
      md += `**Tags:** ${tc.tags.join('; ')}\n`;
    }
    md += `**Preconditions:** ${tc.preconditions}\n`;
    md += `**Steps:**\n`;
    tc.steps.forEach((step, i) => {
      md += `${i + 1}. ${step}\n`;
    });
    md += `**Expected Result:** ${tc.expectedResult}\n\n`;
  }
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, md.trimEnd() + '\n', 'utf8');
console.log(`Merged TC markdown written: ${outPath}`);
```

Execute, then delete the generator script (the output markdown itself is a permanent artifact
and is never deleted):

```bash
cd <project-root> && node write_merged_tcs_<FeatureName>.js
rm -f write_merged_tcs_<FeatureName>.js
```
