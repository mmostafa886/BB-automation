# tcs-to-plscript — AutomationEngineerSkill

## What it does

Synthesizes **production-ready Playwright TypeScript automation scripts** from manual Test Cases,
following the project's **self-healing TAF architecture** (4-layer output). Acts as a Lead QA
Automation Engineer, producing code that integrates directly with `SelfHealingPageBase`,
`AdvancedActionsHelper`, `AdvancedAssertionsHelper`, and the `selfHealingFixture` fixture.

---

## Input

`{{test_cases}}` is resolved in priority order (flag tokens are stripped first):

1. **File path / glob** — e.g. `test_cases/Reagents_TestCases.md` or `test_cases/*_TestCases.md`
   → reads and concatenates all matching files.
2. **Auto-discover** — if empty or omitted → scans `test_cases/*_TestCases.md` and:
   - 1 file found → reads it automatically.
   - Multiple files → lists them and asks which to process (or "all").
   - None found → stops with an error message.
3. **Inline markdown** — paste TC content directly (starts with `#` or `TC-` lines) → used as-is.

The skill confirms the resolved source before proceeding:
`Reading TCs from: test_cases/Reagents_TestCases.md`

---

## Flags

**`--execute-tests=<true|false>`** (default: `false`)

When `true`, runs the generated specs after saving (up to 2 rounds with fixes), then proceeds to Polish + PR with an 80% pass-rate gate.
When `false` or omitted, saves all files and proceeds directly to Polish + PR — no test run.

**`--compare-coverage`** (presence flag — no value; default: absent = disabled)

When present, activates coverage comparison for any TC that already has a spec file.
For each such TC, the skill:

1. Generates the new spec in memory (does not write yet)
2. Computes a coverage score for both old and new based on: assertion count (`expect(`),
   step markers (`// Step`), and ADO TC step matching (keyword overlap per numbered step)
3. Displays a comparison table with per-metric counts and a score-based recommendation
4. Asks via `AskUserQuestion` whether to keep the NEW or OLD spec
5. Applies the decision — renames and overwrites (keep NEW) or discards (keep OLD)

When absent (default), existing stale-detection behavior is unchanged.

**`--wireframe-url=<url>`** (optional; default: prompt is automatic)

URL of the wireframe / UI prototype (e.g. Figma, Zeplin, live staging app). When provided:
- The skill captures all interactive UI elements visible in the wireframe via MCP browser snapshot
- Element selectors (role, name, label, test-id) are extracted from the live DOM
- When inferring selectors from TC steps, the skill matches step text against wireframe elements semantically and uses real selectors instead of guessing from text alone
- Improves locator accuracy and reduces brittle `text=` or positional selectors

If absent, the skill **automatically prompts** via `AskUserQuestion` (Step B-5) asking whether you have a wireframe URL. This prompt is **mandatory** for direct invocations — it cannot be skipped unless the skill is called from a pipeline orchestrator (`brd-full-pipeline`, `jira-full-pipeline`).

---

## Output — 4 layers per feature

| Layer | Output | Action |
| ----- | ------ | ------ |
| 1 — Locators | `src/locators/<page>-page-locators.ts` | Created or extended |
| 2 — Page class | `src/pages/<page>-page-self-healing.ts` | Created or extended |
| 3 — POM registration | `src/pages/pom-lazy-self-healing.ts` | Updated in-place |
| 4 — Spec files | `tests/generated/<Module>/tc-<id>-<title-slug>.spec.ts` | One per TC |

Chains automatically into `/polish-generated-code` when complete, scoped to only the module(s) processed in this run.

---

## Spec file naming

Format: `tc-<id>-<title-slug>.spec.ts` — **both tokens are always present**.

**`<id>` resolution (priority order):**

1. **ADO numeric ID** — looked up from `test_cases/<Feature>_ADO_TCs.json` `mapping` object
   (e.g. `"TC-Boundary_Max_Length_First_Name": 382` → `382`)
2. **Numeric TC ID** — strip `TC-` from a numeric ID (e.g. `TC-3914` → `3914`)
3. **Text-based fallback** — strip `TC-`, replace underscores with hyphens, lowercase
   (only when no mapping file exists)

**`<title-slug>`** — TC title lowercased and hyphenated.

Examples:

- `TC-3914` + `"Verify Reagents Page Not Accessible"` → `tc-3914-verify-reagents-page-not-accessible.spec.ts`
- `TC-Boundary_Max_Length_First_Name` (ADO ID 382) + `"Enter First Name at Maximum Allowed Character Length"` → `tc-382-boundary-max-length-first-name-enter-first-name-at-maximum-allowed-character-length.spec.ts`
- `TC-Valid_Admin_PIM_Navigation` (no mapping file) + `"Valid Admin Navigation to Add Employee Tab"` → `tc-valid-admin-pim-navigation-valid-admin-navigation-to-add-employee-tab.spec.ts`

**Existing file handling (stale detection is MANDATORY before every write):**

| Situation | Action |
| --------- | ------ |
| Different filename matches the same `<title-slug>` | `git mv` stale file → `<stale-base>_old.spec.ts`; write fresh spec |
| Exact filename already exists | `git mv` existing → `tc-<id>-<title-slug>_old.spec.ts`; write fresh spec |
| No existing file | Write directly |
| `--compare-coverage` present + existing file | Score both specs (assertions × 3, step markers × 2, ADO step matching × 50), display comparison table, ask user via `AskUserQuestion` which version to keep; apply decision |

The `_old` copy is kept in git history so no work is ever silently lost.

**Duplicate / re-submitted TCs:** If the same TC key appears more than once in the input, the
last occurrence wins and a warning is printed.

---

## TC Markdown Format

The skill reads `*_TestCases.md` files. Each TC entry supports these fields:

```markdown
### Story: US-Reaction-Class-RCL-002: Protocol Per Reaction Class

**Test Case ID:** TC-Valid_Tab_Data_Preserved_On_Switch
**Title:** Valid: Tab Data Preserved When Switching Between Details and Protocol Tabs
**Type:** Positive
**Tags:** @Smoke; @automation; @Regression
**State:** Active
**Preconditions:** User is logged in as admin.
**Steps:**
1. Navigate to the Create Reaction Class form.
2. Fill in Name, Reaction Type, and Default Temperature.
**Expected Result:** All data is preserved.
```

Key fields for the skill:

| Field | Required | Purpose |
|-------|----------|---------|
| `**Tags:**` | Optional | Semicolon-separated tags (format from `merge-tc-sets`): `@Smoke; @automation; @Regression`. Space-separated also accepted for backwards compatibility. Tags are normalised to lowercase for matching — must include `@automation` for scripting; `@regression`/`@smoke` are carried into the spec title and JSDoc. |
| `**State:**` | Optional | If `Closed`, the TC is skipped entirely. |
| `### Story: US-...` header | Optional | US ID extracted for `@US-<id>` tag in spec title. |

---

## Automation Filtering

Only TCs that satisfy **all** of the following are scripted:

| Condition | Check |
|-----------|-------|
| Has `@automation` tag | `**Tags:**` field contains `@automation` |
| Not Closed | `**State:**` ≠ `Closed` (or field absent) |

TCs without a `**Tags:**` field or without `@automation` are **skipped** with a count printed after processing.

---

## Tags Propagated to Specs

| Tag | Source | Example |
|-----|--------|---------|
| `@automation` | `**Tags:**` field | `@automation` |
| `@regression` | `**Tags:**` field | `@regression` |
| `@smoke` | `**Tags:**` field | `@smoke` |
| `@US-<id>` | `### Story: US-<id>:...` header above TC | `@US-RCL-002` |

These appear in the **test title** (enabling `--grep @regression`, `--grep @US-RCL-002`) and in the JSDoc block (`@tags`, `@UserStory`).

---

## Test Data Files

All concrete values used in specs come from `test-data/` instead of being hardcoded. The target file is chosen by TC title heuristic:

| TC title contains | Target file |
|-------------------|------------|
| "creat" / "add" / "new" | `test-data/new-<module-kebab>.json` |
| "list" / "filter" / "search" / "view" | `test-data/<module-kebab>-listing.json` |
| "edit" / "update" / "modif" | `test-data/edit-<module-kebab>.json` |
| "delete" / "remov" | `test-data/delete-<module-kebab>.json` |
| (default) | `test-data/<module-kebab>.json` |

Existing files are **extended** (new keys added, existing keys never overwritten). Specs import the JSON:

```typescript
import testData from '../../../test-data/new-reaction-class.json';
// ...
await pomSelfHealing.reactionClassPage.fillClassName(testData.className);
```

---

## Key rules applied

- **Automation filter** — Only TCs with `@automation` in `**Tags:**` are scripted; Closed TCs are skipped.
- **Self-healing locators** — Every element is a `SelfHealingLocator` wired via `SelfHealingLocator.from()` — 3-phase healing (primary → semantic → AI)
- **SelfHealingPageBase** — All page classes extend `SelfHealingPageBase`; actions use `this.actions.*`, assertions use `this.assert.*`
- **No bare `page.*`** — Direct Playwright page calls are forbidden in page objects — always go through helpers
- **Fixture pattern** — Specs import `{ test } from '../../fixtures/self-healing-fixture'` and access pages via `pomSelfHealing.<page>.*`
- **Every page method body wrapped in `test.step()`** — Named steps appear in the HTML report at page-object level; import `test` from `@playwright/test` in page classes.
- **No `test.step()` in spec bodies** — Page methods own the step wrapping.
- **TC tags in title** — Test title format: `TC-<id>: <Title> @automation @regression @US-RCL-002 @P<priority> @<Module>` — enables `--grep @automation`, `--grep @regression`, `--grep @US-RCL-002`, `--grep "TC-3914"`
- **No hardcoded test data** — Values come from `test-data/*.json`; page methods accept data as parameters.
- **`test.fixme` by default** — All generated specs use `test.fixme(...)` instead of `test(...)`. Marks the test as known-pending; remove `.fixme` manually once the feature is verified.
- **Post-generation cleanup** — Unused locators/methods added in this session are removed; pre-existing code is never touched.

---

## Pipeline position

```text
brd-to-uss / jira-uss-to-tcs
        ↓
  uss-to-tcs / jira-uss-to-tcs
        ↓
[tcs-to-plscript]  ← you are here
        ↓  auto-continues
polish-generated-code <ModuleName>  ← scoped to this run only
```

> Polish is invoked with the module name(s) processed in this run so it only touches the
> files created or modified during this execution — not every file in the project.

Also invoked directly from `brd-full-pipeline` and `jira-full-pipeline` (EXECUTE & FIX and
CREATE PR phases are always skipped when called from a pipeline orchestrator).

---

## Usage Examples

### 1. Generate scripts from local TC markdown (no wireframe)

```bash
/tcs-to-plscript test_cases/Reagents_TestCases.md
```

Reads TCs from the markdown file, infers selectors from step text, generates specs. The skill will prompt via `AskUserQuestion` asking if you have a wireframe URL to provide; you can skip it or provide a URL.

### 2. With wireframe URL for accurate locator selection

```bash
/tcs-to-plscript test_cases/Reagents_TestCases.md --wireframe-url=https://figma.com/file/abc123/reagents-ui
```

When a wireframe URL is provided:
- The skill captures all interactive elements from the live UI
- TC steps like "click the Save button" are matched against wireframe elements semantically
- Real selectors (`[data-testid="save"]` or role-based locators) are used instead of guessed ones
- Example: TC step "fill Name field with valid data" → matches wireframe input with `data-testid="name-input"` → uses that selector in the script

### 3. Generate and run tests, with wireframe

```bash
/tcs-to-plscript test_cases/Reagents_TestCases.md --wireframe-url=https://figma.com/design/reagents --execute-tests=true
```

Generates scripts with wireframe-enhanced selectors, runs tests (up to 2 rounds with fixes), and opens a PR if pass rate > 80%.

### 4. Compare coverage + use wireframe

```bash
/tcs-to-plscript test_cases/X.md --compare-coverage --wireframe-url=https://staging.example.com/feature
```

Compares new specs (generated with wireframe context) against existing ones, asks which version to keep per TC, runs tests, and chains to Polish.

### 5. Full workflow: wireframe → specs → tests → PR

```bash
# Merge TC sets first (if combining Claude + OpenAI TCs)
/merge-tc-sets Projects_TestCases.md Projects_TestCases_OpenAI.md --wireframe-url=https://figma.com/design/projects

# Generate specs from merged TCs with wireframe locators
/tcs-to-plscript test_cases/Projects_TestCases.md --wireframe-url=https://figma.com/design/projects --execute-tests=true
```

---

## Execution flow

The skill will:

1. Parse `--execute-tests` flag (default: `false`) and `--compare-coverage` flag (default: absent)
2. **Wireframe discovery:** If `--wireframe-url=<url>` is provided, capture UI elements via MCP browser; else prompt via `AskUserQuestion`
3. Infer page names and derive file naming tokens from TC titles
4. Create or extend `src/locators/<page>-page-locators.ts` with selectors:
   - **When wireframe is available:** match TC steps semantically against wireframe elements, use real selectors from the DOM
   - **When no wireframe:** infer selectors from TC step text using heuristics
5. Create or extend `src/pages/<page>-page-self-healing.ts` with action + assertion methods
6. Register new pages in `src/pages/pom-lazy-self-healing.ts`
7. Write one `tests/generated/<Module>/tc-<id>-<title-slug>.spec.ts` per TC using `test.fixme()`
   (renames stale files; overwrites if TC was updated; deduplicates if TC appears twice)
8. **If `--compare-coverage` is present and an existing spec was detected:** compute coverage
    scores (assertions × 3, step markers × 2, ADO step matching × 50), display comparison table,
    ask user which version to keep, apply decision before writing
9. **If `--execute-tests=true`:** run tests (up to 2 rounds) and fix failures
10. Invoke `/polish-generated-code <ModuleName>` (scoped to the module(s) processed in this run)
11. Open a PR (pass rate > 80% required when tests ran; always opens when tests skipped)
