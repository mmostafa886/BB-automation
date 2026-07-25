# apply-skill-best-practices

Audits and improves Claude Code skills against Anthropic's official best practices.
Supports single-skill targeted improvements and batch processing of all skills.

---

## Usage

```
/apply-skill-best-practices <skill-name>     Audit and improve one skill
/apply-skill-best-practices all              Audit and improve all skills in .claude/skills/
```

**Examples:**
```
/apply-skill-best-practices brd-to-uss
/apply-skill-best-practices tcs-to-plscript
/apply-skill-best-practices all
```

---

## What It Does

For each target skill, the skill:

1. **Audits** `SKILL.md` against the best-practices checklist
2. **Reports** all gaps, grouped by severity (CRITICAL / HIGH / MEDIUM / LOW)
3. **Asks for confirmation** before applying any CRITICAL restructuring
4. **Applies fixes** in-place — lowest-risk first, then higher-risk

No content is ever deleted. Content moved to supporting files is removed from `SKILL.md`
and placed verbatim into the new file, with a link in `SKILL.md` pointing to it.

---

## Checks and Fixes Applied

| Severity | Issue detected | Fix applied |
|---|---|---|
| CRITICAL | `SKILL.md` > 500 lines, no supporting files | Splits into `SKILL.md` + `WORKFLOW.md` + `SCRIPTS.md` (+ `REFERENCE.md` if needed) |
| HIGH | Description missing "Use when…" | Rewrites `description:` with trigger clause |
| HIGH | Description uses first-person voice | Converts to third-person |
| HIGH | Description is vague or non-specific | Rewrites to name inputs, outputs, and flags |
| HIGH | Temp files created but no cleanup step | Adds final `CLEANUP` step with `rm -f` command + EXECUTION CHECKLIST item |
| MEDIUM | No execution checklist (multi-step skill) | Inserts copy-paste `- [ ]` checklist |
| MEDIUM | No feedback loops for output-producing steps | Adds validate-fix-retry structure |
| LOW | Bare MCP tool names (`browser_navigate` etc.) | Prefixes with `mcp__playwright__` |
| LOW | Windows-style backslash paths | Converts to forward slashes |
| LOW | README not listing supporting files | Updates README "File structure" section |
| LOW | No model tier declared in frontmatter | Adds `model: haiku` or `model: sonnet` based on skill complexity |

---

## Model Configuration

Skills can declare a `model:` key in their YAML frontmatter to override the default model for that skill and any subagents it spawns.

```yaml
---
name: my-skill
description: ...
model: haiku   # or sonnet, opus, fable
---
```

**Tier guide:**

| Tier | Model | When to use |
|---|---|---|
| Mechanical | `haiku` | Pattern replacement, file wiring, boilerplate injection, ADO REST calls with fixed schema, tag patching, file moves |
| Reasoning | `sonnet` | BRD analysis, test-case generation, multi-file code generation, coverage analysis, orchestrator pipelines |
| Heavy reasoning | `opus` | Complex multi-step diagnosis, cross-file architectural refactors (use sparingly) |

**Skills currently using `model: haiku`:**
`polish-generated-code`, `register-page-in-pom`, `add-method-to-page`, `add-teststep-hooks`,
`rename-and-merge-module`, `move-specs-to-module`, `patch-ado-tc-tags`, `tcs-to-ado`,
`setup-workspace`, `apply-skill-best-practices`

---

## Temp File Cleanup

Skills that create intermediate files during execution **must** delete them in an explicit
cleanup step. This is a **HIGH-severity** best practice enforced by this skill's audit.

**Files that must be cleaned up (temp artifacts):**

- `tmp_*.json` — intermediate data dumps
- `*_fetch_*.js`, `*_run.js` — runtime-written Node.js scripts
- `.bak` files — backup configs (e.g. `playwright.config.js.bak`)
- Extraction directories (e.g. `d:/temp/pw-trace-analysis/`)

**Files that must NOT be deleted (official skill outputs — keep):**

- `test_cases/*.md`, `stories/*.md`
- `*_ADO_TCs.json`, `*_ADO_IDs.json`
- `tests/generated/**/*.spec.ts`, `src/locators/*.ts`, `src/pages/*.ts`

**Why this matters:** Temp files left in the project root get accidentally committed and
pollute `git status`. This happened: `tcs_raw_rsv.json` and
`Upload_Reaction_CSV_summarize_existing.js` were committed because the generating skill
had no cleanup step.

**Canonical pattern** (from `ado-uss-to-tcs`): cleanup runs as the final numbered step with
an explicit `rm -f` command covering all temp files from the run, listed as the last item
in the EXECUTION CHECKLIST. If the skill uses `SCRIPTS.md`, place the cleanup command there
and link to it from SKILL.md.

---

## File Structure

```
apply-skill-best-practices/
├── SKILL.md        Main instructions for Claude (loaded on invocation)
├── CHECKLIST.md    Full best-practices criteria with severity ratings and WHY explanations
└── README.md       This file — human-readable docs
```

`CHECKLIST.md` is loaded by Claude only when running the audit (Step 2 of the skill),
not on every session startup.

---

## Reference Skill

`ado-uss-to-tcs` is the canonical example of a fully optimized skill. After this skill
processes it, the following files exist:

```
ado-uss-to-tcs/
├── SKILL.md      ~170 lines — overview, checklist, step outline, links  (was 1,240 lines)
├── WORKFLOW.md   ~557 lines — full step detail
├── SCRIPTS.md    ~469 lines — all Node.js script templates
└── README.md     human docs (unchanged)
```

Token impact: only 170 lines load on every invocation instead of 1,240.
WORKFLOW.md and SCRIPTS.md load only when Claude needs to execute a specific step or write
a specific script.

---

## Sources

Best practices sourced from:

- [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices) — Anthropic Platform docs
- [Extend Claude with skills](https://code.claude.com/docs/en/skills) — Claude Code docs
- [Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills) — Anthropic engineering blog
