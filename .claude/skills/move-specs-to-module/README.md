# move-specs-to-module

**Category:** Test Organization
**Chains into:** polish-generated-code (optional)

## Purpose

Relocates generated spec files from one module folder to another, re-routing all POM
method calls from the source page object to the target page object. Missing methods and
locators are automatically ported so the moved specs stay valid.

## Usage

```
/move-specs-to-module
```

The skill will prompt for:
- Which spec files to move (glob or list)
- Source POM property, module tag, and describe prefix
- Target module folder, POM property, page class, locators file, tag, and describe prefix

## What it does

1. Catalogs every `pomSelfHealing.<sourcePage>.<method>()` call across the given specs
2. Diffs the catalog against the target page class — reuses existing methods where possible
3. Appends missing locators to the target locators file and wires them in the constructor
4. Ports missing method implementations from the source page class
5. Bulk-updates all spec files (module tag, describe text, POM route, method name fixes)
6. Runs `git mv` to relocate each spec to `tests/generated/<targetModule>/`
7. Verifies with `npx tsc --noEmit` and `git status`

## Key rules

- Never creates one-liner alias methods — maps spec calls to the existing equivalent name
- Never adds duplicate locators or methods
- Preserves `test.fixme` on every moved spec
- Asks for confirmation before any destructive action

## Example

Moving role-management specs from Plate-Layouts to Reagents:

```
specFiles:           tests/generated/Plate-Layouts/tc-575{2..8}-*.spec.ts
sourcePageProperty:  plateLayoutsPage
sourceModuleTag:     PlateLayout
sourceDescribePrefix: PlateLayout
targetModule:        Reagents
targetPageProperty:  reagentsPage
targetPageClass:     reagents-page-self-healing
targetLocatorsFile:  src/locators/reagents-page-locators.ts
targetModuleTag:     Reagents
targetDescribePrefix: Reagents
```
