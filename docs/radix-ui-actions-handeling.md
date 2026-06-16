# Radix UI Click Handling

## Problem

The app under test is built with **Next.js 16.2 / React 19** and uses [Radix UI](https://www.radix-ui.com/) for interactive components (Select, DropdownMenu, Popover, Tabs, Dialog, etc.).
Radix introduces several timing behaviours that cause **random, non-deterministic test failures** when Playwright clicks triggers, options, or asserts on conditionally rendered content.

### How Radix closes a dropdown

When a Radix dropdown closes (user selects an option, presses Escape, or clicks outside), Radix does **not** immediately remove the portal content from the DOM.
Instead, it:

1. Sets `data-state="closed"` on the content element
2. Runs the CSS exit animation (typically 150–300 ms)
3. Only **after** the animation completes, unmounts the content from the DOM

### How Radix opens a dropdown

When a Radix dropdown opens, the portal content is injected into the DOM **immediately** with `data-state="open"`, but the options animate in (CSS transforms/opacity transitions). The options are in the DOM but their positions are still changing.

### How Radix Tabs work (React 19)

When a tab trigger is clicked, Radix **synchronously** sets `aria-selected="true"` and `data-state="active"` on the trigger. However, React 19 renders the panel content **asynchronously** in a separate work loop. This creates a two-phase window:

- **Phase 1 complete** (synchronous) — trigger has `aria-selected="true"` / `data-state="active"`
- **Phase 2 complete** (async) — panel content is mounted and visible in the DOM

Any Playwright action issued between Phase 1 and Phase 2 may misfire onto elements exposed during the React reconciliation (e.g. the nav sidebar), causing unexpected URL changes and redirects.

### Why these behaviours break Playwright

| Failure mode | Root cause |
|---|---|
| Dropdown appears not to open | Next trigger click fires while prior close animation is still running — Radix silently drops it |
| "element not stable" on option click | Options animate in after open; Playwright retries → dropdown closes → timeout |
| "Test timeout exceeded" after tab switch | React 19 renders Radix Tab panel content asynchronously; element not actionable until render completes |
| Test redirects to listing page after tab switch | Playwright action fires during React reconciliation gap — lands on nav sidebar link, changing the URL |
| `fill()` on animated input fails or clears wrong element | Input is inside a panel that is still animating in (fade/slide); bounding box is changing during `clear()` |
| `fill()` / `getText()` "element is not attached" | Radix Dialog/Sheet open animation briefly unmounts inner form elements |
| `aria-expanded` trigger gets no open-animation wait | Radix Select uses `role="combobox"` + `aria-expanded` instead of `data-state` |

---

## Global Fixes — `AdvancedActionsHelper`

**File:** `src/utils/advanced-actions-helper.ts`

All fixes live in this class so that every page object method that routes interactions through `this.actions.*` gets Radix-safe behaviour automatically.

---

### Private guards

#### `waitForRadixSettled()`

Waits for all in-progress Radix **close** animations to drain from the DOM before proceeding.

```typescript
private async waitForRadixSettled(): Promise<void> {
    await this.page.waitForFunction(
        () => document.querySelectorAll(
            '[data-radix-popper-content-wrapper] [data-state="closed"]'
        ).length === 0,
        { timeout: 3000 }
    ).catch(() => { /* warn and proceed */ });
}
```

**Selector:** `[data-radix-popper-content-wrapper]` is the portal root Radix injects into `<body>` for Select / DropdownMenu / Popover / Tooltip. `[data-state="closed"]` inside it means the content is animating out but not yet unmounted.

Returns in a single tick when no Radix component is animating — **zero overhead** for non-Radix interactions.

#### `waitForRadixOpenSettled()`

Waits for all in-progress Radix **open** animations to finish after a dropdown was just opened.

```typescript
private async waitForRadixOpenSettled(): Promise<void> {
    await this.page.waitForFunction(
        () => {
            const el = document.querySelector('[data-radix-popper-content-wrapper] [data-state="open"]');
            if (!el) return true;
            const anims = (el as Element).getAnimations({ subtree: true });
            return anims.length === 0 || anims.every((a: Animation) => a.playState !== 'running');
        },
        { timeout: 3000 }
    ).catch(() => { /* warn and proceed */ });
}
```

Uses `getAnimations({ subtree: true })` (Chrome 101+, always used by Playwright) to check that all CSS animations and transitions on the open content and its descendants have finished. Returns immediately when there is no open popper — zero overhead for non-dropdown interactions.

#### `waitForElementStable()`

Waits for any running CSS animations or transitions on a **specific element** to finish.

`waitFor({ state: 'visible' })` resolves the moment an element appears in the viewport, but the element (or its containing panel) may still be mid-animation (fade-in, slide-in, scale-in). Playwright's own actionability check polls bounding-box stability and will eventually unblock — but this explicit guard makes the wait visible in logs and caps it at 3 s to prevent silent budget exhaustion.

```typescript
private async waitForElementStable(locator: Locator, timeout = 3000): Promise<void> {
    await Promise.race([
        locator.evaluate((el) =>
            new Promise<void>((resolve) => {
                const anims = el.getAnimations({ subtree: false });
                if (anims.length === 0 || anims.every(a => a.playState !== 'running')) {
                    resolve();
                    return;
                }
                // Wait for all running animations/transitions to reach their finished state.
                Promise.all(anims.map(a => a.finished))
                    .then(() => resolve())
                    .catch(() => resolve()); // treat animation cancel/abort as settled
            })
        ).catch(() => {
            this.logger.warn('waitForElementStable: evaluate failed — proceeding anyway');
        }),
        new Promise<void>(resolve => setTimeout(resolve, timeout)),
    ]);
}
```

- Uses `locator.evaluate()` + `Animation.finished` Promises — **zero polling overhead** when no animations are running (resolves on the first microtask tick).
- `{ subtree: false }` — checks only the target element, not descendants (use `waitForRadixOpenSettled` for subtree checks inside Radix poppers).
- 3 s safety cap via `Promise.race` prevents hangs when animations are disabled (e.g. `prefers-reduced-motion`) or already complete before the call arrives.

---

### `click()` — three-branch guard with pre-click attribute detection

```
Before click  → read preClickAriaSelected + preClickDataState  (snapshot BEFORE click — avoids race with React DOM update)
             → waitForRadixSettled()                            (drain any prior close animation)
             → locator.waitFor({ state: 'visible' })
    ↓ locator.click()
After click:
  Branch 1 (ARIA tab trigger):  preClickAriaSelected === "false"
             → locator.and([aria-selected="true"]).waitFor()    (Phase 1: Radix set selection synchronously)
  Branch 2 (Radix Tab trigger): preClickDataState === "inactive"
             → locator.and([data-state="active"]).waitFor()     (Phase 1: data-state transition)
  Branch 3 (Dropdown/Popover):  neither of the above
             → read postClickDataState
             → if data-state present: waitForRadixSettled()
             → if data-state === "open": waitForRadixOpenSettled()
  + aria-expanded guard (always): if aria-expanded === "true" after click
             → waitForRadixOpenSettled()
```

**Why pre-click attribute reading?**

Reading `data-state` or `aria-selected` immediately *after* `locator.click()` races with React's async DOM update — the returned value is stale (still `"inactive"` / `"false"`), so the guard never fires. Snapshotting BEFORE the click gives a reliable baseline.

**Branch 1 — ARIA tab guard (primary):**
Tabs in this app expose both `aria-selected` and `data-state` on the trigger. `aria-selected="false" → "true"` is the ARIA standard attribute for tab selection. The `locator.and()` intersection pattern polls until the combined selector matches — reliable even under React 19 async reconciliation.

**Branch 2 — Radix Tab trigger guard (fallback):**
For tab implementations that use only `data-state="inactive" → "active"` (no `aria-selected`). Same polling pattern via `locator.and()`.

**Branch 3 — Dropdown/Popover guard:**
Post-click reads are reliable for fast dropdown transitions (the open/close state stabilises synchronously). `waitForRadixSettled()` drains any resulting close animation; `waitForRadixOpenSettled()` ensures open options are geometrically stable before the caller picks an option.

---

### `clickOption()` — dedicated method for Radix option clicks

Raw `locator.click()` on a Radix option bypasses all animation guards, causing two failure modes:

1. **"element not stable"** — option animates in; Playwright retries → dropdown closes → timeout.
2. **Next trigger misfire** — selection closes the dropdown; the close animation must drain before the next trigger click.

**Always use `this.actions.clickOption()` instead of raw `locator.click()` for options inside Radix dropdowns.**

```typescript
async clickOption(locator: Locator, description?: string) {
    // 1. Wait for open animation to settle (options geometrically stable)
    await this.waitForRadixOpenSettled();
    // 2. Ensure the option is scrolled into view
    await locator.waitFor({ state: 'visible' });
    // 3. Click
    await locator.click();
    // 4. Wait for close animation triggered by the selection
    await this.waitForRadixSettled();
}
```

---

### `fill()` — three-step readiness guard

```typescript
// Step 1: Drain any in-progress Radix close animations.
//         A closing dropdown can briefly re-layout the form, detaching inner inputs.
await this.waitForRadixSettled();
// Step 2: Wait for the element to be visible in the DOM.
//         'visible' (not 'attached') is required — fill() is an interaction, not a read.
await locator.waitFor({ state: 'visible' });
// Step 3: Wait for any CSS animations/transitions on the element itself to finish.
//         Covers inputs inside panels that animate in (fade, slide) after a tab switch
//         or dialog open — visible too early but bounding box still changing.
await this.waitForElementStable(locator);
await locator.clear();
await locator.fill(value);
```

**Why `visible` and not `attached`?**

`fill()` is an interaction — Playwright's own actionability check for `fill()` requires the element to be visible. Using `'attached'` would allow the guard to pass while the element is hidden (e.g. covered by an overlay), leading to a redundant Playwright wait before the actual fill. `'visible'` aligns the explicit guard with Playwright's internal requirement.

---

### `getText()` — stability guard

```typescript
// Wait for the element to be attached before reading.
// 'attached' (not 'visible') is intentional — reading text from a hidden element
// is valid (e.g. off-screen content, Radix hidden select). Using 'visible' would
// block reads on elements that are in the DOM but not currently displayed.
await locator.waitFor({ state: 'attached' });
const text = await locator.textContent() || '';
```

---

### `hover()` — new method

Wraps `locator.hover()` with step counter, timing, logging, and screenshot on failure.
Use for Radix Tooltip triggers and hover-activated Popovers.

---

### `pressKey()` — new method

Wraps `this.page.keyboard.press(key)` with logging.
Radix-aware: pressing `Escape` or `Enter` can close an open Radix dropdown or dialog. For those keys, the method calls `waitForRadixSettled()` after the keypress so the caller's next action starts from a clean DOM.

---

## Page-Object-Level Fixes

### Radix Tab panel content — two-phase wait after tab switch

**Pattern:** `switchToConditionsTab()`, `switchToProtocolTab()`, and any similar tab-switch method

Radix Tabs activates the tab button synchronously but React 19 renders the panel content **asynchronously**. This gap is dangerous:

- Playwright continues to the next step immediately after `click()` returns
- React is still reconciling; the nav sidebar is briefly exposed underneath the form
- A Playwright action that fires in this window can land on a nav link → URL change → redirect

**Two-phase fix:**

```typescript
async switchToConditionsTab(): Promise<void> {
    await test.step('Switch to the Conditions tab', async () => {
        const tabLocator = await this.conditionsTabButton.get();
        await tabLocator.waitFor({ state: 'visible' });
        await this.actions.click(tabLocator, 'Click Conditions tab');

        // Phase 1: Confirm Radix set aria-selected="true" synchronously.
        //          locator.and() intersection polls until both selectors match.
        await tabLocator.and(this.page.locator('[aria-selected="true"]'))
            .waitFor({ state: 'visible', timeout: 10000 });

        // Phase 2: Confirm React finished mounting the async panel content.
        //          Use the deepest/last landmark in the panel as the anchor —
        //          if it is visible, the full panel has rendered.
        await this.temperatureSensitivityProfileDropdown.locator
            .waitFor({ state: 'visible', timeout: 15000 });
    });
}
```

```typescript
async switchToProtocolTab(): Promise<void> {
    await test.step('Navigate to the Protocol tab', async () => {
        const tabLocator = await this.protocolTab.get();
        await this.actions.click(tabLocator, 'Click Protocol tab');

        // Phase 1: aria-selected="true" confirms Radix processed the click.
        await tabLocator.and(this.page.locator('[aria-selected="true"]'))
            .waitFor({ state: 'visible', timeout: 10000 });

        // Phase 2: "Add Reagent Slot" button visible → Protocol panel fully rendered.
        await this.addReagentSlotButton.locator
            .waitFor({ state: 'visible', timeout: 15000 });
    });
}
```

**Choosing a Phase 2 anchor:** pick an element that is unique to the target panel and rendered last (deepest in the component tree). If it is visible, the full panel has rendered. Using a top-level container is not sufficient — it may be in the DOM before its children are mounted.

> **Note:** The global `click()` guard in `AdvancedActionsHelper` also detects `aria-selected="false"` before the click and waits for `[aria-selected="true"]` afterward. The explicit Phase 1 wait in the page method is redundant with that guard but kept as documentation of intent. Phase 2 is the critical addition.

---

### Count options without opening the dropdown

Radix Select always renders a visually-hidden native `<select>` alongside the custom trigger, kept in sync with the picker options for form interop. Counting its `<option>` children is authoritative and requires **no interaction** with the Radix popover:

```typescript
// Before (opened dropdown, counted, closed with body.click — race condition)
await this.actions.click(await this.defaultRequiredStirringModeDropdown.get(), '...');
await this.assert.toHaveCount(await this.stirringModeOption.get(), expectedCount, '...');
await this.page.click('body', { force: true });

// After (count native <option> elements — zero interaction, no race)
const options = await this.stirringModeOption.get();
await this.assert.toHaveCount(options, expectedCount, '...');
```

`stirringModeOption` selector: `//*[@id="default_stirring_mode"]/following-sibling::select//option`

---

### Hidden-state assertions on conditionally rendered elements

When an element may not exist in the DOM at all, calling `.get()` triggers the self-healing probe which wastes the assertion timeout and can find unintended elements.
Use `.locator` directly — `toBeHidden()` correctly handles both "absent from DOM" and "present but not visible":

```typescript
// Before — .get() probes and heals when element is absent
await this.assert.toBeHidden(await this.v017Warning.get(), '...');

// After — .locator bypasses probe; toBeHidden handles absent elements
await this.assert.toBeHidden(this.v017Warning.locator, '...');
```

The same pattern applies to `verifyTempSensitivityProfileNoteVisible()` / `verifyTempSensitivityProfileNoteHidden()`:
the notes container briefly unmounts during Radix Select state transitions, so using `.locator` gives the assertion the full timeout window without wasting it on failed self-healing retries.

---

## Identifying Radix Components

A Radix-managed interactive element exposes one or more of the following attributes:

| Attribute | Value | Component examples |
|---|---|---|
| `data-state` | `"open"` / `"closed"` | Select, DropdownMenu, Popover, Accordion, Dialog |
| `data-state` | `"active"` / `"inactive"` | Tab trigger (fires synchronously on click) |
| `aria-selected` | `"true"` / `"false"` | Tab trigger (ARIA standard — fires synchronously on click) |
| `data-radix-popper-content-wrapper` | _(present)_ | Portal root injected into `<body>` for floating content |
| `data-radix-select-content` | _(present)_ | Select dropdown content |
| `role="combobox"` + `aria-expanded` | `"true"` / `"false"` | Select trigger |
| `data-radix-tab-content` | _(present)_ | Tabs panel — content renders asynchronously (React 19) |

---

## Overhead Analysis

| Situation | Cost |
|---|---|
| No animations running (most cases) | `waitForRadixSettled` ≈ 1 tick; `waitForElementStable` resolves immediately → near-zero |
| Radix close animation in progress | ≤ 300 ms blocked, then resolves |
| Panel enter animation in progress | ≤ animation duration (typically 150–300 ms), capped at 3 s |
| Tab switch with React 19 async panel render | Phase 1 + Phase 2: ≤ one React work-loop tick (typically < 50 ms) |

---

## Rule of Thumb

| Situation | Fix |
|---|---|
| Random "dropdown didn't open" failures | Pre-click `waitForRadixSettled()` in `actions.click()` — already applied globally |
| "element not stable" on option click | Use `actions.clickOption()` instead of raw `locator.click()` |
| Next trigger click after a selection silently misfires | `actions.clickOption()` calls `waitForRadixSettled()` after the click — already handled |
| Radix Select trigger not getting open-animation wait | `actions.click()` now detects `aria-expanded` as well as `data-state` |
| Test redirects to listing page after a tab switch | Two-phase wait: `[aria-selected="true"]` (Phase 1) + panel landmark visible (Phase 2) |
| "Test timeout exceeded" after a Radix tab switch | Wait for a landmark panel element to be `visible` after the tab button activates |
| `fill()` throws or clears wrong element during panel animation | `fill()` now calls `waitForRadixSettled` → `waitFor visible` → `waitForElementStable` |
| `fill()` / `getText()` "element is not attached" | `fill()` uses `waitFor({ state: 'visible' })`; `getText()` uses `waitFor({ state: 'attached' })` |
| Counting picker options | Count from the hidden native `<select>`, never open the popover |
| `toBeHidden` on a conditionally rendered element | Use `.locator` not `.get()` |
| Hover-triggered Tooltip or Popover | Use `actions.hover()` |
| Closing a Radix component with keyboard | Use `actions.pressKey('Escape')` — drains the close animation automatically |
| Writing any new Radix interaction | Route trigger clicks through `actions.click()`, option clicks through `actions.clickOption()` |
| Writing any new tab-switch method | Apply the two-phase pattern: Phase 1 `[aria-selected="true"]` + Phase 2 panel landmark |
