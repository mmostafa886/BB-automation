# From a Recorded Test to the Framework — a Line-by-Line Walkthrough

This document takes the raw Playwright test **"Dividends- Constant Amount - Yearly"** and shows
exactly how it became four files in this framework. Every line of the original is accounted for:
where it went, why it went there, and what decision put it there.

Read it once end-to-end. After that, section 8 is the recipe you follow on your own for the next
test, and section 9 is the decision table you use when you are unsure where a line belongs.

---

## 1. The starting point

This is what you wrote:

```js
test('Dividends- Constant Amount - Yearly', async ({ page }) => {
    await validLogin(page);
    await page.getByRole('link', { name: 'Forecast', exact: true }).click();
    await page.getByRole('link', { name: 'Financial Tables' }).click();
    await page.getByRole('link', { name: 'Dividends' }).click();
    await page.getByRole('button', { name: '×' }).click();
    await page.getByRole('button', { name: 'Add Dividends' }).click();
    await page.getByRole('textbox', { name: 'Enter name' }).dblclick();
    await page.getByRole('textbox', { name: 'Enter name' }).fill('dividends-constant amount-yearly');
    await page.getByText('One time amount (E£)').click();
    await page.getByText('Constant amount (E£)').click();
    await page.locator('bzns-wizard-form').getByRole('textbox').click();
    await page.locator('bzns-wizard-form').getByRole('textbox').fill('1000');
    await page.locator('.financial-form-section > app-bzns-selectbox-field > div > .custom-selectbox > .selectbox-value-container').click();
    await page.getByText('Year', { exact: true }).click();
    await page.getByRole('button', { name: 'Save & Exit' }).click();
    await page.getByText('Dividend Created Successfully').click();
    for (const year of ['2026', '2027', '2028', '2029', '2030']) {
        await expect(page.locator(`[data-automation-test="auto-financial-row-dividends-constant_amount-yearly-${year}"]`).first()).toContainText('E£ 1,000');
    }
});
```

Nothing is wrong with it as a script. It just mixes four different kinds of information in one
place: **what** is being tested, **how** each interaction is performed, **where** each element is,
and **which values** are used. This framework keeps those four separated so that when the app's
HTML changes you edit one small file instead of hunting through every spec.

---

## 2. What was created or changed

| # | File | New or edited | Holds |
|---|---|---|---|
| 1 | [src/locators/dividends-page-locators.ts](../src/locators/dividends-page-locators.ts) | **new** | WHERE — the six selectors |
| 2 | [src/pages/dividends-page-self-healing.ts](../src/pages/dividends-page-self-healing.ts) | **new** | HOW — the actions and assertions |
| 3 | [src/pages/pom-lazy-self-healing.ts](../src/pages/pom-lazy-self-healing.ts) | edited (4 lines) | registers the new page object |
| 4 | [test-data/DividendsInputs.json](../test-data/DividendsInputs.json) | **new** | WITH WHAT — name, amount, expected value |
| 5 | [tests/generated/Dividends/tc-bb-dividends-constant-amount-yearly.spec.ts](../tests/generated/Dividends/tc-bb-dividends-constant-amount-yearly.spec.ts) | **new** | WHAT — the business steps |

Nothing was added to `config/testCaseFilter.ts`. That registry only tracks the Jira-driven modules
of the AI generation agent, and no financial module (Revenues, Assets, Personnel…) is listed there.
Adding Dividends would have been inconsistent.

---

## 3. Where each line of your test went

Read this table first, then the sections that explain the interesting rows.

| Your line | Went to | Became |
|---|---|---|
| `validLogin(page)` | spec | 4 calls on existing page objects |
| click link "Forecast" | spec | `homePage.openFinancialPlan()` — already existed |
| click link "Financial Tables" | spec | `financialDashboard.openFinancialTables()` — already existed |
| click link "Dividends" | spec | `financialDashboard.goToDividends()` — already existed |
| click button "×" | spec | `financialDashboard.dismissInstructionsModal()` — already existed |
| click "Add Dividends" | locators + page | `addDividendsBtn` → `clickAddDividends()` |
| `dblclick()` on the name box | **dropped** | `fill()` already clears the field |
| `fill('dividends-constant amount-yearly')` | locators + page + **data** | `nameField` → `fillName()`, value in JSON |
| click "One time amount (E£)" | page (dynamic) + data | first half of `selectEntryType()` |
| click "Constant amount (E£)" | page (dynamic) + data | second half of `selectEntryType()` |
| `click()` then `fill('1000')` on the wizard textbox | locators + page + data | `amountField` → `fillConstantAmount()` |
| click the `.selectbox-value-container` chain | locators + page | `periodSelect` → first half of `selectPeriod()` |
| click "Year" | page (dynamic) + data | second half of `selectPeriod()` |
| click "Save & Exit" | locators + page | `saveAndExitBtn` → `clickSaveAndExit()` |
| click the success toast | locators + page | `createdMsg` → `assertCreatedMsg()` — now a real assertion |
| the `for` loop with `expect(...)` | page + data | `assertYearlyRowValues()`, years and value in JSON |

### 3.1 Why the four navigation lines produced no new code

Before writing anything I searched the existing page objects for the steps your test performs. All
four navigation clicks were already implemented:

```
click "Forecast"          → HomePageSelfHealing.openFinancialPlan()
click "Financial Tables"  → FinancialDashboardSelfHealing.openFinancialTables()
click "Dividends"         → FinancialDashboardSelfHealing.goToDividends()
click "×"                 → FinancialDashboardSelfHealing.dismissInstructionsModal()
```

**This is the first thing you should do too.** Grep the page objects for the action you need before
you create anything. Reusing `goToDividends()` means that when the navbar changes, the fix happens
once for all chapters instead of once per spec.

`dismissInstructionsModal()` is worth a closer look, because it is better than your line:

```ts
const closeButton = (await this.closeInstructionsModal.get()).filter({ visible: true }).last();
if (!(await closeButton.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;                       // modal not shown — skip instead of failing
}
await this.actions.click(closeButton, 'Close instructions modal', true);
```

That modal only appears when the chapter has no entries yet. Your `getByRole('button', {name:'×'})`
click fails on the second run, once a dividend exists. The existing method returns quietly instead.

### 3.2 Why `dblclick()` disappeared

```js
await page.getByRole('textbox', { name: 'Enter name' }).dblclick();   // select all
await page.getByRole('textbox', { name: 'Enter name' }).fill('…');    // type
```

The double-click is a select-all-then-overwrite habit from recorders. Playwright's `fill()` clears
the field before typing, so the first line changes nothing. Dropping it removes a step from the
report and one more thing that can go wrong. Same reasoning for the `click()` before
`fill('1000')`.

### 3.3 Why clicking the toast became an assertion

```js
await page.getByText('Dividend Created Successfully').click();
```

This *works* as a check, because the click fails if the toast is not there. But it says "click" in
the report, it can dismiss the toast as a side effect, and it does not record an assertion in the
run statistics. So it became:

```ts
await this.assert.toBeVisible(await this.createdMsg.get(), '"Dividend Created Successfully" toast is visible');
```

Same protection, correct intent, and it shows up as an assertion in the HTML report.

### 3.4 Why the year loop moved into the page object

Your loop contains a raw selector:

```js
page.locator(`[data-automation-test="auto-financial-row-dividends-constant_amount-yearly-${year}"]`)
```

A spec is not allowed to contain selectors, so the loop moved into
`assertYearlyRowValues(attributeName, years, expected)`. The three things that vary — the row key,
the list of years, and the expected text — became parameters, and their values live in the JSON.
The next dividend test reuses the same method with different data instead of copying the loop.

Note how the row key is built: the name you typed, `dividends-constant amount-yearly`, appears in
the attribute as `dividends-constant_amount-yearly`. The app lower-cases the name and replaces
spaces with underscores. That is why the JSON carries both `name` and `attributeName`.

---

## 4. File 1 — the locator file (WHERE)

[src/locators/dividends-page-locators.ts](../src/locators/dividends-page-locators.ts)

Rules for this file: pure data, one exported object, no logic, and the only import is the type.

```ts
import type { LocatorDefinition } from '../utils/self-healing-locator';

export const dividendsLocators = {
    addDividendsBtn: {
        selector: (page) => page.getByRole('button', { name: 'Add Dividends' }),
        metadata: {
            role:        'button',
            name:        'Add Dividends',
            text:        'Add Dividends',
            description: 'Add Dividends button on the Dividends chapter toolbar that opens the add-dividend wizard',
        },
    },
    // …five more entries
} satisfies Record<string, LocatorDefinition>;
```

Three things to understand here.

**A `selector` can be a string or a function.** A CSS or XPath string is the usual form. When you
need a Playwright built-in locator like `getByRole`, write it as `(page) => …` instead — the type
allows both. Your recorded test used `getByRole` and `getByText`, so five of the six entries are
functions and only `periodSelect` is a plain CSS string.

**`metadata` is not documentation.** It is the input to the self-healing engine. When the primary
selector stops matching, the framework rebuilds the locator from this metadata as
`getByRole('button', { name: 'Add Dividends' })`, `getByPlaceholder(…)`, `getByText(…)` and so on.
An entry with an empty `metadata` gets no healing. Fill in whatever is true: `role`, `name`,
`text`, `placeholder`, `testId`, and always a plain-English `description`.

**`satisfies Record<string, LocatorDefinition>`** type-checks every entry while keeping the exact
key names, which is what lets the page object write `L.addDividendsBtn` with autocomplete.

Two selectors were flagged with a ⚠ comment because they are fragile, and it is honest to say so:

- `amountField` is "the textbox inside `<bzns-wizard-form>`". It breaks the moment the wizard step
  renders a second textbox.
- `periodSelect` is a five-level CSS child chain with no test id, the most brittle selector in the
  file. It should be replaced as soon as that control gets an automation attribute.

Both are kept exactly as you recorded them, because they are known to work today. The comments tell
the next person what to watch.

---

## 5. File 2 — the page object (HOW)

[src/pages/dividends-page-self-healing.ts](../src/pages/dividends-page-self-healing.ts)

Every page object in this repo has the same four parts.

**Part 1 — declare a field per locator:**

```ts
export class DividendsPageSelfHealing extends SelfHealingPageBase {
    readonly addDividendsBtn: SelfHealingLocator;
    readonly nameField:       SelfHealingLocator;
    // …
```

**Part 2 — build them in the constructor:**

```ts
constructor(page: Page, testName: string, aiProvider?: AIHealingProvider) {
    super();
    this.page    = page;
    this.actions = new AdvancedActionsHelper(page, testName);
    this.assert  = new AdvancedAssertionsHelper(page, testName);

    const logger = Logger.getLogger(`DividendsPageSelfHealing-${testName}`);
    const L      = dividendsLocators;
    const make   = (def: typeof L[keyof typeof L]) => SelfHealingLocator.from(page, def, logger, aiProvider);

    this.addDividendsBtn = make(L.addDividendsBtn);
    // …
}
```

The `make` shorthand is the house style — copy it. The constructor signature is fixed
(`page, testName, aiProvider?`) because the POM calls every page object the same way.

**Part 3 — actions**, each wrapped in exactly one `test.step()`:

```ts
async fillName(name: string): Promise<void> {
    await test.step(`Fill dividend name: "${name}"`, async () => {
        await this.actions.fill(await this.nameField.get(), name, 'Fill dividend name field');
    });
}
```

Three details that are easy to get wrong:

- `await this.<locator>.get()` — never use the `SelfHealingLocator` directly. `.get()` is what runs
  the three healing phases and returns a real Playwright `Locator`.
- `this.actions.fill(...)` and never `locator.fill(...)`. The helper adds logging, screenshots on
  failure, and Radix-UI guards for this app's dropdowns.
- The `test.step()` label is what you will read in the HTML report, so make it a sentence.

**Part 4 — assertions**, all grouped *after* all the actions. That grouping is a house rule
(`/polish-generated-code` enforces it), not a stylistic preference.

### 5.1 Two methods that build locators at runtime

Some elements cannot live in the locator file. The entry-type dropdown is matched by the label it
currently displays, and the period option is matched by the option text — both change per test
data, so they are built inside the method:

```ts
async selectEntryType(currentType: string, targetType: string): Promise<void> {
    await test.step(`Change dividend type from "${currentType}" to "${targetType}"`, async () => {
        await this.actions.click(this.page.getByText(currentType), `Open dividend type dropdown (currently "${currentType}")`);
        await this.actions.clickOption(this.page.getByText(targetType), `Select dividend type "${targetType}"`);
    });
}
```

This is the one legitimate reason to write `this.page.locator(...)` inside a page object: the
selector is **parameterised**. A fixed selector always belongs in the locator file.

`clickOption()` rather than `click()` for the second call — that helper is built for options inside
an open dropdown, which this app renders as detachable overlays.

`selectPeriod()` uses `getByText(period, { exact: true })`, keeping your `exact: true`. Without it,
"Year" would also match "Yearly" and the click would hit the wrong element.

### 5.2 The composite method the spec actually calls

```ts
async addConstantAmountDividend(input: DividendInput): Promise<void> {
    await test.step(`Add a constant-amount dividend: "${input.name}"`, async () => {
        await this.clickAddDividends();
        await this.fillName(input.name);
        await this.selectEntryType(input.currentType, input.entryType);
        await this.fillConstantAmount(input.amount);
        await this.selectPeriod(input.period);
        await this.clickSaveAndExit();
    });
}
```

Why both small methods *and* a composite? The small ones stay reusable for a test that only needs
part of the form (a validation test that saves without a name, say). The composite keeps the
required order inside the page object so the spec reads as one business action. The `DividendInput`
interface at the bottom of the file documents the shape and gives you autocomplete in the spec.

---

## 6. File 3 — registering in the POM

[src/pages/pom-lazy-self-healing.ts](../src/pages/pom-lazy-self-healing.ts)

A page object is invisible to specs until it is registered here. Four edits, always the same four:

```ts
// 1 — import, next to the other page imports
import { DividendsPageSelfHealing } from './dividends-page-self-healing';

// 2 — private backing field, next to the other fields
private _dividendsPage?: DividendsPageSelfHealing;

// 3 — lazy getter, after the other getters
get dividendsPage(): DividendsPageSelfHealing {
    if (!this._dividendsPage) {
        this._dividendsPage = new DividendsPageSelfHealing(this.page, this._testName ?? '', this._aiProvider);
    }
    return this._dividendsPage;
}

// 4 — add the field to the array inside getHealingReport()
this._dividendsPage,
```

Edit 3 is why it is called "lazy": the object is constructed the first time a test touches
`pomSelfHealing.dividendsPage`, so a Login test pays nothing for the Dividends page existing.

Edit 4 is the one people forget. TypeScript will not complain, the test will pass, and the
end-of-test healing report will silently omit every Dividends locator. You will only notice when a
locator heals and nobody sees the warning.

`npm run lint` catches a missing edit 1, 2, or 3. Nothing catches a missing edit 4 except reading
the file, so do them together. `/register-page-in-pom` performs all four for you.

---

## 7. Files 4 and 5 — data and spec

### The data file

[test-data/DividendsInputs.json](../test-data/DividendsInputs.json)

```json
[
  {
    "test": "TC-BB-Dividends-Constant-Amount-Yearly: add a constant-amount dividend charged per year",
    "mail": "bznsplan@gmail.com",
    "password": "12345678",
    "name": "dividends-constant amount-yearly",
    "currentType": "One time amount (E£)",
    "entryType": "Constant amount (E£)",
    "amount": "1000",
    "period": "Year",
    "attributeName": "dividends-constant_amount-yearly",
    "years": ["2026", "2027", "2028", "2029", "2030"],
    "expectedValue": "E£ 1,000"
  }
]
```

Every literal from your test is here, including the credentials. `CLAUDE.md` says never to hardcode
credentials *in a spec*; the financial modules (Revenues, Assets, RealityCheck) all keep per-module
credentials in their own inputs file, and this follows them. If you would rather use the shared
account, move them into `test-data/login.json` and read them from there instead.

It is an array even though it holds one row, matching every other inputs file. A second row later
turns into a second test with no code change.

One caution about the currency sign: this file uses the real Unicode **E£**, which is what you
typed. `test-data/AssetsInputs.json` and `assets-page-locators.ts` carry a mojibake variant
(`EÂ£`) inherited from the old TestCafe sources. Do not copy that form into new files.

### The spec

[tests/generated/Dividends/tc-bb-dividends-constant-amount-yearly.spec.ts](../tests/generated/Dividends/tc-bb-dividends-constant-amount-yearly.spec.ts)

```ts
import { test } from '../../fixtures/self-healing-fixture';
import dividendsInputs from '../../../test-data/DividendsInputs.json';

test.describe('Dividends - Constant Amount - Yearly', () => {
    test(
        `${dividendsInputs[0].test} @dividends @automation`,
        async ({ selfHealingFixture: { pomSelfHealing } }) => {
            await pomSelfHealing.loginPage.navigateToLogin();
            await pomSelfHealing.loginPage.openSignInModal();
            await pomSelfHealing.loginPage.fillAndSubmitSignInForm(dividendsInputs[0].mail, dividendsInputs[0].password);
            await pomSelfHealing.homePage.waitForDashboardLoaded();

            await pomSelfHealing.homePage.openFinancialPlan();
            await pomSelfHealing.financialDashboard.openFinancialTables();
            await pomSelfHealing.financialDashboard.goToDividends();
            await pomSelfHealing.financialDashboard.dismissInstructionsModal();

            await pomSelfHealing.dividendsPage.addConstantAmountDividend({ /* …five fields… */ });

            await pomSelfHealing.dividendsPage.assertCreatedMsg();
            await pomSelfHealing.dividendsPage.assertYearlyRowValues(
                dividendsInputs[0].attributeName,
                dividendsInputs[0].years,
                dividendsInputs[0].expectedValue,
            );
        },
    );
});
```

Every line is a sentence about the business flow. No selector, no `expect`, no `test.step`.

- **`import { test } from '../../fixtures/self-healing-fixture'`** — never from `@playwright/test`.
  That fixture is what builds `pomSelfHealing`, wires the AI healing provider from your `.env`, and
  prints the healing report at the end of the test.
- **`{ selfHealingFixture: { pomSelfHealing } }`** replaces `{ page }`. A spec that receives `page`
  can reach for raw Playwright, which is exactly what the layering forbids.
- **`waitForDashboardLoaded()` instead of `assertPageLoaded()`** — sign-in on staging often takes
  more than the 5 s default assertion timeout, and this method waits up to 60 s. This is the same
  trap the Reality Check spec documents.
- **`dividendsInputs[0]` rather than a loop** — the file has one row. The house convention (see the
  `describe-and-flatten-json-data` skill) is a `describe` wrapper plus direct indexing for a
  single-case file, and a loop only when the array really holds several cases.
- **Tags `@dividends @automation`** in the title, so the test can be selected by tag in CI.
- **The JSDoc header** is not decoration. `@preconditions` records that this flow uses whatever
  forecast the account last had open, and that the dividend name must not already exist. Those are
  the two reasons this test would fail on a re-run, written down where the next person will look.

---

## 8. Do it yourself next time — the recipe

**Step 0. Record or write the raw test.** Get it passing with `npx playwright codegen` or by hand.
Selectors that are proven to work are worth more than selectors that look elegant.

**Step 1. Split your script into four columns on paper.**

| Column | Question | Ends up in |
|---|---|---|
| WHAT | what business step is this? | the spec |
| HOW | which click/fill/assert performs it? | the page object |
| WHERE | which selector finds the element? | the locator file |
| VALUES | which literal strings are typed or expected? | the JSON |

**Step 2. Search before you create.** For each step, check whether a method already exists:

```bash
grep -rn "async goTo\|async open\|async click\|async assert" src/pages/ | grep -i "<keyword>"
```

Reuse whatever you find. Only what is genuinely new to your page needs new code.

**Step 3. Create the locator file** `src/locators/<page>-page-locators.ts` if the page has none.
One entry per element, `selector` plus a filled-in `metadata`. Use a `(page) => …` function when
the recorder gave you `getByRole` / `getByText`. Leave a ⚠ comment on any selector you know is
fragile. Skip parameterised selectors — they belong in the page object.

**Step 4. Create or extend the page object** `src/pages/<page>-page-self-healing.ts`. Declare a
field per locator, build them all in the constructor with the `make` shorthand, then write one
method per action and one per assertion, each in a single `test.step()`. Actions first, assertions
after. Add a composite method for the whole form if the spec would otherwise call six methods in a
fixed order.

**Step 5. Register the page in the POM** — the four edits from section 6, or run
`/register-page-in-pom`. Skip this and the spec will not compile.

**Step 6. Create the data file** `test-data/<Feature>Inputs.json`. An array of objects. Move every
literal out of the spec: names, amounts, expected text, and the credentials this account needs.

**Step 7. Write the spec** at `tests/generated/<Module>/tc-<Key>-<kebab-description>.spec.ts`.
Import `test` from the self-healing fixture, destructure `selfHealingFixture: { pomSelfHealing }`,
and call only page-object methods. Add the JSDoc header with preconditions and steps, and tags in
the title.

**Step 8. Verify, in this order:**

```bash
npm run lint                                             # types — catches an unregistered page
npx playwright test tests/generated/<Module> --list      # is the test discovered?
npm run test:module MODULE=<Module>                      # run it for real
npm run report                                           # read the steps in the HTML report
```

**Step 9. Decide about seeding.** If the flow needs a pre-existing forecast built over the API, take
the `seededForecast` fixture and bracket the run with `npm run seed:forecast` /
`npm run seed:forecast:delete`. This Dividends test does not, because it uses whatever forecast the
account already has.

---

## 9. Decision table — "where does this line go?"

| The line… | Put it in | Why |
|---|---|---|
| describes a business step ("sign in", "add a dividend") | spec | that is the spec's only job |
| performs a click / fill / select | page object method | specs never touch Playwright |
| is an `expect(...)` | page object assertion method | via `this.assert.*`, so it is logged |
| is a fixed selector | locator file | one place to fix when the DOM changes |
| is a selector that changes per test data | page object, built with `this.page.locator(...)` | it cannot be static data |
| is a literal value typed or expected | JSON data file | new case = new data row, no code change |
| is a credential | JSON data file (`login.json` or the module's inputs) | never in a spec |
| is a `test.step()` | page object | steps wrap methods, not spec lines |
| is a loop over years/rows | page object method with parameters | it contains selectors |
| already exists as a method somewhere | nowhere — call the existing one | reuse beats duplication |

---

## 10. Verification performed

| Check | Command | Result |
|---|---|---|
| Types compile across the project | `npx tsc --noEmit` | passed, no errors |
| Playwright discovers the new spec | `npx playwright test tests/generated/Dividends --list` | 1 test in 1 file |

The test was **not executed** against the staging app in this session, so the flow is not yet proven
end-to-end here. Every selector is the one from your working recording, and the navigation methods
are the ones the Revenues and Assets specs already use, but the first real run is still yours to do:

```bash
npm run test:module MODULE=Dividends
```

Two things to expect on that first run. The dividend name must not already exist in the forecast, or
the row attribute will match two rows. And the account must already have the right company and
forecast open, because this flow goes straight to the Forecast link without picking them from the
side menu.
