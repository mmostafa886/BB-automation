# resolve-merge-conflicts — Workflow Detail

Detailed instructions for each step of the execution checklist in SKILL.md.

## Contents

- [Step 0 — Detect operation & sides](#step-0--detect-operation--sides)
- [Step 1 — Conflict-type table](#step-1--conflict-type-table)
- [Step 2 — Understand both sides](#step-2--understand-both-sides)
- [Step 3 — Strategy per file](#step-3--strategy-per-file)
- [Step 4 — Resolve](#step-4--resolve)
- [Step 5 — Static verification loop](#step-5--static-verification-loop)
- [Step 6 — Affected tests per side](#step-6--affected-tests-per-side)
- [Step 7 — Run affected tests](#step-7--run-affected-tests)
- [Step 8 — Finish the git operation](#step-8--finish-the-git-operation)
- [Step 9 — Cleanup & final summary](#step-9--cleanup--final-summary)

---

## Step 0 — Detect operation & sides

```bash
npx tsx .claude/skills/resolve-merge-conflicts/scripts/conflict-report.ts            # live conflict
npx tsx .claude/skills/resolve-merge-conflicts/scripts/conflict-report.ts --audit <sha>  # finished merge
```

The header shows the following.

| Field | Meaning |
|---|---|
| `Operation` | MERGE, REBASE (with `step N of M`), CHERRY-PICK, REVERT, STASH or AUDIT |
| `ours` / `theirs` | The commits, labelled in plain English. During a rebase **ours = upstream**, theirs = your replayed commit |
| `base` | The 3-way merge base git used for this file set |
| `branch base` | Where the two lines of work diverged. This is the base for Step 6 |
| Remaining rebase steps | Each pending `pick` |

**Pending-step check (rebase only).** Read every remaining step and flag:

- `Revert "Merge …"` or any revert of upstream work: replaying it onto upstream removes that work again. Suggest `drop`.
- Commits whose changes are already upstream (`git cherry -v <onto> <commit>` prints `-`): suggest `drop` to avoid empty or duplicate commits.

Never edit the todo yourself without confirmation. When the user agrees, apply the change with
`GIT_SEQUENCE_EDITOR` (or tell them how) so it takes effect when the rebase continues:

```bash
# The todo is shown to the editor with ABBREVIATED SHAs, so match on the 7-char prefix only.
GIT_SEQUENCE_EDITOR="sed -i.bak -E 's/^pick (<sha7>[0-9a-f]*)/drop \1/'" git rebase --edit-todo
rm -f "$(git rev-parse --git-dir)/rebase-merge/git-rebase-todo.bak"
grep -v '^#' "$(git rev-parse --git-dir)/rebase-merge/git-rebase-todo"   # confirm the change took
```

**If no operation is in progress** and there's no `--audit`, the report says so. Stop there and
pass on its `▶ Next:` hint.

▶ Next: tell the user the operation, which side is which, and any pending-step warnings.

---

## Step 1 — Conflict-type table

Show the table from the report as is, followed by one sentence per row that explains the type
in plain English (from [CONFLICT-TYPES.md](CONFLICT-TYPES.md)). Columns:

`# | File | Code | Conflict type | Kind | Hunks | Risk | Suggested action`

- Rows with code `—` are **silent breaks**: auto-merged files that are still broken. They are
  just as urgent as marked conflicts, so never skip them.
- If `PROJECT-RULES.md` applies, also run its extra audit checks and add rows for them.

▶ Next: "I'll compare both sides of these N files and propose a strategy for each."

---

## Step 2 — Understand both sides

For each row:

1. Read the clean versions, never the working copy with its markers:

   ```bash
   git show :1:<path>   # base (missing for AA)
   git show :2:<path>   # ours
   git show :3:<path>   # theirs
   ```

   For silent breaks there are no stages, so read `git show <ours>:<path>` and `git show <theirs>:<path>`.
2. Read each side's intent: `git log --format='%h %s' <base>..<ours> -- <path>` and the same for `<theirs>`.
3. Build the **overlap list**: a symbol, key or row that both sides added or changed differently. For code, compare the top-level declarations and class members of each version. For data, compare the keys or entries.
4. Find the **dependants**: callers of each overlapping symbol on both sides (`grep -rn "<symbol>"`), because a rename or a signature change on one side breaks the other side's callers.

**Optional fan-out:** with more than 15 conflicted files, launch read-only `Explore` agents, one per
top-level folder, asking each for "each side's intent and the overlapping symbols per file".
Merge their answers into the overlap list. Fan-out is only for reading; all edits stay in the
main conversation.

▶ Next: present the per-file comparison.

---

## Step 3 — Strategy per file

Present a table:

```
# | File | Ours intent | Theirs intent | Overlap | Proposed strategy
```

Then confirm with AskUserQuestion. Group the files with LOW and MEDIUM risk under one question, and
ask a separate question for each HIGH-risk file. Each option states its consequence, for example
"union — keep both Step-1 and Step-2 methods (recommended)" or
"take upstream — drops your 15 Step-1 specs' page methods".

- `--strategy=<s>` makes `<s>` the pre-selected recommended option. It is still confirmed.
- Always confirm: deleting a file, dropping a rebase step, choosing ours or theirs on a HIGH-risk file.

▶ Next: "Applying the confirmed strategies, starting with the HIGH-risk files."

---

## Step 4 — Resolve

Apply each file's strategy following its kind in [CONFLICT-TYPES.md](CONFLICT-TYPES.md).

**Code (union or hand-merge):**

1. Start from the side with the larger or newer surface: `git checkout --ours|--theirs <path>`. The working copy is then clean.
2. Port the other side's additions into it.
3. For each overlapping pair, keep **one** implementation and one name. Widen the signature with optional parameters so both sides' callers fit, and prefer the more robust implementation (retries, better selectors).
4. Rename the callers of any dropped name, on **both** sides.
5. Merge the import lists. Remove duplicates and unused imports.

**Data:** merge compatible shapes key by key or entry by entry. For incompatible shapes,
**split**: keep one side at the original path, write the other with `git show :3:<path> > <new path>`,
then update its importers.

**Lockfiles and generated files:** take one side, resolve the manifest first, then regenerate.

**Delete/modify:** carry out the confirmed choice. If the file is kept, make sure its imports still resolve.

**Project rules:** when [PROJECT-RULES.md](PROJECT-RULES.md) applies, follow its layer rules here.

After each file, run `git diff --check -- <path>`. Stage nothing yet; staging happens in Step 8.

▶ Next: "All files edited. Running static verification."

---

## Step 5 — Static verification loop

Run the checks in order. On a failure, fix it and **restart from check 1**. Continue only when all pass.

| # | Check | Command |
|---|---|---|
| 1 | No conflict markers | `git diff --check` and `grep -rnE '^(<<<<<<<\|=======\|>>>>>>>)( \|$)' -- <resolved files>` |
| 2 | Data files parse | `node -e "JSON.parse(require('fs').readFileSync('<f>','utf8'))"` per JSON file; equivalent per YAML/TOML |
| 3 | Type-check / lint / build | Find it in `package.json` scripts (`lint`, `typecheck`, `build`), `Makefile`, `pyproject.toml`, `go vet`, … |
| 4 | Silent-break audit clean | Re-run `conflict-report.ts` and confirm no `SILENT` rows remain |
| 5 | Affected tests load | Collect only, without running: `npx playwright test <paths> --list`, `npx jest --listTests`, `pytest --collect-only -q` |

▶ Next: "Static checks pass. Listing the tests affected by each side."

---

## Step 6 — Affected tests per side

Run the `affected-tests.ts` command that `conflict-report.ts` printed. It already uses the right
ranges for the operation:

| Operation | `--side` arguments |
|---|---|
| rebase | `upstream=<branch-base>..<onto>` and `branch=<every replayed commit, comma-separated>` |
| merge / cherry-pick / audit | `ours=<branch-base>..<ours>` and `theirs=<branch-base>..<theirs>` |
| revert | `reverted=<sha>` (the reverted commit's own changes) |
| stash | `stash=stash@{0}` |

Mapping order per changed file:

1. the **project adapter** (see [PROJECT-RULES.md](PROJECT-RULES.md));
2. the **import graph**: test files that transitively import the changed file;
3. if neither finds anything and the runner supports it, a **runner-native** command: Playwright `--only-changed=<ref>`, Jest `--findRelatedTests <files>`, Vitest `vitest related <files>`, or pytest-testmon.

Show the per-side output and the union. Ask before including **wide-impact** files: a shared
fixture, base class or global config would add the full suite. Changed files that aren't in the
working tree yet, such as files added by a rebase step not yet applied, belong in the run for
the step that adds them.

▶ Next: "These N tests cover both sides. Running them now." (or "Here are the commands" with `--no-run`)

---

## Step 7 — Run affected tests

- Run in the background with Bash `run_in_background: true`, using the suggested commands. Wrap
  any group with a setup note (seed, migrations, fixtures) in the bracket the note names.
- `--no-run`: print the commands and skip to Step 8.
- Report:

  ```
  Side       | Folder                        | Passed | Failed | Skipped
  upstream   | tests/generated/RealityCheck  |   14   |   2    |   0
  branch     | tests/generated/CreateCompany |   20   |   0    |   0
  ```

  A test reached by both sides is listed under each of them.
- For failures, name the side whose behaviour broke and offer the repo's debugging skills (for
  example `/execute-and-fix-tests <paths>` or `/analyze-trace`). Don't fix inside this skill.
- Failures caused by the environment (auth, network, test data) are not merge defects. Say so
  explicitly, so the user doesn't undo a correct resolution.

▶ Next: "Results above. Shall I stage the resolved files and continue the <operation>?"

---

## Step 8 — Finish the git operation

After confirmation:

```bash
git add <each resolved file>        # never `git add -A` during a conflict
git rm  <each confirmed deletion>
git <merge|rebase|cherry-pick|revert> --continue   # GIT_EDITOR=true keeps the default message
```

- **Stash:** there's nothing to continue. Run `git stash drop` only after Step 5 passes, and only with confirmation.
- **Audit mode:** there's no operation to continue. With confirmation, commit the fixes as a new commit.
- **The rebase stops again:** loop back to Step 0 for the next commit.
- **The rebase finished:**
  1. Check `git status -sb`.
  2. If the branch already exists on the remote, explain that publishing needs `git push --force-with-lease`, and **ask** before pushing.
  3. Never push in any other case unless asked.

▶ Next: "The <operation> is complete. Cleaning up and summarising."

---

## Step 9 — Cleanup & final summary

1. Delete any temporary files created during the run. The scripts write nothing; remove anything
   you created yourself, such as `git-rebase-todo.bak`, scratch JSON or exported side versions:

   ```bash
   rm -f "$(git rev-parse --git-dir)/rebase-merge/git-rebase-todo.bak"
   ```
2. Check `git status --porcelain` and confirm no stray temp files are untracked.
3. Print the summary:

```
=== Conflict resolution summary ===
Operation : REBASE onto <sha> — complete (N commits replayed)
Resolved  : 2 add/add (code, data), 1 silent break (duplicate registration)
Strategy  : union ×2, split ×1
Verify    : markers ✓  JSON ✓  type-check ✓  audit ✓  tests load ✓
Tests     : upstream 16/16 ✓ | branch 35/36 ✗ (1 failure, listed above)

▶ Next steps:
  1. /execute-and-fix-tests tests/generated/RealityCheck/tc-…   (1 failing test)
  2. git push --force-with-lease  (branch was rewritten — confirm first)
  3. Re-run /resolve-merge-conflicts if the next pull stops on conflicts
```
