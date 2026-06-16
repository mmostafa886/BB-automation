# uss-to-tcs — QAAnalystSkill

## What it does
Converts Agile **User Stories** (with Acceptance Criteria) into explicit, step-by-step **Manual Test Cases**. It acts as a Senior QA Analyst, producing unambiguous test cases that specify exact field names, exact input data, and exact expected outcomes — leaving no room for tester interpretation.

Every test case is fully traceable back to a specific Acceptance Criteria in the source User Story.

---

## Input
| Variable | Description |
|----------|-------------|
| `{{user_stories}}` | Markdown-formatted User Stories produced by the `brd-to-uss` skill, or any User Stories following the standard `US-[ID]` format. |

---

## Output
A markdown document containing test cases grouped by User Story, each following this template:

```
### Story: US-[ID]
**Test Case ID:** TC-[ID].[Sub-ID]: [Test Case Title]
**Type:** [Positive / Negative / Boundary / Security / Performance / DB / API]
**Preconditions:** [State before the test begins]
**Steps:**
1. [Exact action — e.g., "Navigate to /login"]
2. [Exact action — e.g., "Enter 'admin@test.com' in the Email field"]
3. [Exact action — e.g., "Click the 'Submit' button"]
**Expected Result:** [Exact, observable outcome]
```

### Test case types covered
| Type | Purpose |
|------|---------|
| **Positive** | Verifies the happy path with valid inputs |
| **Negative** | Verifies system behaviour with invalid/missing inputs |
| **Boundary** | Tests edge values (min/max lengths, limits) |
| **Security** | Tests access control, injection attempts, auth enforcement |
| **Performance** | Tests response-time thresholds, load limits, concurrency |
| **DB** | Tests data persistence, integrity, transactions, and DB constraint enforcement |
| **API** | Tests API contract (status codes, payload schema, error response format) |

---

## Key rules applied
| Rule | Description |
|------|-------------|
| **Determinism** | Steps are explicit — no vague instructions like "fill out the form" |
| **Single verification** | Each test case verifies exactly one outcome |
| **Traceability** | Every test case cites the AC it validates (AC1, AC2, …) |
| **No maximum** | No upper limit on TCs per User Story — generate as many as AC scenarios and risk areas demand |
| **Full-spectrum coverage** | Every US gets Positive, Negative, Boundary, Security, Performance, DB, and API TCs wherever applicable |
| **Gap analysis** | After the initial pass, uncovered AC items, edge cases, security concerns, performance aspects, DB interactions, and API contracts are identified and backfilled before saving |

---

## Pipeline position
```
brd-to-uss → [uss-to-tcs] → tcs-to-plscript
```
This is **Step 2** of the pipeline. It consumes User Stories from `brd-to-uss` and its output feeds `tcs-to-plscript` to generate Playwright automation scripts.

> **Note:** This skill does not save output to a file automatically. When used as part of `brd-full-pipeline`, the test cases are saved to `test_cases/<FeatureName>_TestCases.md`.

---

## Example invocation
Paste the User Stories markdown as input. The skill will:
1. Read each User Story and its Acceptance Criteria
2. Generate test cases per story covering all applicable types (Positive, Negative, Boundary, Security, Performance, DB, API) — no upper limit
3. Run a gap analysis and backfill any uncovered areas
4. Return the complete test case suite as markdown
