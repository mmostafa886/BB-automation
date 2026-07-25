# Skill Authoring Best-Practices Checklist

Canonical assessment criteria for `apply-skill-best-practices`.
Source: Anthropic's official skill authoring documentation.

---

## CRITICAL — Must fix before skill is production-ready

- [ ] **File size**: `SKILL.md` body is under 500 lines
  - *Why*: Claude loads the entire SKILL.md body into context on invocation. Files over 500 lines waste tokens on content not needed for the current step, and compete with tool outputs for context space.
  - *Fix*: Split into `SKILL.md` (overview) + `WORKFLOW.md` (step detail) + `SCRIPTS.md` (templates) + `REFERENCE.md` (architecture/conventions) as needed.

- [ ] **No circular references**: Supporting files referenced from SKILL.md do not reference each other more than one level deep
  - *Why*: Claude may use `head -100` to preview deeply nested files and miss critical content.
  - *Fix*: All reference files link directly from SKILL.md. WORKFLOW.md may reference SCRIPTS.md but SCRIPTS.md should not reference back.

---

## HIGH — Significantly impacts skill discovery and execution quality

- [ ] **Description includes "Use when…"**: The `description:` YAML field contains a "Use when" clause specifying trigger conditions
  - *Why*: Claude uses the description to decide whether to activate the skill. A description without trigger conditions forces Claude to guess from the name alone, leading to missed or incorrect activations.
  - *Example*: `description: Generates Test Cases from User Stories. Use when given User Story IDs or a feature tag and asked to create Test Cases.`

- [ ] **Description is third-person**: No "I can…", "You can…", "This helps you…" phrasing
  - *Why*: The description is injected into the system prompt. First-person or second-person phrasing creates inconsistent point-of-view and can confuse skill selection.
  - *Fix*: Rewrite as `"Generates…"`, `"Fetches…"`, `"Analyzes…"` etc.

- [ ] **Description is specific**: Names the skill's key inputs, outputs, and any important flags
  - *Why*: Vague descriptions like "Helps with documents" or "Processes data" cannot be used to distinguish between similar skills. Claude needs enough context to choose correctly from 20+ skills.
  - *Fix*: Include the main artifact types (User Stories, Test Cases, Playwright scripts), the data source (ADO, local files, BRD), and critical flags (`--save-local`, `--local-only`, etc.).

- [ ] **Description is under 1024 characters**
  - *Why*: Hard limit enforced by Claude Code.

- [ ] **Description uses only lowercase letters, numbers, and hyphens in the `name:` field**
  - *Why*: Hard limit enforced by Claude Code.

- [ ] **Temp file cleanup present**: Any skill that creates intermediate files during execution
  (scripts, JSON dumps, extraction directories) must include an explicit cleanup step that
  removes those files before the skill is considered complete
  - *Why*: Temp files left in the project root get accidentally committed (real incident:
    `tcs_raw_rsv.json` and `Upload_Reaction_CSV_summarize_existing.js` were committed because
    the generating skill had no cleanup step). They also pollute `git status` and confuse reruns.
  - *What counts as a temp file*: `tmp_*.json`, `*_fetch_*.js`, `*_run.js`, runtime-written
    `.js` scripts, extraction directories (e.g. `d:/temp/pw-trace-analysis/`), `.bak` files
  - *What is NOT a temp file (keep — official skill outputs)*: `test_cases/*.md`,
    `stories/*.md`, `*_ADO_TCs.json`, `*_ADO_IDs.json`, `tests/generated/**/*.spec.ts`,
    `src/locators/*.ts`, `src/pages/*.ts`
  - *Fix*: Add a final `## STEP N — CLEANUP` section with `rm -f <temp-files>` or
    `rm -rf <temp-dir>`, and add `- [ ] Step N: Cleanup temp files` as the last EXECUTION
    CHECKLIST item. Move the cleanup bash command to `SCRIPTS.md` if the skill already uses
    that file. For skills with inline cleanup (per-step), add a final verification step that
    asserts nothing was left behind.

---

## MEDIUM — Improves execution quality and reduces errors

- [ ] **Execution checklist present** (for skills with 3+ sequential steps)
  - *Why*: A copy-paste checklist helps Claude track progress through long workflows, prevents skipping mandatory steps, and gives the user visibility into execution state.
  - *Format*: `- [ ] Step N: <brief label>` lines in a fenced code block so Claude can copy-paste and mark off items.

- [ ] **Feedback loops present** (for skills that produce output that can be validated)
  - *Why*: Explicit validate-fix-retry cycles catch errors early. Without them, Claude may proceed to the next step with invalid intermediate output.
  - *Pattern*: `1. Run validator script → 2. Fix errors → 3. Re-run until clean → 4. Proceed`

- [ ] **Conditional workflows are explicit**: When the skill has branches (e.g., `--local-only` vs. default), each branch is labeled and the skip condition is clearly stated
  - *Why*: Implicit branching causes Claude to execute the wrong path or execute steps that should be skipped.

- [ ] **Supporting files have table of contents** (for reference files over 100 lines)
  - *Why*: Claude sometimes uses `head -100` to preview large files. A ToC at the top ensures Claude can see the full scope of available content even on a partial read.

- [ ] **Consistent terminology throughout**: One term per concept (e.g. always "User Story", never alternating with "US", "Story", "work item")
  - *Why*: Inconsistent terminology forces Claude to spend reasoning cycles on disambiguation.

---

## LOW — Polish improvements

- [ ] **MCP tool names are fully qualified**: All references to Playwright MCP tools use `mcp__playwright__<tool_name>` format
  - *Why*: Bare tool names like `browser_navigate` may not be found when multiple MCP servers are loaded. Fully-qualified names are unambiguous.
  - *Affected tools*: `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_click`, `browser_fill`, `browser_type`, `browser_select_option`, `browser_hover`, `browser_wait_for`, `browser_press_key`, `browser_drag`, `browser_drop`, `browser_evaluate`, `browser_handle_dialog`

- [ ] **File paths use forward slashes**: No Windows-style backslashes in referenced paths
  - *Why*: Backslash paths fail on Unix systems. Forward slashes work on all platforms.

- [ ] **No time-sensitive information**: No "as of [date]", "before [date] use X, after use Y" phrasing
  - *Why*: Time-based conditions become incorrect as the codebase evolves. Use "current method" / "legacy / old patterns" sections instead.

- [ ] **README.md reflects file structure**: If the skill has supporting files (WORKFLOW.md, SCRIPTS.md, etc.), README.md lists them and describes their purpose
  - *Why*: Human developers reading the README should know what files exist and what they contain, without having to read SKILL.md.

- [ ] **Supporting file names are descriptive**: File names clearly indicate content (`WORKFLOW.md` not `doc2.md`, `SCRIPTS.md` not `helpers.md`)
  - *Why*: Claude navigates the skill directory like a filesystem. Descriptive names help it load the right file on the first read.

- [ ] **Scripts prefer forward slashes and handle errors**: Utility scripts use `try/catch`, provide specific error messages, and never use magic numbers without comments
  - *Why*: Scripts that punt failures to Claude (bare `open(path).read()` style) cause skill execution to stop with an opaque error. Scripts should handle failures and provide actionable messages.

- [ ] **Model tier declared**: Skills that perform mechanical/rule-based work (find-replace, boilerplate injection, tag patching, file moves) declare `model: haiku` in frontmatter. Skills that require creative reasoning (BRD analysis, test-case generation, code generation) declare `model: sonnet` or omit the key (defaults to Sonnet).
  - *Why*: Every skill and subagent runs at the default (Sonnet) model unless overridden. Mechanical skills are unnecessarily expensive at Sonnet — Haiku handles them reliably and at significantly lower cost.
  - *Model aliases*: `haiku`, `sonnet`, `opus`, `fable`
  - *Tier guide*: `haiku` = pattern replacement, file wiring, ADO REST calls with fixed schema; `sonnet` = novel reasoning, multi-file code generation, coverage analysis, orchestrator pipelines.

---

## VERIFICATION COMMANDS

Run these after improvements to confirm fixes:

```bash
# Line count
wc -l .claude/skills/<skill>/SKILL.md

# Description check
grep -in "use when" .claude/skills/<skill>/SKILL.md

# Third-person check
grep -in "I can\|you can\|this helps you\|I will\|I'll" .claude/skills/<skill>/SKILL.md

# Checklist presence
grep -c "- \[ \]" .claude/skills/<skill>/SKILL.md

# MCP tool names (bare)
grep -n "browser_navigate\|browser_snapshot\|browser_screenshot\|browser_click\|browser_fill\|browser_type\|browser_select\|browser_hover\|browser_wait" .claude/skills/<skill>/SKILL.md | grep -v "mcp__playwright__"

# Cross-references
grep -c "WORKFLOW.md\|SCRIPTS.md\|REFERENCE.md" .claude/skills/<skill>/SKILL.md

# Temp file cleanup check
grep -in "rm -f\|rm -rf\|cleanup\|clean up" .claude/skills/<skill>/SKILL.md

# Model tier check
grep -n "^model:" .claude/skills/<skill>/SKILL.md
```

---

## SEVERITY SCORING GUIDE

Use this when reporting gaps in the audit:

| CRITICAL | SKILL.md > 500 lines with no supporting files |
| HIGH | Any of: missing "Use when", first-person voice, vague description, temp files created but no cleanup step |
| MEDIUM | Missing checklist (multi-step skill), no feedback loop, missing ToC |
| LOW | Bare MCP names, Windows paths, time-sensitive content, README out of sync |

A skill passes the checklist when: no CRITICAL, no HIGH, MEDIUM items addressed where applicable.
