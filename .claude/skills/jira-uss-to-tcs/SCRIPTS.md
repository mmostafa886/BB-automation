# jira-uss-to-tcs — Script Templates

Full Node.js script templates referenced from [WORKFLOW.md](WORKFLOW.md). Each script is
written to the project root via the Write tool, executed, then deleted — never use heredoc.
See SKILL.md's "SCRIPT EXECUTION PATTERN" for the mandatory write/run/delete cycle.

---

## Step 2 — Fetch User Stories Script

Written as `<FeatureName>_fetch.js` (or `tmp_fetch_us.js` if `FeatureName` is not yet known).

```javascript
'use strict';
require('./node_modules/dotenv').config();
const https = require('https');
const fs    = require('fs');

const JIRA_BASE_URL   = process.env.JIRA_BASE_URL;
const JIRA_EMAIL      = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN  = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
  console.warn('⚠️  Jira credentials not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY in .env to enable Jira integration.');
  process.exit(0);
}

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

const keys = [<'PROJ-123'>, <'PROJ-124'>, ...];   // from config/jira-us-ids.json

async function run() {
  const items = [];
  const commentsMap = {};

  for (const key of keys) {
    // Path A: direct key fetch
    const result = await jiraRequest('GET', `/rest/api/3/issue/${key}?fields=summary,description,labels,comment`, null);
    if (result.status !== 200) {
      console.error(`Failed to fetch ${key}: HTTP ${result.status}`);
      continue;
    }
    const issue = result.body;
    items.push(issue);

    // Fetch comments for Definition of Done detection
    try {
      const commResult = await jiraRequest('GET', `/rest/api/3/issue/${key}/comment`, null);
      const comments = (commResult.body && commResult.body.comments) || [];
      commentsMap[key] = comments.map(c => {
        const body = c.body;
        if (!body) return '';
        if (typeof body === 'string') return body;
        // ADF (Atlassian Document Format) — extract text nodes
        return JSON.stringify(body);
      }).join('\n');
    } catch (_) {
      commentsMap[key] = '';  // graceful — never fail the whole fetch
    }
  }

  if (!items || items.length === 0) {
    console.error('No User Stories found for the given keys.');
    process.exit(1);
  }

  fs.writeFileSync('tmp_us_raw.json', JSON.stringify({ items, commentsMap }, null, 2));
  console.log(`Fetched ${items.length} User Stories.`);
  items.forEach(i => console.log(`  ${i.key}: ${i.fields.summary}`));
}

run().catch(err => { console.error(err); process.exit(1); });
```

Run:
```bash
cd <project-root> && node <FeatureName>_fetch.js
rm -f <FeatureName>_fetch.js
```

Use the Read tool to read `tmp_us_raw.json` (structured as `{ items, commentsMap }`) and
build the `stories` array — see [WORKFLOW.md#step-2](WORKFLOW.md) for the field mapping.

---

## Step 2d — Fetch Existing Linked Test Cases Script

Written as `<FeatureName>_fetch_existing_tcs.js`.

```javascript
'use strict';
require('./node_modules/dotenv').config();
const https = require('https');
const fs    = require('fs');

const JIRA_BASE_URL  = process.env.JIRA_BASE_URL;
const JIRA_EMAIL     = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;

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

const usKeys = [<'PROJ-123'>, <'PROJ-124'>, ...];  // from config/jira-us-ids.json

async function run() {
  const byUsKey = {};
  let totalExisting = 0;

  for (const usKey of usKeys) {
    // Expand all issue links — do NOT filter by link type
    const result = await jiraRequest('GET', `/rest/api/3/issue/${usKey}?fields=issuelinks,summary`, null);
    const issue = result.body;
    const links = (issue && issue.fields && issue.fields.issuelinks) || [];

    // Extract linked issue keys, deduplicate
    const linkedKeys = [...new Set(
      links
        .map(l => (l.inwardIssue || l.outwardIssue || {}).key)
        .filter(k => k && k !== usKey)
    )];

    if (linkedKeys.length === 0) {
      byUsKey[usKey] = [];
      continue;
    }

    // Fetch linked issues and keep only Task issues (Test Cases)
    const tcs = [];
    for (const linkedKey of linkedKeys) {
      try {
        const r = await jiraRequest('GET', `/rest/api/3/issue/${linkedKey}?fields=summary,issuetype,description,labels`, null);
        const linked = r.body;
        if (linked && linked.fields && linked.fields.issuetype &&
            linked.fields.issuetype.name === 'Task') {
          tcs.push({
            jiraKey:     linked.key,
            title:       linked.fields.summary        || '',
            description: linked.fields.description    || '',
            labels:      linked.fields.labels         || [],
          });
        }
      } catch (_) {
        // graceful — never fail the whole fetch for one linked issue
      }
    }

    byUsKey[usKey] = tcs;
    totalExisting += tcs.length;
    console.log(`  US ${usKey}: ${tcs.length} existing TC(s) found`);
  }

  fs.writeFileSync('tmp_existing_tcs_<FeatureName>.json', JSON.stringify({ byUsKey, totalExisting }, null, 2));
  console.log(`\nExisting TCs written to tmp_existing_tcs_<FeatureName>.json (total: ${totalExisting})`);
}

run().catch(err => { console.error(err); process.exit(1); });
```

> **Note:** Replace `<FeatureName>` in the filename string and `usKeys` array with actual values
> before writing the script.

Run:
```bash
cd <project-root> && node <FeatureName>_fetch_existing_tcs.js
rm -f <FeatureName>_fetch_existing_tcs.js
```

---

## Step 3.5 — Save Local Markdown Script

Written as `<FeatureName>_save_md.js`.

```javascript
// <FeatureName>_save_md.js  (written to project root via Write tool)
'use strict';
const fs   = require('fs');
const path = require('path');

const featureName = '<FeatureName>';
const agentSuffix = '<AgentSuffix>';  // e.g. '_Claude', '_OpenAI', '' — MUST be defined

const testCases = JSON.parse(fs.readFileSync('tmp_tcs_<FeatureName>.json', 'utf8'));

// Group by parent US
const grouped = {};
for (const tc of testCases) {
  const key = `US-${featureName}-${tc.parentTitle.split(/\s+/).slice(0, 5).join('_')}`;
  if (!grouped[key]) grouped[key] = { heading: key, tcs: [] };
  grouped[key].tcs.push(tc);
}

let md = '';
for (const group of Object.values(grouped)) {
  md += `### Story: ${group.heading}\n`;
  for (const tc of group.tcs) {
    md += `**Test Case ID:** TC-${tc.tcId}: ${tc.title}\n`;
    md += `**Type:** ${tc.type}\n`;
    md += `**Preconditions:** ${tc.preconditions}\n`;
    md += `**Steps:**\n`;
    tc.steps.forEach((step, i) => { md += `${i + 1}. ${step}\n`; });
    md += `**Expected Result:** ${tc.expectedResult}\n\n`;
  }
}

fs.mkdirSync('test_cases', { recursive: true });
const outPath = path.join('test_cases', `${featureName}_TestCases${agentSuffix}.md`);
fs.writeFileSync(outPath, md.trimEnd() + '\n', 'utf8');
console.log(`Test Cases saved to ${outPath}`);
```

Run:
```bash
cd <project-root> && node <FeatureName>_save_md.js
rm -f <FeatureName>_save_md.js
```

Confirm: `"Test Cases saved to test_cases/<FeatureName>_TestCases<AgentSuffix>.md"`

---

## Step 4 — Create Test Case Issues Script

Written as `<FeatureName>_create_tcs.js`.

```javascript
'use strict';
require('./node_modules/dotenv').config();
const https = require('https');
const fs    = require('fs');
const path  = require('path');

const JIRA_BASE_URL     = process.env.JIRA_BASE_URL;
const JIRA_EMAIL        = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN    = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY  = process.env.JIRA_PROJECT_KEY;
const JIRA_US_ISSUE_TYPE = process.env.JIRA_US_ISSUE_TYPE || 'Story';
const JIRA_TC_ISSUE_TYPE = process.env.JIRA_TC_ISSUE_TYPE || 'Task';

if (!JIRA_BASE_URL || !JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_PROJECT_KEY) {
  console.warn('⚠️  Jira credentials not configured. Set JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN, JIRA_PROJECT_KEY in .env to enable Jira integration.');
  process.exit(0);
}

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

async function createIssue(fields) {
  const result = await jiraRequest('POST', '/rest/api/3/issue', { fields });
  return result.body; // { id, key, self }
}

async function linkIssues(inwardKey, outwardKey, linkType) {
  await jiraRequest('POST', '/rest/api/3/issueLink', {
    type: { name: linkType },
    inwardIssue: { key: inwardKey },
    outwardIssue: { key: outwardKey },
  });
}

const featureName = '<FeatureName>';
const featureSlug = '<feature-slug>';
const agentSuffix = '<AgentSuffix>';

const testCases = JSON.parse(fs.readFileSync(`tmp_tcs_${featureName}.json`, 'utf8'));

async function run() {
  const tcKeyMapping = {};
  const errors       = [];

  for (const tc of testCases) {
    try {
      const issue = await createIssue({
        project: { key: JIRA_PROJECT_KEY },
        summary: tc.title,
        description: {
          type: 'doc', version: 1,
          content: [{ type: 'paragraph', content: [{ type: 'text',
            text: `Preconditions: ${tc.preconditions}\n\nSteps:\n${tc.steps.map((s, i) => `${i+1}. ${s}`).join('\n')}\n\nExpected Result: ${tc.expectedResult}` }] }]
        },
        issuetype: { name: JIRA_TC_ISSUE_TYPE },
        labels: ['test-case', featureSlug, tc.type.toLowerCase()],
        priority: { name: tc.type === 'Performance' ? 'High' : 'Medium' },
      });

      // Link to parent User Story
      try {
        await linkIssues(issue.key, tc.parentJiraKey, 'Tests');
      } catch (linkErr) {
        console.warn(`Warning: could not link ${issue.key} → ${tc.parentJiraKey}: ${linkErr.message}`);
      }

      tcKeyMapping[tc.tcId] = { jiraKey: issue.key, parentJiraKey: tc.parentJiraKey };
      console.log(`Created: ${tc.tcId} -> Jira ${issue.key} (parent: ${tc.parentJiraKey}) — ${JIRA_BASE_URL}/browse/${issue.key}`);
    } catch (err) {
      errors.push({ tcId: tc.tcId, error: err.message });
      console.error(`FAILED: ${tc.tcId}: ${err.message}`);
    }
  }

  fs.mkdirSync('test_cases', { recursive: true });
  const mappingPath = path.join('test_cases', `${featureName}_Jira_TCs${agentSuffix}.json`);
  fs.writeFileSync(mappingPath, JSON.stringify({
    feature: featureName, mapping: tcKeyMapping, errors,
  }, null, 2));
  console.log(`\nTC mapping saved: ${mappingPath}`);
  if (errors.length) { process.exit(1); }
}

run().catch(err => { console.error(err); process.exit(1); });
```

Run:
```bash
cd <project-root> && node <FeatureName>_create_tcs.js
rm -f <FeatureName>_create_tcs.js
```

---

## Step 5 — Local-Only Mapping Script

Written as `<FeatureName>_save_mapping.js`.

```javascript
// <FeatureName>_save_mapping.js
'use strict';
const fs   = require('fs');
const path = require('path');

const featureName = '<FeatureName>';
const agentSuffix = '<AgentSuffix>';  // MUST be defined — e.g. '_Claude', '_OpenAI', ''

const testCases   = JSON.parse(fs.readFileSync(`tmp_tcs_${featureName}.json`, 'utf8'));
const rawUsData   = JSON.parse(fs.readFileSync('tmp_us_raw.json', 'utf8'));
// tmp_us_raw.json is { items, commentsMap } — extract the items array
const stories     = rawUsData.items || rawUsData;  // backwards-compat if items key absent

// ── File A: TC mapping with jiraKey: null ──────────────────────────────────────
const localMapping = {};
for (const tc of testCases) {
  localMapping[tc.tcId] = { jiraKey: null, parentJiraKey: tc.parentJiraKey };
}
fs.mkdirSync('test_cases', { recursive: true });
const tcMappingPath = path.join('test_cases', `${featureName}_Jira_TCs${agentSuffix}.json`);
fs.writeFileSync(tcMappingPath, JSON.stringify({
  feature: featureName,
  localOnly: true,
  mapping: localMapping,
  errors: [],
}, null, 2));
console.log(`TC mapping saved: ${tcMappingPath}  (jiraKey: null — not pushed to Jira)`);

// ── File B: US Jira key mapping ───────────────────────────────────────────────
const usMapping = {};
for (const item of stories) {
  const title     = item.fields.summary;
  const jiraKey   = item.key;
  const titleSlug = title.split(/\s+/).slice(0, 5).join('_');
  const key = `US-${featureName}-${titleSlug}`;
  usMapping[key] = jiraKey;
}
fs.mkdirSync('stories', { recursive: true });
const usMappingPath = path.join('stories', `${featureName}_Jira_IDs.json`);
fs.writeFileSync(usMappingPath, JSON.stringify({
  feature: featureName,
  mapping: usMapping,
  errors: [],
}, null, 2));
console.log(`US Jira key mapping saved: ${usMappingPath}`);
```

Run:
```bash
cd <project-root> && node <FeatureName>_save_mapping.js
rm -f <FeatureName>_save_mapping.js
```

---

## Step 5.5 — Update testCaseFilter.js Script

Written as `<FeatureName>_update_filter.js`.

```javascript
'use strict';
const fs   = require('fs');
const path = require('path');

const filterPath  = path.resolve('config/testCaseFilter.js');
const agentSuffix = '<AgentSuffix>';
const mappingPath = path.resolve(`test_cases/<FeatureName>_Jira_TCs${agentSuffix}.json`);
const moduleName  = '<ModuleName>';

// ── 1. Read new Jira TC keys from mapping ─────────────────────────────────────
const raw     = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const newKeys = Object.values(raw.mapping || {})
  .map(v => (typeof v === 'object' && v !== null ? v.jiraKey : v))
  .filter(k => k !== null && typeof k === 'string');

if (newKeys.length === 0) {
  console.log('No successful TC keys in mapping — nothing to add to testCaseFilter.js.');
  process.exit(0);
}

// ── 2. Load existing filter to detect existing keys ───────────────────────────
delete require.cache[require.resolve(filterPath)];
const filter = require(filterPath);

const existingModule = filter.modules.find(
  m => m.name.toLowerCase() === moduleName.toLowerCase()
);

let content = fs.readFileSync(filterPath, 'utf8');

if (existingModule) {
  const alreadyPresent = new Set(existingModule.testCaseIds || []);
  const toAdd = newKeys.filter(k => !alreadyPresent.has(k));

  if (toAdd.length === 0) {
    console.log(`testCaseFilter.js — "${moduleName}": all ${newKeys.length} key(s) already present. No changes.`);
    process.exit(0);
  }

  const nameRe    = new RegExp(`name:\\s*['"]${moduleName.replace(/[-]/g, '[-_]')}['"]`);
  const nameMatch = nameRe.exec(content);
  if (!nameMatch) { console.error(`Could not locate module "${moduleName}". Skipping.`); process.exit(0); }

  const fromName     = content.indexOf('testCaseIds:', nameMatch.index);
  const bracketOpen  = content.indexOf('[', fromName);
  const bracketClose = content.indexOf(']', bracketOpen + 1);
  if (fromName === -1 || bracketOpen === -1 || bracketClose === -1) {
    console.error(`Could not locate testCaseIds array for "${moduleName}". Skipping.`);
    process.exit(0);
  }

  const injection = `,\n        ${toAdd.map(k => `'${k}'`).join(',')} // added by jira-uss-to-tcs`;
  content = content.slice(0, bracketClose) + injection + '\n      ' + content.slice(bracketClose);
  fs.writeFileSync(filterPath, content, 'utf8');
  console.log(`testCaseFilter.js — UPDATED "${moduleName}": +${toAdd.length} new key(s) [${toAdd.join(', ')}]. ${alreadyPresent.size} already existed — untouched.`);

} else {
  const lastModuleClose = content.lastIndexOf('    }');
  if (lastModuleClose === -1) { console.error('Could not locate end of modules array. Skipping.'); process.exit(0); }

  const newEntry =
    `,\n    {\n` +
    `      name: '${moduleName}',\n` +
    `      description: 'Auto-added by jira-uss-to-tcs — ${new Date().toISOString().slice(0,10)}',\n` +
    `      testCaseIds: [\n        ${newKeys.map(k => `'${k}'`).join(',')}\n      ]\n    }`;

  content = content.slice(0, lastModuleClose + 5) + newEntry + content.slice(lastModuleClose + 5);

  const activeRe    = /activeModules:\s*\[([^\]]*)\]/s;
  const activeMatch = activeRe.exec(content);
  if (activeMatch) {
    const closePos   = content.indexOf(']', activeMatch.index + 'activeModules:'.length);
    const linePrefix = (content.slice(0, closePos).match(/\n(\s+)$/) || [,'    '])[1];
    content = content.slice(0, closePos) + `\n${linePrefix}'${moduleName}',\n  ` + content.slice(closePos);
  }

  fs.writeFileSync(filterPath, content, 'utf8');
  console.log(`testCaseFilter.js — ADDED new module "${moduleName}" with ${newKeys.length} key(s) [${newKeys.join(', ')}].`);
}
```

Run:
```bash
cd <project-root> && node <FeatureName>_update_filter.js
rm -f <FeatureName>_update_filter.js
```
