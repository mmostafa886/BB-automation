# Conflict Types — Meaning, Risk and Suggested Action

Reference for Steps 1 and 3 of `resolve-merge-conflicts`.

## Contents

1. ["Ours" vs "theirs" per operation](#1-ours-vs-theirs-per-operation)
2. [Git conflict codes](#2-git-conflict-codes)
3. [File kinds](#3-file-kinds)
4. [Silent breaks (no conflict marker)](#4-silent-breaks-no-conflict-marker)
5. [Strategies](#5-strategies)
6. [Risk levels](#6-risk-levels)
7. [Command cookbook](#7-command-cookbook)

---

## 1. "Ours" vs "theirs" per operation

| Operation | `ours` / `:2:` / `--ours` | `theirs` / `:3:` / `--theirs` | 3-way base `:1:` |
|---|---|---|---|
| `git merge X` | your current branch | branch `X` being merged in | `merge-base HEAD X` |
| `git rebase U` / `git pull --rebase` | **upstream `U`** plus commits already replayed | **your commit** being replayed | parent of the replayed commit |
| `git cherry-pick C` | your current branch | commit `C` | parent of `C` |
| `git revert C` | your current branch | the state *before* `C` (the inverse of `C`) | `C` |
| `git stash pop` / `apply` | your working tree / `HEAD` | the stashed changes | the commit the stash was made on |

The rebase row is the most common source of mistakes: `--ours` keeps **upstream**, `--theirs`
keeps **your** commit. Always say which commit you mean ("keep upstream's version",
"keep your replayed commit's version") rather than "ours" or "theirs" alone.

---

## 2. Git conflict codes

The two-letter code from `git status --porcelain`.

| Code | Conflict type | Meaning | Default risk | Suggested action |
|---|---|---|---|---|
| `UU` | both modified | Both sides edited the same file, with overlapping hunks | MEDIUM (≤ 2 hunks) / HIGH | Hand-merge hunk by hunk, keeping both intents. If a signature changed on one side, update the callers added on the other side |
| `AA` | both added (add/add) | Both sides created a file at the same path independently. There is no common base, so git often marks the whole file as one conflict or interleaves two unrelated versions | HIGH | Compare both versions as wholes. Usually **union**: one copy of each declaration, overlapping functions de-duplicated. Never keep both files concatenated |
| `DU` | deleted by us, modified by them | `ours` removed the file and `theirs` edited it | HIGH | Ask: keep it (`git add <path>`) or confirm the deletion (`git rm <path>`). If it was moved or renamed on `ours`, apply `theirs`'s edit to the new location |
| `UD` | modified by us, deleted by them | The mirror of `DU` | HIGH | Same as `DU`, with the sides swapped |
| `AU` | added by us only | Usually a rename or add clash: `ours` added the path, `theirs` changed something git paired with it | MEDIUM | Inspect `git show :2:<path>` and `:3:<path>`. Keep the added file and check that nothing else expected that path |
| `UA` | added by them only | The mirror of `AU` | MEDIUM | Same as `AU` |
| `DD` | both deleted | Both sides removed the path, often because each renamed it differently (rename/rename) | LOW | `git rm <path>`, then check where each side renamed it to. Two new paths may now hold duplicate content |
| rename/modify | (shown as `UD`/`DU` or auto-resolved) | One side renamed the file and the other edited it | MEDIUM | Make sure the edit landed at the new path: `git diff --find-renames BASE..SIDE` |
| rename/rename | (shown as `DD` + `AU`/`UA`) | Both sides renamed the same file to different paths | HIGH | Pick one final path with the user, merge the content there and remove the other |
| submodule | `UU` on a gitlink (mode `160000`) | Both sides moved a submodule to different commits | MEDIUM | Choose the submodule commit to keep (usually the newer one), then `git add <submodule-path>` |

---

## 3. File kinds

`conflict-report.ts` classifies each file. The kind changes the suggested action.

| Kind | Detected by | Suggested action |
|---|---|---|
| **code** | anything not matched below | Hand-merge as in section 2 |
| **data** | `.json`, `.yaml`/`.yml`, `.toml`, `.xml`, `.csv`, `.ini` | Merge keys or entries and de-duplicate. If the **top-level shapes differ** (array vs object), split into two files and update the consumers. Validate by parsing |
| **lockfile** | `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `Cargo.lock`, `poetry.lock`, `go.sum`, … | Never hand-merge. Take one side (`git checkout --ours <lockfile>`), resolve the manifest (`package.json`) first, then regenerate (`npm install`, `yarn`, `pnpm install`, …) and stage the result |
| **generated** | `dist/`, `build/`, `coverage/`, `playwright-report/`, `test-results/`, `*.min.js`, `*.map` | Take either side, then regenerate from source. If the file shouldn't be tracked at all, suggest adding it to `.gitignore` |
| **binary** | images, PDFs, archives, fonts, office docs, media | Pick one side after confirmation: `git checkout --ours\|--theirs <path>` |
| **docs** | `.md`, `.txt`, `.rst`, `.adoc` | Combine both texts and remove duplicated paragraphs. Low risk |
| **submodule** | gitlink mode `160000` | See section 2 |

---

## 4. Silent breaks (no conflict marker)

Git merges these files "cleanly", but the result is broken. `conflict-report.ts` audits every
file that **both** sides changed and that was not left unmerged.

| Finding | Typical cause | Fix |
|---|---|---|
| duplicate import | Both sides added the same import at different lines | Keep one |
| duplicate top-level declaration / binding | Both sides added the same class, function or constant | Keep one, merging any differences |
| duplicate class field / getter | Both sides registered the same member in a shared registry class | Keep one of each, then check every list or array that enumerates them for a duplicate entry too |
| two concatenated top-level JSON values | An earlier conflict was resolved by keeping both blocks | Treat it as an `AA` data conflict: merge the values or split the file |
| leftover conflict markers | A previous resolution was staged with markers still in it | Resolve the remaining hunk |

The audit is heuristic. Always follow it with the Step 5 type-check or build, which is the real gate.

---

## 5. Strategies

| Strategy | Use when | How |
|---|---|---|
| **union** | The sides added complementary work (different features, steps, cases) | Keep everything from both, with one copy of each declaration. Overlapping behaviour keeps one name and a widened signature, and the callers are updated |
| **ours** | `ours` supersedes `theirs` for this file | `git checkout --ours <path>` (check the operation table first) |
| **theirs** | `theirs` supersedes `ours` for this file | `git checkout --theirs <path>` |
| **hand-merge** | Interleaved edits to the same logic | Edit hunk by hunk, starting from the clean side versions |
| **regenerate** | Lockfiles and generated files | Take one side, run the generator and stage the output |
| **pick-one** | Binaries and submodules | Choose one version with the user |
| **split** | Data files whose shapes are incompatible | Keep one side at the original path, move the other to a new file and update its importers |

---

## 6. Risk levels

| Risk | Meaning | Confirmation |
|---|---|---|
| HIGH | Wrong choice loses work or breaks callers (add/add, delete/modify, a silent break, a big `UU`) | Always confirm the strategy before editing |
| MEDIUM | Overlapping edits that need judgement | Confirm when the strategy isn't union |
| LOW | Mechanical (lockfile, generated, docs, both-deleted) | Mention it in the plan; no separate prompt needed |

---

## 7. Command cookbook

```bash
git show :1:<path>      # base version
git show :2:<path>      # ours version
git show :3:<path>      # theirs version
git checkout --ours <path>    # take ours (see the operation table for its meaning)
git checkout --theirs <path>  # take theirs
git checkout -m <path>        # re-create the conflict markers after a bad edit
git rm <path>                 # accept a deletion
git add <path>                # mark resolved
git diff --check              # find leftover markers and whitespace errors
git rebase --edit-todo        # change pending rebase steps (e.g. pick → drop)
git log --oneline BASE..OURS  # intent of the ours side
git log --oneline BASE..THEIRS
```
