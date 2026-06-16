# .claude/ — Claude Code Configuration

## settings.json

Committed to git. Contains the `permissions.allow` list that pre-approves all tools
used by the CI skills so that Claude Code does not pause to prompt for approval
during automated pipeline runs.

**Covered skills:** `Execute_And_Fix_Tests`, `ADO_Full_Pipeline`, `ADO_USs_To_TCs`,
`TCs_To_ADO`, `ADO_TCs_To_PLScript`, `Setup_Workspace`, `Polish_Generated_Code`.

**What is pre-approved:**

| Category | Patterns |
|----------|---------|
| Playwright test execution | `Bash(npx playwright*)`, `Bash(CI=true*)` |
| File inspection | `Bash(grep*)`, `Bash(cat*)`, `Bash(ls*)`, `Bash(cd*)`, `Bash(tee*)` |
| Git operations | `Bash(git*)` |
| Node.js scripts | `Bash(node *)` |
| Workspace setup | `Bash(mkdir *)` |
| Cleanup | `Bash(rm -f *)` |
| Env var checks | `Bash(echo *)` |
| File creation | `Write` |
| File modification | `Edit` |
| Playwright MCP browser | `mcp__playwright__browser_*` (16 tools) |

## CI/CD Usage

Run Claude Code normally — the pre-approved allow-list handles all permission
checks without any prompts:

```sh
claude -p "/Execute_And_Fix_Tests Projects"
claude -p "/ADO_Full_Pipeline from stories Add_Employee"
```

> If you add a new skill that requires tools not yet in `settings.json`, add the
> specific permission patterns to the allow-list rather than using
> `--dangerously-skip-permissions`.

## settings.local.json

Not committed to git (listed in `.gitignore`). Contains personal, machine-specific
bash one-offs for local development. Do not add CI-relevant settings here.
