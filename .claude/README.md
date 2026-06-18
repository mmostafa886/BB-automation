# .claude/ — Claude Code Configuration

## settings.json

Committed to git. Contains the `permissions.allow` list that pre-approves all tools
used by the skills so that Claude Code does not pause to prompt for approval
during automated pipeline runs.

**What is pre-approved:**

| Category | Patterns |
|---|---|
| Playwright test execution | `Bash(npx playwright*)`, `Bash(CI=true*)` |
| File inspection | `Bash(grep*)`, `Bash(cat*)`, `Bash(ls*)`, `Bash(cd*)`, `Bash(tee*)` |
| Git operations | `Bash(git*)` |
| Node.js scripts | `Bash(node *)` |
| Cleanup | `Bash(rm -f *)` |
| Env var checks | `Bash(echo *)` |
| File creation | `Write` |
| File modification | `Edit` |
| Playwright MCP browser | `mcp__playwright__browser_*` (16 tools) |

## skills/

20 Claude Code skills live here, each as a directory containing `SKILL.md` (and `README.md`).
Invoke any skill with `/<skill-name>` in the Claude chat.

See `docs/skills-index.md` for the full reference with pipeline diagrams and usage examples.

## settings.local.json

Not committed to git (listed in `.gitignore`). Contains personal, machine-specific
bash one-offs for local development. Do not add CI-relevant settings here.
