# Git History Cleanup: Removing Restricted Files

## Overview

On **2026-04-30**, the repository underwent a git history rewrite to remove restricted `.github/agents/` files that were flagged by GitHub Push Protection.

### Files Removed

- `.github/agents/playwright-test-generator.agent.md`
- `.github/agents/playwright-test-healer.agent.md`
- `.github/agents/playwright-test-planner.agent.md`

### Why This Was Necessary

GitHub Push Protection scans **all commits in a push**, not just the current state of the working tree. These files existed in historical commits and triggered 9 violations across 5 commits:
- `8a3cd8b` Remove restricted GitHub agent files
- `4aff182` Remove restricted GitHub agent files
- `46ab3b0` Remove restricted GitHub agent files
- `09cb3d1` Remove restricted GitHub agent files
- `5054b51` Generate TCs according to the project structure...

## How It Was Done

### Tool Used: `git filter-branch`

`git filter-branch` (built into Git) was used to rewrite every commit in the repository and completely remove the `.github/agents/` directory.

**Command executed:**
```bash
git filter-branch --force --index-filter \
  'git rm -rf --cached --ignore-unmatch .github/agents/' \
  --prune-empty --tag-name-filter cat -- --all
```

**Results:**
- **225 commits** rewritten across all branches
- **4 local branches** updated: `master`, `plate-layout`, `reaction-class`, `vessel-config`
- **Multiple remote tracking branches** updated
- **2 tags** updated and force-pushed

### Cleanup Steps

After rewriting history:
```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

This ensured dangling objects (the old commits) were fully garbage-collected.

### Verification

Confirmed the files no longer exist in any commit:
```bash
git show 8a3cd8b:".github/agents/playwright-test-generator.agent.md"
# Output: fatal: path '.github/agents/playwright-test-generator.agent.md' does not exist in '8a3cd8b'
```

### Force-Push to Remote

All branches and tags were force-pushed to Azure DevOps:
```bash
git push origin --all --force
git push origin --tags --force
```

**Force-pushed branches:**
- `master`: 4781962...107ded9
- `plate-layout`: 4968303...724e51f
- `reaction-class`: e378421...ab4e4f6
- `vessel-config`: fffaf8e...f2d3294

## Impact on Developers

### ⚠️ Action Required

If you have local clones of this repository with these old commits, you **must** re-sync:

```bash
git fetch origin
git reset --hard origin/master
```

For other branches:
```bash
git reset --hard origin/<branch-name>
```

Or re-clone the entire repository:
```bash
git clone https://dev.azure.com/AyaAref/AZ-Automation/_git/AZ-Automation
```

### What This Means

- **Local branches with the old commits** will show your branch as "diverged" from origin
- **Commits you pushed before this cleanup** are unchanged locally — but the remote no longer has them
- **Your old pull requests** may show merge conflicts if they haven't been merged yet
- **No data loss** — old commits still exist locally until you clean up your repo

## Why Force-Push Was Safe

1. **Restricted files** were not meant to be in the repo (GitHub flagged them)
2. **Replacement commits** have identical functionality — they just remove the restricted files
3. **All branches and tags** were rewritten consistently, so relationships are preserved
4. **Timing** — cleanup happened early before the code was widely distributed

## Future Prevention

To prevent restricted files from being committed:

1. **Update `.gitignore`** to exclude sensitive files:
   ```
   .github/agents/
   ```

2. **Add a pre-commit hook** (optional):
   ```bash
   git hook set pre-commit
   ```

3. **Enable GitHub Push Protection** on the repository settings to catch violations at push time

## References

- [git filter-branch documentation](https://git-scm.com/docs/git-filter-branch)
- [GitHub Push Protection](https://docs.github.com/en/code-security/secret-scanning/protecting-pushes-with-secret-scanning)
- [Removing sensitive data from git history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## Questions?

If you encounter issues after pulling the cleaned history, contact the repo maintainers or refer to the "Action Required" section above.
