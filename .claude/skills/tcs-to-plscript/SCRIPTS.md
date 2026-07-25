# tcs-to-plscript — Script & Code Templates

Referenced from [WORKFLOW.md](WORKFLOW.md). These are the literal templates used when
generating each artifact. Do not deviate from the structure — only fill in placeholders.

## Table of contents

- [Locator repository template](#locator-repository-template)
- [Self-healing page class template](#self-healing-page-class-template)
- [Spec file template](#spec-file-template)
- [Git commit + PR creation commands](#git-commit--pr-creation-commands)

---

## Locator repository template

`src/locators/<page-kebab>-page-locators.ts`

```typescript
import type { LocatorDefinition } from '../utils/self-healing-locator';

/**
 * Locator repository for <PageName>PageSelfHealing.
 * Pure data — no Playwright Page dependency.
 */
export const <camelCasePage>Locators = {

    // ── <Group> ──────────────────────────────────────────────────────────────
    <elementName>: {
        selector: '<css-or-xpath>',
        metadata: {
            role:        '<aria-role>',
            description: '<plain-English description of the element on this page>',
        },
    },

} satisfies Record<string, LocatorDefinition>;
```

---

## Self-healing page class template

`src/pages/<page-kebab>-page-self-healing.ts`

```typescript
import { test, type Page } from '@playwright/test';
import { SelfHealingPageBase } from './self-healing-page-base';
import { SelfHealingLocator, type AIHealingProvider } from '../utils/self-healing-locator';
import { <camelCasePage>Locators } from '../locators/<page-kebab>-page-locators';
import { Logger } from '../utils/Logger';
import { AdvancedActionsHelper } from '../utils/advanced-actions-helper';
import { AdvancedAssertionsHelper } from '../utils/advanced-assertions-helper';

/**
 * <PageName>PageSelfHealing — Page Object for the <description> page.
 *
 * Every method body is wrapped in `test.step()` so it appears as a labelled step
 * in the Playwright HTML report, on top of the finer-grained StepRunner steps
 * inside AdvancedActionsHelper / AdvancedAssertionsHelper.
 */
export class <PageName>PageSelfHealing extends SelfHealingPageBase {

    // ── Locator declarations ──────────────────────────────────────────────────
    readonly <locatorName1>: SelfHealingLocator;
    readonly <locatorName2>: SelfHealingLocator;

    private readonly page: Page;
    private readonly actions: AdvancedActionsHelper;
    private readonly assert: AdvancedAssertionsHelper;

    constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
        super();
        this.page    = page;
        this.actions = new AdvancedActionsHelper(page, testName);
        this.assert  = new AdvancedAssertionsHelper(page, testName);

        const logger = Logger.getLogger(`<PageName>PageSelfHealing-${testName}`);

        this.<locatorName1> = SelfHealingLocator.from(page, <camelCasePage>Locators.<key1>, logger, aiProvider);
        this.<locatorName2> = SelfHealingLocator.from(page, <camelCasePage>Locators.<key2>, logger, aiProvider);
    }

    // ── Navigation ───────────────────────────────────────────────────────────

    async navigateTo(): Promise<void> {
        await test.step('Navigate to <PageName> page', async () => {
            await this.actions.goto('/<app-path>', 'Navigate to <PageName> page');
        });
    }

    // ── Action Methods — each body wrapped in test.step() ────────────────────

    async click<Element>(): Promise<void> {
        await test.step('Click <element description>', async () => {
            await this.actions.click(await this.<locatorName>.get(), 'Click <element description>');
        });
    }

    async fill<Field>(value: string): Promise<void> {
        await test.step(`Fill <field description> with "${value}"`, async () => {
            await this.actions.fill(await this.<locatorName>.get(), value, 'Fill <field description>');
        });
    }

    // ── Assertion Methods — each body wrapped in test.step() ─────────────────

    async verify<Element>Visible(): Promise<void> {
        await test.step('Verify <Element> is visible', async () => {
            await this.assert.toBeVisible(await this.<locatorName>.get(), '<Element> is visible');
        });
    }

    async verify<Element>Text(expected: string): Promise<void> {
        await test.step(`Verify <Element> shows "${expected}"`, async () => {
            await this.assert.toContainText(await this.<locatorName>.get(), expected, '<Element> text');
        });
    }
}
```

---

## Spec file template

`tests/generated/<Module>/tc-<id>-<title-slug>.spec.ts`

```typescript
/**
 * Auto-generated Playwright TypeScript test — tcs-to-plscript
 *
 * @testcase  TC-<id>
 * @title     <Full TC Title>
 * @module    <Module>
 * @priority  P<priority>
 * @tags      @automation <testTypeTags>
 * @UserStory <usId>
 * @ado_tc    (not available from local TCs — omit if no ADO ID mapping exists)
 */

import { test } from '../../fixtures/self-healing-fixture';
import testData from '../../../test-data/<target-file>.json';

test.describe('<Module> - <Full TC Title>', () => {
  test.fixme(
    'TC-<id>: <Full TC Title> @automation <testTypeTags> @US-<usId> @P<priority> @<Module>',
    async ({ selfHealingFixture: { pomSelfHealing } }) => {

    // Step 1: description
    await pomSelfHealing.<pageProperty>.<actionMethod>(testData.<key>);

    // Step 2: description
    await pomSelfHealing.<pageProperty>.<assertionMethod>(testData.<expectedKey>);
  });
});
```

---

## Git commit + PR creation commands

Used in [WORKFLOW.md — CREATE PR](WORKFLOW.md#create-pr) after the pass-rate gate (when
applicable) has been evaluated.

```bash
git add src/locators/<page-kebab>-page-locators.ts
git add src/pages/<page-kebab>-page-self-healing.ts
git add src/pages/pom-lazy-self-healing.ts
git add tests/generated/<Module>/
git commit -m "feat(<feature-slug>): add <Module> self-healing page object and specs

Generated by tcs-to-plscript.
Artifacts:
  - src/locators/<page-kebab>-page-locators.ts
  - src/pages/<page-kebab>-page-self-healing.ts
  - tests/generated/<Module>/  (<N> spec files)

Test results: <'Run1 <passed1>/<total1> passing (<rate1>%) | Run2 ...' OR 'not executed'>"
```

```bash
gh pr create \
  --title "feat(<feature-slug>): <EntityName> self-healing automation (<final-rate>)" \
  --body "$(cat <<'EOF'
## Summary
- Locators: \`src/locators/<page-kebab>-page-locators.ts\`
- Page Object: \`src/pages/<page-kebab>-page-self-healing.ts\`
- Specs: \`tests/generated/<Module>/\` (<N> files)

## Test Results
<if EXECUTE_TESTS=true>
| Run | Passed | Failed | Pass Rate |
|-----|--------|--------|-----------|
| Run 1 | <p1> | <f1> | <r1>% |
| Run 2 | <p2> | <f2> | <r2>% |

## Remaining failures
<List each failing TC-<id>-<title-slug> and its category, or 'None — all tests pass'>
</if>
<if EXECUTE_TESTS=false>
Tests were not executed. Run manually with:
\`npx playwright test "tests/generated/<Module>/" --project="chromium"\`
</if>

🤖 Generated by tcs-to-plscript
EOF
)" \
  --base master
```

Print the PR URL returned by the command.
