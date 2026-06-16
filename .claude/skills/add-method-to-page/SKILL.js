#!/usr/bin/env node

/**
 * add-method-to-page skill
 *
 * Automates adding a new verification method to a page object by:
 * 1. Creating a locator entry in src/locators/<page>-page-locators.ts
 * 2. Adding the property declaration to src/pages/<page>-page-self-healing.ts
 * 3. Initializing the property in the constructor
 * 4. Implementing the verification method
 * 5. Ensuring the page is registered in pom-lazy-self-healing.ts
 *
 * Usage:
 *   /add-method-to-page --page ReactionClass --locator "p:has-text('Add reagent slots first')" --method "verifyAddReagentSlotsFirstHintDisplayed" --description "Hint message shown when attempting to add a step before adding reagent slots"
 */

const fs = require('fs');
const path = require('path');

// Parse CLI arguments
const args = process.argv.slice(2);
const params = {};

for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
        const key = args[i].substring(2);
        const value = args[i + 1];
        if (!value || value.startsWith('--')) {
            console.error(`Error: Missing value for --${key}`);
            process.exit(1);
        }
        params[key] = value;
        i++;
    }
}

const PAGE = params.page;
const SELECTOR = params.locator;
const METHOD_NAME = params.method;
const DESCRIPTION = params.description || 'Verification assertion';
const LOCATOR_NAME = params.locatorName || camelToKebab(METHOD_NAME).replace(/^verify-/, '');

if (!PAGE || !SELECTOR || !METHOD_NAME) {
    console.error(`
Usage:
  /add-method-to-page --page <PageName> --locator "<selector>" --method "<methodName>" [--description "<desc>"] [--locatorName "<name>"]

Examples:
  /add-method-to-page --page ReactionClass --locator "p:has-text('Add reagent slots first')" --method "verifyAddReagentSlotsFirstHintDisplayed"
  /add-method-to-page --page ReactionClass --locator "[data-testid='step-duration-input']" --method "verifyStepDurationInputVisible" --locatorName "stepDurationInput"
    `);
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

function camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

function pascalToKebab(str) {
    return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function getPageFileName(pageName) {
    return `${pascalToKebab(pageName)}-page-self-healing`;
}

function getLocatorFileName(pageName) {
    return `${pascalToKebab(pageName)}-page-locators`;
}

function findPropertyDeclarationIndex(content, propertyName) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`readonly ${propertyName}:`)) {
            return i;
        }
    }
    return -1;
}

function findConstructorInitIndex(content, propertyName) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`this.${propertyName} = `)) {
            return i;
        }
    }
    return -1;
}

function findMethodIndex(content, methodName) {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(`async ${methodName}(`)) {
            return i;
        }
    }
    return -1;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Logic
// ═══════════════════════════════════════════════════════════════════════════

try {
    const baseDir = path.resolve(__dirname, '../../');
    const locatorsDir = path.join(baseDir, 'src/locators');
    const pagesDir = path.join(baseDir, 'src/pages');

    const locatorsFile = path.join(locatorsDir, `${getLocatorFileName(PAGE)}.ts`);
    const pageFile = path.join(pagesDir, `${getPageFileName(PAGE)}.ts`);
    const pomFile = path.join(pagesDir, 'pom-lazy-self-healing.ts');

    // 1. Verify files exist
    if (!fs.existsSync(locatorsFile)) {
        console.error(`❌ Locators file not found: ${locatorsFile}`);
        process.exit(1);
    }
    if (!fs.existsSync(pageFile)) {
        console.error(`❌ Page file not found: ${pageFile}`);
        process.exit(1);
    }
    if (!fs.existsSync(pomFile)) {
        console.error(`❌ POM file not found: ${pomFile}`);
        process.exit(1);
    }

    console.log(`✓ Found locators file: ${locatorsFile}`);
    console.log(`✓ Found page file: ${pageFile}`);
    console.log(`✓ Found POM file: ${pomFile}`);
    console.log('');

    // 2. Add locator entry
    console.log(`📝 Adding locator entry: ${LOCATOR_NAME}`);
    let locatorsContent = fs.readFileSync(locatorsFile, 'utf-8');

    if (locatorsContent.includes(`${LOCATOR_NAME}:`)) {
        console.log(`  ⚠️  Locator '${LOCATOR_NAME}' already exists`);
    } else {
        // Find the closing brace of the last locator and insert before it
        const lastCommaIndex = locatorsContent.lastIndexOf(',');
        const closingIndex = locatorsContent.lastIndexOf('} satisfies');

        const locatorEntry = `

    ${LOCATOR_NAME}: {
        selector: '${SELECTOR}',
        metadata: {
            role: 'note',
            description: '${DESCRIPTION}',
        },
    },`;

        locatorsContent = locatorsContent.slice(0, closingIndex) + locatorEntry + '\n\n' + locatorsContent.slice(closingIndex);
        fs.writeFileSync(locatorsFile, locatorsContent, 'utf-8');
        console.log(`  ✓ Added locator entry`);
    }

    // 3. Add property to page object
    console.log(`\n📝 Adding property to page object: ${LOCATOR_NAME}`);
    let pageContent = fs.readFileSync(pageFile, 'utf-8');

    if (pageContent.includes(`readonly ${LOCATOR_NAME}:`)) {
        console.log(`  ⚠️  Property '${LOCATOR_NAME}' already declared`);
    } else {
        // Find a good place to add it (near the end of property declarations, before the private fields)
        const privateFieldsIndex = pageContent.indexOf('private readonly page: Page;');
        if (privateFieldsIndex === -1) {
            console.error(`  ❌ Could not find insertion point for property declaration`);
            process.exit(1);
        }

        const propertyDeclaration = `readonly ${LOCATOR_NAME}: SelfHealingLocator;\n    `;
        pageContent = pageContent.slice(0, privateFieldsIndex) + propertyDeclaration + pageContent.slice(privateFieldsIndex);
        fs.writeFileSync(pageFile, pageContent, 'utf-8');
        console.log(`  ✓ Added property declaration`);
    }

    // 4. Initialize in constructor
    console.log(`\n📝 Initializing property in constructor`);
    pageContent = fs.readFileSync(pageFile, 'utf-8');

    if (pageContent.includes(`this.${LOCATOR_NAME} =`)) {
        console.log(`  ⚠️  Property already initialized`);
    } else {
        // Find a good place to initialize (at the end of other initializations, before the closing brace)
        const constructorEnd = pageContent.lastIndexOf('}');
        const lastInitIndex = pageContent.lastIndexOf('this.', constructorEnd);
        const nextNewlineAfterLastInit = pageContent.indexOf('\n', lastInitIndex);

        const initLine = `this.${LOCATOR_NAME} = SelfHealingLocator.from(page, ${PAGE.toLowerCase()}Locators.${LOCATOR_NAME}, logger, aiProvider);\n        `;
        pageContent = pageContent.slice(0, nextNewlineAfterLastInit + 1) + initLine + pageContent.slice(nextNewlineAfterLastInit + 1);
        fs.writeFileSync(pageFile, pageContent, 'utf-8');
        console.log(`  ✓ Initialized in constructor`);
    }

    // 5. Add verification method
    console.log(`\n📝 Adding verification method: ${METHOD_NAME}`);
    pageContent = fs.readFileSync(pageFile, 'utf-8');

    if (pageContent.includes(`async ${METHOD_NAME}(`)) {
        console.log(`  ⚠️  Method '${METHOD_NAME}' already exists`);
    } else {
        const methodBody = `
    async ${METHOD_NAME}(): Promise<void> {
        await test.step('${DESCRIPTION}', async () => {
            await this.assert.toBeVisible(await this.${LOCATOR_NAME}.get(), '${DESCRIPTION}');
        });
    }`;

        // Add before the last closing brace
        const lastBraceIndex = pageContent.lastIndexOf('}');
        pageContent = pageContent.slice(0, lastBraceIndex) + methodBody + '\n' + pageContent.slice(lastBraceIndex);
        fs.writeFileSync(pageFile, pageContent, 'utf-8');
        console.log(`  ✓ Added verification method`);
    }

    // 6. Check POM registration
    console.log(`\n📝 Checking POM registration`);
    const PageClass = `${PAGE}PageSelfHealing`;
    let pomContent = fs.readFileSync(pomFile, 'utf-8');

    if (pomContent.includes(`${PageClass}`)) {
        console.log(`  ✓ Page already registered in POM`);
    } else {
        console.log(`  ⚠️  Page not registered in POM. Please run /register-page-in-pom`);
    }

    console.log(`\n✅ Successfully completed!`);
    console.log(`\n📋 Summary:`);
    console.log(`   • Locator: ${LOCATOR_NAME}`);
    console.log(`   • Selector: ${SELECTOR}`);
    console.log(`   • Method: ${METHOD_NAME}()`);
    console.log(`   • Page: ${PAGE}PageSelfHealing`);
    console.log(`\n💡 Usage in tests:`);
    console.log(`   await pomSelfHealing.${PAGE.toLowerCase()}Page.${METHOD_NAME}();`);

} catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
}
