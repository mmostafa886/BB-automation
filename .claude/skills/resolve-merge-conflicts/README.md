# resolve-merge-conflicts

> Resolves **any** git conflict (merge, rebase, cherry-pick, revert or stash pop) in any file
> type. It shows the **type** of each conflict, suggests what to do next at every step, applies
> the confirmed resolution, verifies the build, and finally **lists and runs the tests affected by
> both sides** so neither line of work is silently broken.

---

## What this skill does

| Step | What happens |
|---|---|
| 0 | Detects the operation and labels `ours`, `theirs` and the base in plain English (they are flipped during a rebase). Warns about pending rebase steps that would undo upstream work |
| 1 | Prints the **conflict-type table**: code, type, kind, hunks, risk and suggested action per file, plus "silent breaks" (files git merged without markers that are still broken) |
| 2 | Reads the clean base, ours and theirs versions and each side's commit intent, and builds an overlap list |
| 3 | Proposes a strategy per file (union, ours, theirs, hand-merge, regenerate, pick-one, split) and asks you to confirm |
| 4 | Applies the strategies. Never leaves duplicate declarations, and updates callers on both sides |
| 5 | Runs the verification loop: markers → data parses → type-check/build → audit → tests load |
| 6 | Lists the **affected tests per side**, plus their union |
| 7 | Runs them in the background and reports pass/fail **per side** |
| 8 | After confirmation: `git add` + `--continue`. Never pushes without approval |
| 9 | Cleans up and prints a summary with next steps |

---

## When to use

- A `git merge`, `git pull`, `git pull --rebase`, `git rebase`, `git cherry-pick`, `git revert` or `git stash pop` stopped with conflicts.
- A merge "succeeded" but the build or tests are broken afterwards. Use `--audit <merge-sha>`.
- You want to know what each side changed and which tests to re-run after integrating branches.

---

## How to invoke

```text
/resolve-merge-conflicts                      # resolve the operation in progress
/resolve-merge-conflicts --audit 3bb5f11      # audit a merge commit that already completed
/resolve-merge-conflicts --strategy=union     # pre-select a default strategy (still confirmed)
/resolve-merge-conflicts --no-run             # list affected tests and print commands, don't run them
```

---

## "Ours" vs "theirs" cheat-sheet

| Operation | `--ours` keeps | `--theirs` keeps |
|---|---|---|
| merge | your current branch | the branch being merged in |
| **rebase / pull --rebase** | **upstream** | **your commit being replayed** |
| cherry-pick | your current branch | the picked commit |
| revert | your current branch | the inverse of the reverted commit |
| stash pop | your working tree | the stashed changes |

---

## Conflict types and suggested actions (summary)

| Code / finding | Type | Usual action |
|---|---|---|
| `UU` | both modified | Hand-merge, keeping both intents |
| `AA` | both added | Union with one copy of each declaration; never concatenate |
| `DU` / `UD` | delete vs modify | Ask: keep (`git add`) or delete (`git rm`) |
| `AU` / `UA` / `DD` | rename or add clashes | Find where each side moved the file |
| lockfile | — | Take one side, then regenerate |
| binary | — | Pick one side |
| data, different shapes | — | Split into two files |
| `—` SILENT | auto-merged but broken | Remove the duplicate import, field, getter or JSON block |

The full catalog, with risks and commands, is in [CONFLICT-TYPES.md](CONFLICT-TYPES.md).

---

## Affected-test discovery

Run it by hand at any time. `conflict-report.ts` prints the exact command for the current conflict:

```bash
npx tsx .claude/skills/resolve-merge-conflicts/scripts/affected-tests.ts \
  --side "upstream=3e623b0..dc654de" \
  --side "branch=31a206d,a40397e,3bc59c3"
```

Each changed file is mapped to tests by:

1. the project adapter (in this repo: page object → POM getter → specs; locators → page → specs);
2. the import graph;
3. runner-native related-test commands, as a fallback.

Shared fixtures and base classes are flagged as **wide impact** and need confirmation before a
full-suite run.

---

## Project rules

The generic workflow knows nothing about this repo's structure. Everything BB-Automation-specific
(4-layer POM, locator files, test-data splits, `seededForecast` seed brackets) is in
[PROJECT-RULES.md](PROJECT-RULES.md). It loads only when `src/pages/pom-lazy-self-healing.ts` exists.

---

## Safety guarantees

- Nothing is discarded, deleted or dropped from a rebase without your confirmation.
- Only the files it resolved are staged. It never runs `git add -A` during a conflict.
- It never runs `reset --hard`, `clean`, `--abort`, `stash drop` or any push unless you ask.
- Both scripts are read-only.

---

## Supporting files

| File | Contents |
|---|---|
| [SKILL.md](SKILL.md) | Entry point: role, execution checklist, conditional branches, step summaries, safety rules |
| [WORKFLOW.md](WORKFLOW.md) | Full detail for Steps 0–9, including the summary template |
| [CONFLICT-TYPES.md](CONFLICT-TYPES.md) | "Ours/theirs" per operation, conflict codes, file kinds, silent breaks, strategies, risk levels, command cookbook |
| [PROJECT-RULES.md](PROJECT-RULES.md) | BB-Automation layer rules, test mapping and seed brackets |
| `scripts/conflict-report.ts` | Conflict-type table, silent-break audit, pending-step warnings and the ready-made affected-tests command |
| `scripts/affected-tests.ts` | Per-side affected tests, their union, setup notes and suggested run commands |

### Example output (conflict-report.ts)

```
Operation: REBASE (replaying 31a206d onto dc654de) — step 1 of 4
  ours   = dc654de  upstream you are rebasing onto (plus commits already replayed)
  theirs = 31a206d  your commit being replayed
  base   = 3e623b0  (3-way merge base)

 # | File                                         | Code | Conflict type                  | Kind | Hunks | Risk | Suggested action
 1 | src/pages/reality-check-page-self-healing.ts | AA   | both added (add/add)           | code |     5 | HIGH | union both, keep ONE copy of each declaration
 2 | test-data/RealityCheckInputs.json            | AA   | both added (add/add)           | data |     1 | HIGH | shapes differ (array vs object): split into two files
 3 | src/pages/pom-lazy-self-healing.ts           | —    | SILENT: auto-merged but broken | code |     0 | HIGH | duplicate import/field/getter → keep one copy

⚠ pending step "pick 53e2125 Revert "Merge branch 'main'…"" reverts a merge; replaying it onto upstream will remove upstream work.

▶ Next: compare both sides of the 3 file(s) (3 HIGH risk) and confirm a strategy per file before editing.
```
