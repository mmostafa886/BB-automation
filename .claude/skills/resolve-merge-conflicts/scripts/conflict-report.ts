/**
 * Prints the conflict-type table for the git operation in progress (or for a finished merge
 * commit with --audit <sha>), plus a silent-break audit and "Next" suggestions.
 *
 * Usage:
 *   npx tsx .claude/skills/resolve-merge-conflicts/scripts/conflict-report.ts [--audit <merge-sha>] [--json]
 *
 * Read-only: never modifies the index, the working tree or refs.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

type Operation = 'merge' | 'rebase' | 'cherry-pick' | 'revert' | 'stash' | 'audit' | 'none';
type Risk = 'HIGH' | 'MEDIUM' | 'LOW';
type Kind = 'code' | 'data' | 'lockfile' | 'generated' | 'binary' | 'docs' | 'submodule';

interface Sides {
    operation: Operation;
    ours?: string;
    theirs?: string;
    base?: string;
    /** Branch-level base: where the two lines of work diverged (used for affected tests). */
    branchBase?: string;
    oursLabel: string;
    theirsLabel: string;
    progress?: string;
    pendingTodo: string[];
    /** Rebase only: the upstream commit being rebased onto. */
    onto?: string;
    /** Rebase only: every commit of the branch being replayed (done + pending). */
    replayed?: string[];
}

interface Row {
    path: string;
    code: string;
    type: string;
    kind: Kind;
    hunks: number;
    risk: Risk;
    action: string;
}

// ─── git helpers ────────────────────────────────────────────────────────────

function git(args: string[], allowFail = false): string {
    try {
        return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
    } catch (err) {
        if (allowFail) return '';
        const msg = (err as { stderr?: string }).stderr || (err as Error).message;
        throw new Error(`git ${args.join(' ')} failed: ${msg.trim()}`);
    }
}

function short(sha?: string): string {
    return sha ? sha.slice(0, 7) : '?';
}

function subject(sha?: string): string {
    return sha ? git(['log', '-1', '--format=%s', sha], true) : '';
}

function readGitFile(gitDir: string, rel: string): string | undefined {
    const p = join(gitDir, rel);
    return existsSync(p) ? readFileSync(p, 'utf8').trim() : undefined;
}

/** Content of an index stage (1 = base, 2 = ours, 3 = theirs) or a ref:path, or undefined. */
function show(spec: string): string | undefined {
    try {
        return execFileSync('git', ['show', spec], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 });
    } catch {
        return undefined;
    }
}

// ─── operation & sides ──────────────────────────────────────────────────────

function detectSides(auditSha?: string): Sides {
    const gitDir = git(['rev-parse', '--git-dir']);

    if (auditSha) {
        const parents = git(['log', '-1', '--format=%P', auditSha]).split(' ').filter(Boolean);
        if (parents.length < 2) throw new Error(`${auditSha} is not a merge commit (it has ${parents.length} parent).`);
        const base = git(['merge-base', parents[0], parents[1]]);
        return {
            operation: 'audit', ours: parents[0], theirs: parents[1], base, branchBase: base,
            oursLabel: 'first parent (the branch merged into)', theirsLabel: 'second parent (the branch merged in)',
            pendingTodo: [],
        };
    }

    const mergeHead = readGitFile(gitDir, 'MERGE_HEAD');
    const cherry = readGitFile(gitDir, 'CHERRY_PICK_HEAD');
    const revert = readGitFile(gitDir, 'REVERT_HEAD');
    const rebaseDir = ['rebase-merge', 'rebase-apply'].find(d => existsSync(join(gitDir, d)));
    const head = git(['rev-parse', 'HEAD']);

    if (rebaseDir) {
        const stopped = readGitFile(gitDir, `${rebaseDir}/stopped-sha`) ?? readGitFile(gitDir, 'REBASE_HEAD');
        const onto = readGitFile(gitDir, `${rebaseDir}/onto`);
        const origHead = readGitFile(gitDir, `${rebaseDir}/orig-head`);
        const msgnum = readGitFile(gitDir, `${rebaseDir}/msgnum`) ?? readGitFile(gitDir, `${rebaseDir}/next`);
        const end = readGitFile(gitDir, `${rebaseDir}/end`) ?? readGitFile(gitDir, `${rebaseDir}/last`);
        const todo = (readGitFile(gitDir, `${rebaseDir}/git-rebase-todo`) ?? '')
            .split('\n').filter(l => l && !l.startsWith('#'));
        const done = (readGitFile(gitDir, `${rebaseDir}/done`) ?? '')
            .split('\n').filter(l => l && !l.startsWith('#'));
        // orig-head may itself contain a bad merge of upstream, so measure divergence from the replayed commit.
        const divergedFrom = stopped ?? origHead;
        return {
            operation: 'rebase',
            ours: head,
            theirs: stopped,
            base: stopped ? git(['rev-parse', `${stopped}^`], true) || undefined : undefined,
            branchBase: onto && divergedFrom ? git(['merge-base', onto, divergedFrom], true) || undefined : undefined,
            onto,
            replayed: [...done, ...todo].map(l => l.match(/^(?:p|pick|r|reword|e|edit|s|squash|f|fixup)\s+([0-9a-f]+)/)?.[1]).filter((s): s is string => !!s),
            oursLabel: 'upstream you are rebasing onto (plus commits already replayed)',
            theirsLabel: 'your commit being replayed',
            progress: msgnum && end ? `step ${msgnum} of ${end}` : undefined,
            pendingTodo: todo,
        };
    }
    if (mergeHead) {
        const base = git(['merge-base', head, mergeHead], true) || undefined;
        return {
            operation: 'merge', ours: head, theirs: mergeHead, base, branchBase: base,
            oursLabel: 'your current branch', theirsLabel: 'the branch being merged in', pendingTodo: [],
        };
    }
    if (cherry) {
        return {
            operation: 'cherry-pick', ours: head, theirs: cherry, base: git(['rev-parse', `${cherry}^`], true) || undefined,
            branchBase: git(['merge-base', head, cherry], true) || undefined,
            oursLabel: 'your current branch', theirsLabel: 'the commit being cherry-picked', pendingTodo: [],
        };
    }
    if (revert) {
        return {
            operation: 'revert', ours: head, theirs: git(['rev-parse', `${revert}^`], true) || undefined, base: revert,
            branchBase: revert,
            oursLabel: 'your current branch', theirsLabel: `the state before ${short(revert)} (i.e. the inverse of that commit)`,
            pendingTodo: [],
        };
    }
    const unmerged = git(['diff', '--name-only', '--diff-filter=U'], true);
    if (unmerged) {
        return {
            operation: 'stash', ours: head, theirs: git(['rev-parse', '--verify', '-q', 'stash@{0}'], true) || undefined,
            oursLabel: 'your working tree / HEAD', theirsLabel: 'the stashed changes (stash@{0})', pendingTodo: [],
        };
    }
    return { operation: 'none', oursLabel: '', theirsLabel: '', pendingTodo: [] };
}

// ─── classification ─────────────────────────────────────────────────────────

const LOCKFILES = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|Gemfile\.lock|poetry\.lock|Pipfile\.lock|Cargo\.lock|composer\.lock|go\.sum)$/;
const GENERATED = /(^|\/)(dist|build|out|coverage|playwright-report|test-results|\.next)\/|\.min\.(js|css)$|\.map$/;
const BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|pdf|zip|gz|tgz|jar|woff2?|ttf|otf|eot|mp4|mov|mp3|wav|xlsx?|docx?|pptx?|exe|dll|so|dylib)$/i;
const DATA = /\.(json|ya?ml|toml|xml|csv|ini|env\.example)$/i;
const DOCS = /\.(md|mdx|txt|rst|adoc)$/i;

function classifyKind(path: string): Kind {
    const mode = git(['ls-files', '-s', '--', path], true).split(/\s+/)[0];
    if (mode === '160000') return 'submodule';
    if (LOCKFILES.test(path)) return 'lockfile';
    if (GENERATED.test(path)) return 'generated';
    if (BINARY.test(path)) return 'binary';
    if (DATA.test(path)) return 'data';
    if (DOCS.test(path)) return 'docs';
    return 'code';
}

const TYPE_NAMES: Record<string, string> = {
    UU: 'both modified',
    AA: 'both added (add/add)',
    DU: 'deleted by us, modified by them',
    UD: 'modified by us, deleted by them',
    AU: 'added by us only (path clash)',
    UA: 'added by them only (path clash)',
    DD: 'both deleted (rename/rename?)',
};

function countHunks(path: string): number {
    if (!existsSync(path)) return 0;
    try {
        return (readFileSync(path, 'utf8').match(/^<<<<<<< /gm) ?? []).length;
    } catch {
        return 0;
    }
}

function jsonShape(text?: string): string | undefined {
    if (text === undefined) return undefined;
    try {
        const v = JSON.parse(text);
        return Array.isArray(v) ? 'array' : typeof v;
    } catch {
        return 'invalid';
    }
}

function suggest(code: string, kind: Kind, path: string, hunks: number): { risk: Risk; action: string } {
    if (kind === 'lockfile') return { risk: 'LOW', action: `take one side (git checkout --ours ${path}), then regenerate with the package manager` };
    if (kind === 'generated') return { risk: 'LOW', action: 'take either side, then regenerate from source' };
    if (kind === 'binary') return { risk: 'MEDIUM', action: 'pick one side: git checkout --ours|--theirs (confirm with user)' };
    if (kind === 'submodule') return { risk: 'MEDIUM', action: 'choose the submodule commit to keep, then git add the submodule path' };

    switch (code) {
        case 'DU':
        case 'UD':
            return { risk: 'HIGH', action: 'ask user: keep the modified file (git add) or confirm deletion (git rm); check callers either way' };
        case 'AU':
        case 'UA':
            return { risk: 'MEDIUM', action: 'path clash from a rename/add: keep the added file, verify nothing else expected that path' };
        case 'DD':
            return { risk: 'LOW', action: 'both sides removed it: git rm, then check where each side renamed it to' };
    }

    if (kind === 'data' && /\.json$/i.test(path)) {
        const ours = jsonShape(show(`:2:${path}`));
        const theirs = jsonShape(show(`:3:${path}`));
        if (ours && theirs && ours !== theirs) {
            return { risk: 'HIGH', action: `shapes differ (${ours} vs ${theirs}): split into two files and update consumers` };
        }
        return { risk: 'MEDIUM', action: 'merge keys/entries, de-duplicate, then validate with JSON.parse' };
    }
    if (kind === 'docs') return { risk: 'LOW', action: 'combine both texts, removing duplicated paragraphs' };

    if (code === 'AA') {
        return { risk: 'HIGH', action: 'two independent versions: union both, keep ONE copy of each declaration, dedupe overlapping functions' };
    }
    return hunks > 2
        ? { risk: 'HIGH', action: 'hand-merge hunk by hunk, keeping both intents; update callers of any changed signature' }
        : { risk: 'MEDIUM', action: 'hand-merge the hunks, keeping both intents' };
}

// ─── silent-break audit ─────────────────────────────────────────────────────

function changedFiles(from?: string, to?: string): Set<string> {
    if (!from || !to) return new Set();
    return new Set(git(['diff', '--name-only', from, to], true).split('\n').filter(Boolean));
}

/** Returns reasons a cleanly auto-merged file is still broken. `rev` reads it from a commit instead of the working tree. */
function auditFile(path: string, rev?: string): string[] {
    if (BINARY.test(path)) return [];
    let text: string | undefined;
    if (rev) {
        text = show(`${rev}:${path}`);
    } else if (existsSync(path)) {
        try {
            text = readFileSync(path, 'utf8');
        } catch {
            text = undefined;
        }
    }
    if (text === undefined) return [];
    const reasons: string[] = [];

    if (/^(<<<<<<<|>>>>>>>) /m.test(text)) reasons.push('leftover conflict markers');

    if (/\.json$/i.test(path)) {
        try {
            JSON.parse(text);
        } catch {
            reasons.push(/^[\]}]\s*\n\s*[[{]/m.test(text) ? 'two concatenated top-level JSON values' : 'invalid JSON');
        }
        return reasons;
    }

    if (/\.(m?[jt]sx?)$/.test(path)) {
        const dup = (re: RegExp, label: string) => {
            const seen = new Map<string, number>();
            for (const m of text.matchAll(re)) seen.set(m[1], (seen.get(m[1]) ?? 0) + 1);
            const dups = [...seen].filter(([, n]) => n > 1).map(([k]) => k);
            if (dups.length) reasons.push(`duplicate ${label}: ${dups.join(', ')}`);
        };
        // Identifiers bound by import statements.
        const imported = new Map<string, number>();
        for (const m of text.matchAll(/^import\s+(?:type\s+)?\{([^}]*)\}\s+from/gm)) {
            for (const raw of m[1].split(',')) {
                const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
                if (name) imported.set(name, (imported.get(name) ?? 0) + 1);
            }
        }
        const dupImports = [...imported].filter(([, n]) => n > 1).map(([k]) => k);
        if (dupImports.length) reasons.push(`duplicate import: ${dupImports.join(', ')}`);

        dup(/^(?:export\s+(?:default\s+)?)?(?:abstract\s+)?(?:class|function|interface|enum)\s+(\w+)/gm, 'top-level declaration');
        dup(/^(?:export\s+)?(?:const|let|var|type)\s+(\w+)\s*[=:<]/gm, 'top-level binding');
        dup(/^\s+(?:(?:public|private|protected|static|readonly|override|declare)\s+)+(\w+)\s*[?!]?\s*:/gm, 'class field');
        dup(/^\s+(?:static\s+)?get\s+(\w+)\s*\(/gm, 'getter');
    }
    return reasons;
}

// ─── rendering ──────────────────────────────────────────────────────────────

function pad(s: string, n: number): string {
    return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);
}

function main(): void {
    const args = process.argv.slice(2);
    const auditIdx = args.indexOf('--audit');
    const auditSha = auditIdx >= 0 ? args[auditIdx + 1] : undefined;
    const asJson = args.includes('--json');
    if (auditIdx >= 0 && !auditSha) throw new Error('--audit needs a merge commit SHA, e.g. --audit 3bb5f11');

    const sides = detectSides(auditSha);
    if (sides.operation === 'none') {
        console.log('No merge, rebase, cherry-pick, revert or stash conflict is in progress.');
        console.log('▶ Next: to audit a merge that already completed, run with --audit <merge-sha>.');
        return;
    }

    // In audit mode the merge already happened, so live index conflicts are irrelevant.
    const unmerged = sides.operation === 'audit' ? [] : git(['status', '--porcelain'], true)
        .split('\n')
        .filter(l => /^(UU|AA|DU|UD|AU|UA|DD) /.test(l))
        .map(l => ({ code: l.slice(0, 2), path: l.slice(3) }));

    const rows: Row[] = unmerged.map(({ code, path }) => {
        const kind = classifyKind(path);
        const hunks = countHunks(path);
        // Text files with both sides present and no markers left have been edited but not staged yet.
        if (hunks === 0 && existsSync(path) && (code === 'UU' || code === 'AA') && !['binary', 'submodule'].includes(kind)) {
            return { path, code, type: TYPE_NAMES[code] ?? code, kind, hunks, risk: 'LOW' as Risk, action: `no markers left — verify (Step 5), then git add ${path}` };
        }
        const { risk, action } = suggest(code, kind, path, hunks);
        return { path, code, type: TYPE_NAMES[code] ?? code, kind, hunks, risk, action };
    });

    // Silent breaks: files both sides touched that git merged without a marker.
    const unmergedPaths = new Set(unmerged.map(u => u.path));
    const theirsChanged = changedFiles(sides.base, sides.theirs);
    const touchedByBoth = [...changedFiles(sides.base, sides.ours)].filter(p => theirsChanged.has(p));
    for (const path of touchedByBoth) {
        if (unmergedPaths.has(path)) continue;
        const reasons = auditFile(path, sides.operation === 'audit' ? auditSha : undefined);
        if (reasons.length) {
            rows.push({
                path, code: '—', type: 'SILENT: auto-merged but broken', kind: classifyKind(path), hunks: 0, risk: 'HIGH',
                action: `${reasons.join('; ')} → keep one copy of each`,
            });
        }
    }

    // Pending rebase steps that would undo upstream work.
    const warnings: string[] = [];
    for (const line of sides.pendingTodo) {
        const m = line.match(/^(?:p|pick)\s+([0-9a-f]+)\s+(.*)$/);
        if (m && /^Revert "Merge/.test(m[2])) {
            warnings.push(`pending step "${line.slice(0, 90)}" reverts a merge; replaying it onto upstream will remove upstream work. Consider dropping it (git rebase --edit-todo → drop).`);
        }
    }

    if (asJson) {
        console.log(JSON.stringify({ sides, rows, warnings }, null, 2));
        return;
    }

    const op = sides.operation.toUpperCase();
    const ctx = sides.operation === 'rebase'
        ? `(replaying ${short(sides.theirs)} onto ${short(sides.ours)})${sides.progress ? ` — ${sides.progress}` : ''}`
        : sides.operation === 'audit' ? `(auditing merge ${auditSha})` : '';
    console.log(`Operation: ${op} ${ctx}`);
    console.log(`  ours   = ${short(sides.ours)}  ${sides.oursLabel} — "${subject(sides.ours)}"`);
    console.log(`  theirs = ${short(sides.theirs)}  ${sides.theirsLabel} — "${subject(sides.theirs)}"`);
    console.log(`  base   = ${short(sides.base)}  (3-way merge base)`);
    if (sides.branchBase && sides.branchBase !== sides.base) {
        console.log(`  branch base = ${short(sides.branchBase)}  (where the two lines of work diverged — use for affected tests)`);
    }
    console.log('');

    if (!rows.length) {
        console.log('No conflicted or silently broken files found.');
    } else {
        console.log(` # | ${pad('File', 48)} | Code | ${pad('Conflict type', 32)} | ${pad('Kind', 9)} | Hunks | Risk   | Suggested action`);
        console.log(`---|${'-'.repeat(50)}|------|${'-'.repeat(34)}|${'-'.repeat(11)}|-------|--------|${'-'.repeat(40)}`);
        rows.forEach((r, i) => {
            console.log(`${String(i + 1).padStart(2)} | ${pad(r.path, 48)} | ${pad(r.code, 4)} | ${pad(r.type, 32)} | ${pad(r.kind, 9)} | ${String(r.hunks).padStart(5)} | ${pad(r.risk, 6)} | ${r.action}`);
        });
    }

    for (const w of warnings) console.log(`\n⚠ ${w}`);
    if (sides.pendingTodo.length) {
        console.log(`\nRemaining rebase steps (${sides.pendingTodo.length}):`);
        for (const l of sides.pendingTodo) console.log(`  ${l.slice(0, 100)}`);
    }

    // Ready-to-run affected-tests command (Step 6), one --side per line of work.
    const script = '.claude/skills/resolve-merge-conflicts/scripts/affected-tests.ts';
    const bb = sides.branchBase ?? sides.base;
    let affectedCmd: string | undefined;
    if (sides.operation === 'rebase' && bb && sides.onto && sides.replayed?.length) {
        affectedCmd = `npx tsx ${script} --side "upstream=${short(bb)}..${short(sides.onto)}" --side "branch=${sides.replayed.map(short).join(',')}"`;
    } else if (bb && sides.ours && sides.theirs) {
        affectedCmd = `npx tsx ${script} --side "ours=${short(bb)}..${short(sides.ours)}" --side "theirs=${short(bb)}..${short(sides.theirs)}"`;
    }
    if (affectedCmd) console.log(`\nAffected tests per side (Step 6):\n  ${affectedCmd}`);

    const high = rows.filter(r => r.risk === 'HIGH').length;
    console.log('');
    const allEditedOnly = rows.length > 0 && rows.every(r => r.code !== '—' && r.hunks === 0 && r.risk === 'LOW');
    if (allEditedOnly && sides.operation !== 'audit') {
        console.log(`▶ Next: every conflict is edited — run the Step 5 verification loop, stage the resolved files, then git ${sides.operation} --continue.`);
    } else if (!rows.length && sides.operation !== 'audit') {
        console.log(`▶ Next: nothing left to resolve — run static verification (Step 5), then git ${sides.operation} --continue.`);
    } else if (sides.operation === 'audit') {
        console.log('▶ Next: fix the silent breaks above, run static verification, then list and run the affected tests (Steps 5–7).');
    } else {
        console.log(`▶ Next: compare both sides of the ${rows.length} file(s) (${high} HIGH risk) and confirm a strategy per file before editing.`);
    }
}

try {
    main();
} catch (err) {
    console.error(`conflict-report: ${(err as Error).message}`);
    console.error('Run it from inside the git repository, during a merge/rebase/cherry-pick/revert, or pass --audit <merge-sha>.');
    process.exit(1);
}
