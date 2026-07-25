# describe-and-flatten-json-data

> Performs a two-part structural pass over a generated Playwright spec: wraps its `test(...)`
> call(s) in a `test.describe(...)` block when one is missing, and flattens data-driven JSON
> access from a loop into direct indexed access when the imported `test-data/*.json` file is
> provably safe to collapse. The JSON file is never a separate input — it is always
> auto-discovered from the target spec's own import statement. The flatten step never fires when
> a JSON array holds multiple rows that the spec loops over to produce multiple test cases —
> coverage is never silently dropped. Ends with a per-file summary stating exactly what changed
> and what didn't, and why.

---

## What this skill does

For each spec file in scope:

1. Checks whether a top-level `test.describe(...)` wrapper already exists. If not, adds one,
   titled `'<Module> - <derived title>'`, wrapping whatever is already there (a single test, or a
   loop that emits several).
2. Reads the spec's own `import <name> from '.../test-data/<file>.json'` line to find its data
   file — never accepts a JSON path directly as input.
3. Classifies the JSON's shape:
   - **One-element array** → eligible to flatten.
   - **Multi-element array, looped over to emit multiple `test(...)` cases** → NOT eligible;
     loop and per-row access left untouched.
   - **Multi-element array, but the spec only reads one fixed index (no loop)** → nothing to
     flatten (there's no loop to remove); reported as already-direct with an informational note
     about the apparently-unused rows.
   - **Object shape** (e.g. `login.json`'s named `validUser` / `invalidUser` sub-objects) →
     already direct usage, no change needed.
4. When eligible, replaces the loop with direct indexed access (`inputs[0].field`) inline — no
   intermediate variable — and folds the result into the describe wrapper.
5. Runs `npm run lint` to confirm the flatten didn't introduce a type error; if it did, adds a
   narrow `as any` cast at the specific call-site argument (never a blanket cast on the import).
6. Prints a per-file summary table: what was added, what was flattened, what was skipped and why.

---

## When to use

Run any time after specs exist under `tests/generated/` and you want their data-driven specs to
follow the project's `test.describe` + direct-JSON-access convention (as seen in
[tests/generated/Login/tc-BB-001-sign-in-with-valid-credentials.spec.ts](../../../tests/generated/Login/tc-BB-001-sign-in-with-valid-credentials.spec.ts)),
without risking silently dropping coverage on specs that are genuinely data-driven across
multiple distinct cases (like a legacy `data.forEach(...)` migration).

This is a standalone maintenance pass — it is not part of any pipeline and does not require a
specific prior step.

---

## How to invoke

```text
/describe-and-flatten-json-data
```

No arguments processes every data-driven spec under `tests/generated/`. Optionally target a
subset:

```text
/describe-and-flatten-json-data tests/generated/DirectCost/tc-bb-direct-cost.spec.ts
/describe-and-flatten-json-data DirectCost
/describe-and-flatten-json-data tests/generated/Reagents/*.spec.ts
```

### Input options

| Input | Example |
| --- | --- |
| *(none)* / `all` | Every `*.spec.ts` under `tests/generated/` that imports a `test-data/*.json` file |
| Spec file path | `tests/generated/DirectCost/tc-bb-direct-cost.spec.ts` |
| Module name | `DirectCost` |
| Glob | `tests/generated/Reagents/*.spec.ts` |

The JSON file is **never** an input on its own — it's always resolved from the target spec's
import statement.

---

## The multi-case guard

The core judgment call this skill makes: *does the JSON mean several cases of the same spec?*

- If the JSON's top-level array has exactly **one** element, there's only one case — safe to
  collapse a loop down to `inputs[0]`.
- If it has **more than one** element and the spec loops over it (`for`, `for...of`, `.forEach`,
  `.map` emitting a `test(...)` per element), those elements are genuinely distinct test cases —
  the loop must stay untouched, or every case but the first would silently stop running.
- If it has more than one element but the spec **doesn't loop** (only ever reads one fixed
  index), there's no loop for this skill to remove in the first place. This is reported as
  already-direct, with an informational note flagging the apparently-unused rows — worth a human
  glance, but not something this skill treats as an error or blocks on.
- An **object**-shaped JSON file (named sub-objects like `login.json`'s `validUser` /
  `invalidUser`) was never a "loop over cases" pattern to begin with, so it's already in the
  target state.

---

## Before / after

### Eligible: single-row JSON (flattened)

**Before:**

```typescript
import { test } from '../../fixtures/self-healing-fixture';
import directCostInputs from '../../../test-data/DirectCostInputs.json';

const inputs = directCostInputs as any[];

for (const input of inputs) {
    test(`${input.test} @directcost @automation`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.directCostPage.runDirectCostScenario(input);
    });
}
```

**After:**

```typescript
import { test } from '../../fixtures/self-healing-fixture';
import directCostInputs from '../../../test-data/DirectCostInputs.json';

test.describe('DirectCost - Add / edit / duplicate / delete a direct cost', () => {
    test(
        `TC-BB-Direct-Cost: ${directCostInputs[0].test} @directcost @automation`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            // Loosely typed: the inputs JSON is data, not a contract.
            await pomSelfHealing.directCostPage.runDirectCostScenario(directCostInputs[0] as any);
        },
    );
});
```

### Not eligible: multi-row JSON (loop preserved, describe still added)

**Before:**

```typescript
import { test } from '../../fixtures/self-healing-fixture';
import inputs from '../../../test-data/SomeModuleInputs.json'; // 5 distinct rows

inputs.forEach((input) => {
    test(`${input.test} @somemodule`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
        await pomSelfHealing.someModulePage.runScenario(input);
    });
});
```

**After:**

```typescript
import { test } from '../../fixtures/self-healing-fixture';
import inputs from '../../../test-data/SomeModuleInputs.json'; // 5 distinct rows

test.describe('SomeModule - Run scenario', () => {
    inputs.forEach((input) => {
        test(`${input.test} @somemodule`, async ({ selfHealingFixture: { pomSelfHealing } }) => {
            await pomSelfHealing.someModulePage.runScenario(input);
        });
    });
});
```

---

## Final summary output

```text
| File | describe | JSON data usage | Reason |
|---|---|---|---|
| DirectCost/tc-bb-direct-cost.spec.ts | ADDED | FLATTENED (loop → directCostInputs[0]) | single-row JSON |
| Login/tc-BB-001-sign-in-with-valid-credentials.spec.ts | ALREADY PRESENT | ALREADY DIRECT | object-shaped JSON, no loop |
| SomeModule/tc-xxx.spec.ts | ADDED | SKIPPED (loop kept) | 5 distinct rows drive 5 branches — flattening would drop coverage |
| OtherModule/tc-yyy.spec.ts | ADDED | ALREADY DIRECT (note) | JSON has 3 rows, spec reads index 0 only — other rows appear unused, no loop to flatten |

Totals: N files scanned, D describes added, F flattened, S skipped (multi-case, coverage
preserved), U already direct (including any with an unused-rows note).
Verification: npm run lint — PASS / FAIL
```

---

## Related skills

| Skill | Purpose |
| --- | --- |
| [migrate-test-to-selfhealing](../migrate-test-to-selfhealing/README.md) | Produces the self-healing specs this skill later structures |
| [polish-generated-code](../polish-generated-code/README.md) | Natural follow-up cleanup pass (imports, method ordering, etc.) |
