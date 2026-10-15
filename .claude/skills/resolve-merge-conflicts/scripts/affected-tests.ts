/**
 * Lists the tests affected by each side of a merge/rebase so both lines of work can be re-run.
 *
 * Usage:
 *   npx tsx .claude/skills/resolve-merge-conflicts/scripts/affected-tests.ts \
 *       --side "<label>=<from>..<to>"        # a commit range, e.g. "upstream=3e623b0..dc654de"
 *       --side "<label>=<sha>,<sha>,..."     # explicit commits (each diffed against its parent)
 *       [--side ...] [--json]
 *
 * conflict-report.ts prints a ready-made command. Mapping order per changed file:
 *   1. project adapter (when one is detected, e.g. BB-Automation's 4-layer POM)
 *   2. import graph: test files that transitively import the changed file
 * Read-only: never modifies the repository.
 */
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { dirname, join, normalize } from 'path';

interface Side {
    label: string;
    changed: string[];
}

interface Hit {
    file: string;
    via: string;
    tests: string[];
    wide?: boolean;
    note?: string;
}

/** A project-specific mapping that takes precedence over the import graph. */
interface Adapter {
    name: string;
    /** Files the import graph must not walk through (e.g. a registry that imports every page). */
    barriers: Set<string>;
    map(file: string, tests: string[]): Hit | undefined;
    /** Per-test setup note, e.g. a seed bracket the run needs. */
    setupNote(test: string): string | undefined;
}

const TEST_FILE = /(\.(spec|test)\.[cm]?[jt]sx?$)|((^|\/)test_[^/]+\.py$)|(_test\.(py|go)$)/;
const SOURCE_FILE = /\.(m?[jt]sx?|cjs)$/;
const WIDE_SHARE = 0.5; // a file reaching more than half the tests is reported as wide impact

// ─── git helpers ────────────────────────────────────────────────────────────

function git(args: string[]): string {
    try {
        return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 }).trim();
    } catch (err) {
        const msg = (err as { stderr?: string }).stderr || (err as Error).message;
        throw new Error(`git ${args.join(' ')} failed: ${msg.trim()}`);
    }
}

function lines(s: string): string[] {
    return s.split('\n').filter(Boolean);
}

function changedFor(spec: string): string[] {
    if (spec.includes('..')) {
        const [from, to] = spec.split('..');
        return lines(git(['diff', '--name-only', from, to]));
    }
    const files = new Set<string>();
    for (const sha of spec.split(',').map(s => s.trim()).filter(Boolean)) {
        // --root handles a root commit; -m with --first-parent covers merge commits.
        for (const f of lines(git(['diff-tree', '--no-commit-id', '--name-only', '-r', '--root', '-m', '--first-parent', sha]))) files.add(f);
    }
    return [...files];
}

function read(path: string): string {
    try {
        return readFileSync(path, 'utf8');
    } catch {
        return '';
    }
}

function stripComments(src: string): string {
    return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

// ─── import graph (generic) ─────────────────────────────────────────────────

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)|^\s*import\s*['"]([^'"]+)['"]/gm;
const EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json', '/index.ts', '/index.js'];

function resolveImport(fromFile: string, spec: string): string | undefined {
    if (!spec.startsWith('.')) return undefined; // packages and path aliases are out of scope
    const base = normalize(join(dirname(fromFile), spec));
    const stripped = base.replace(/\.js$/, ''); // TS "node16" style imports use .js for .ts files
    for (const candidate of [base, stripped]) {
        for (const ext of EXTS) {
            const p = candidate + ext;
            if (existsSync(p) && !p.endsWith('/')) return p;
        }
    }
    return undefined;
}

/** Map: file → files that import it. */
function buildReverseGraph(files: string[]): Map<string, Set<string>> {
    const reverse = new Map<string, Set<string>>();
    for (const file of files) {
        if (!SOURCE_FILE.test(file)) continue;
        for (const m of read(file).matchAll(IMPORT_RE)) {
            const target = resolveImport(file, m[1] ?? m[2] ?? m[3] ?? m[4]);
            if (!target) continue;
            if (!reverse.has(target)) reverse.set(target, new Set());
            reverse.get(target)!.add(file);
        }
    }
    return reverse;
}

function dependentTests(file: string, reverse: Map<string, Set<string>>, barriers: Set<string>): string[] {
    const seen = new Set<string>([file]);
    const queue = [file];
    const tests = new Set<string>();
    while (queue.length) {
        const cur = queue.shift()!;
        if (TEST_FILE.test(cur)) tests.add(cur);
        if (cur !== file && barriers.has(cur)) continue;
        for (const dep of reverse.get(cur) ?? []) {
            if (!seen.has(dep)) {
                seen.add(dep);
                queue.push(dep);
            }
        }
    }
    return [...tests];
}

// ─── BB-Automation adapter (4-layer self-healing POM) ───────────────────────

function bbAdapter(): Adapter | undefined {
    const POM = 'src/pages/pom-lazy-self-healing.ts';
    if (!existsSync(POM)) return undefined;

    const pom = read(POM);
    const classToFile = new Map<string, string>();
    for (const m of pom.matchAll(/import\s*\{\s*(\w+)\s*\}\s*from\s*'\.\/([^']+)'/g)) classToFile.set(m[1], `src/pages/${m[2]}.ts`);
    const pageToGetters = new Map<string, Set<string>>();
    for (const m of pom.matchAll(/get\s+(\w+)\s*\(\)\s*:\s*(\w+)/g)) {
        const file = classToFile.get(m[2]);
        if (!file) continue;
        if (!pageToGetters.has(file)) pageToGetters.set(file, new Set());
        pageToGetters.get(file)!.add(m[1]);
    }
    const locatorToPages = new Map<string, Set<string>>();
    for (const page of pageToGetters.keys()) {
        for (const m of read(page).matchAll(/from\s*['"]\.\.\/locators\/([^'"]+)['"]/g)) {
            const loc = `src/locators/${m[1].replace(/\.ts$/, '')}.ts`;
            if (!locatorToPages.has(loc)) locatorToPages.set(loc, new Set());
            locatorToPages.get(loc)!.add(page);
        }
    }
    const specsUsingGetter = (getters: Set<string>, tests: string[]) =>
        tests.filter(t => [...getters].some(g => new RegExp(`\\.${g}\\b`).test(stripComments(read(t)))));

    const WIDE = /^(tests\/fixtures\/|src\/utils\/)|self-healing-page-base\.ts$/;

    return {
        name: 'BB-Automation 4-layer POM',
        barriers: new Set([POM]),
        map(file, tests) {
            if (file === POM) return { file, via: 'POM registration', tests: [], note: 'registration-only; page changes are mapped individually' };
            if (WIDE.test(file)) return { file, via: 'shared fixture/util/base', tests, wide: true };
            const getters = pageToGetters.get(file);
            if (getters) return { file, via: `page object → pomSelfHealing.${[...getters].join('/')}`, tests: specsUsingGetter(getters, tests) };
            const pages = locatorToPages.get(file);
            if (pages) {
                const all = new Set<string>();
                for (const p of pages) for (const g of pageToGetters.get(p) ?? []) all.add(g);
                return { file, via: `locators → ${[...pages].map(p => p.split('/').pop()).join(', ')}`, tests: specsUsingGetter(all, tests) };
            }
            if (file.startsWith('src/locators/') && file.endsWith('.ts')) {
                return { file, via: 'locators (not imported by any registered page)', tests: [], note: 'orphan locator file' };
            }
            return undefined;
        },
        setupNote(test) {
            if (test.includes('/Personnel/')) return undefined; // seeds and tears down its own forecast
            return /\bseededForecast\b/.test(stripComments(read(test)))
                ? 'needs seed bracket: npm run seed:forecast && … ; npm run seed:forecast:delete'
                : undefined;
        },
    };
}

// ─── runner detection ───────────────────────────────────────────────────────

function runCommand(paths: string[]): string {
    const pkg = existsSync('package.json') ? read('package.json') : '';
    const list = paths.join(' ');
    if (/@playwright\/test/.test(pkg)) return `npx playwright test ${list}`;
    if (/"vitest"/.test(pkg)) return `npx vitest run ${list}`;
    if (/"jest"/.test(pkg)) return `npx jest ${list}`;
    if (paths.some(p => p.endsWith('.py'))) return `pytest ${list}`;
    return `<your test command> ${list}`;
}

// ─── main ───────────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): { sides: Side[]; json: boolean } {
    const sides: Side[] = [];
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] !== '--side') continue;
        const raw = argv[++i];
        const eq = raw?.indexOf('=') ?? -1;
        if (!raw || eq < 1) throw new Error(`--side expects "<label>=<from>..<to>" or "<label>=<sha>,<sha>", got "${raw}"`);
        sides.push({ label: raw.slice(0, eq), changed: changedFor(raw.slice(eq + 1)) });
    }
    if (!sides.length) throw new Error('pass at least one --side, e.g. --side "ours=<base>..HEAD" --side "theirs=<base>..MERGE_HEAD"');
    return { sides, json: argv.includes('--json') };
}

function main(): void {
    process.chdir(git(['rev-parse', '--show-toplevel']));
    const { sides, json } = parseArgs(process.argv.slice(2));

    const files = lines(git(['ls-files', '--cached', '--others', '--exclude-standard']));
    const tests = files.filter(f => TEST_FILE.test(f) && existsSync(f));
    const adapter = bbAdapter();
    const reverse = buildReverseGraph(files.filter(f => existsSync(f)));
    const wideAt = Math.max(10, Math.ceil(tests.length * WIDE_SHARE));

    const perSide = sides.map(side => {
        const hits: Hit[] = [];
        for (const file of side.changed) {
            if (!existsSync(file)) {
                hits.push({ file, via: 'deleted in working tree', tests: [] });
                continue;
            }
            if (TEST_FILE.test(file)) {
                hits.push({ file, via: 'test file', tests: [file] });
                continue;
            }
            const mapped = adapter?.map(file, tests);
            if (mapped) {
                hits.push(mapped);
                continue;
            }
            const deps = dependentTests(file, reverse, adapter?.barriers ?? new Set());
            if (deps.length) hits.push({ file, via: 'import graph', tests: deps, wide: deps.length >= wideAt });
        }
        return { label: side.label, changedCount: side.changed.length, hits };
    });

    const union = new Map<string, Set<string>>(); // test → side labels
    const wideFiles: string[] = [];
    for (const s of perSide) {
        for (const h of s.hits) {
            if (h.wide) {
                wideFiles.push(`${h.file} (${s.label})`);
                continue; // wide files are confirmed with the user before a full run
            }
            for (const t of h.tests) {
                if (!union.has(t)) union.set(t, new Set());
                union.get(t)!.add(s.label);
            }
        }
    }

    const byFolder = new Map<string, string[]>();
    for (const t of [...union.keys()].sort()) {
        const folder = dirname(t);
        if (!byFolder.has(folder)) byFolder.set(folder, []);
        byFolder.get(folder)!.push(t);
    }
    const notes = new Map<string, string>();
    for (const [folder, ts] of byFolder) {
        const note = ts.map(t => adapter?.setupNote(t)).find(Boolean);
        if (note) notes.set(folder, note);
    }

    if (json) {
        console.log(JSON.stringify({
            adapter: adapter?.name ?? null,
            sides: perSide,
            union: [...union].map(([t, s]) => ({ test: t, sides: [...s] })),
            wideFiles,
            setupNotes: Object.fromEntries(notes),
        }, null, 2));
        return;
    }

    console.log(`Mapping: ${adapter ? `${adapter.name} adapter → import graph` : 'import graph'}   (${tests.length} test files in repo)\n`);
    for (const s of perSide) {
        console.log(`=== Side "${s.label}" — ${s.changedCount} changed file(s) ===`);
        const direct = new Map<string, number>(); // folder → changed test files
        const missing = s.hits.filter(h => h.via === 'deleted in working tree');
        const relevant = s.hits.filter(h => h.via !== 'test file' && (h.tests.length || h.wide || h.note));
        for (const h of s.hits.filter(h => h.via === 'test file')) direct.set(dirname(h.file), (direct.get(dirname(h.file)) ?? 0) + 1);

        if (!relevant.length && !direct.size) console.log('  (no tests affected)');
        for (const h of relevant) {
            const count = h.wide ? `WIDE IMPACT (${h.tests.length} tests)` : `${h.tests.length} test(s)`;
            console.log(`  ${h.file}\n      via ${h.via} → ${count}${h.note ? ` — ${h.note}` : ''}`);
        }
        for (const [folder, n] of direct) console.log(`  ${folder}/\n      ${n} test file(s) changed directly`);
        if (missing.length) {
            console.log(`  ${missing.length} changed file(s) not in the working tree (deleted, or added by a step not applied yet):`);
            for (const h of missing.slice(0, 8)) console.log(`      ${h.file}`);
            if (missing.length > 8) console.log(`      … ${missing.length - 8} more`);
        }
        console.log('');
    }

    console.log(`=== Union: ${union.size} test file(s) across ${byFolder.size} folder(s) ===`);
    for (const [folder, ts] of byFolder) {
        const sidesHere = new Set(ts.flatMap(t => [...union.get(t)!]));
        console.log(`  ${folder}  — ${ts.length} file(s) [${[...sidesHere].join(' + ')}]${notes.has(folder) ? `  ⚑ ${notes.get(folder)}` : ''}`);
    }
    if (wideFiles.length) {
        console.log(`\n⚠ Wide-impact changes (confirm before running the full suite):\n  ${wideFiles.join('\n  ')}`);
    }

    if (byFolder.size) {
        const plain = [...byFolder.keys()].filter(f => !notes.has(f));
        const seeded = [...byFolder.keys()].filter(f => notes.has(f));
        console.log('\nSuggested run (Step 7):');
        if (plain.length) console.log(`  ${runCommand(plain)}`);
        for (const f of seeded) console.log(`  ${runCommand([f])}   # ${notes.get(f)}`);
        console.log('\n▶ Next: confirm the list, then run it in the background and report pass/fail per side.');
    } else {
        console.log('\n▶ Next: no tests map to these changes — run the type-check/build and, if in doubt, the smoke suite.');
    }
}

try {
    main();
} catch (err) {
    console.error(`affected-tests: ${(err as Error).message}`);
    process.exit(1);
}
