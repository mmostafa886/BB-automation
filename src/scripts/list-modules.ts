import testFilter from '../../config/testCaseFilter.js';

console.log('\n📋 Available Modules:\n');

if (testFilter.modules) {
  testFilter.modules.forEach((module, index) => {
    console.log(`${index + 1}. ${module.name}`);
    console.log(`   Description: ${module.description}`);
    console.log(`   Test Cases: ${module.testCaseIds.length} tests`);
    console.log(`   IDs: ${module.testCaseIds.slice(0, 5).join(', ')}${module.testCaseIds.length > 5 ? '...' : ''}`);
    console.log('');
  });
}

console.log('\n✅ Active Modules:');
if (testFilter.activeModules && testFilter.activeModules.length > 0) {
  testFilter.activeModules.forEach(name => {
    const module = testFilter.modules.find(m => m.name === name);
    if (module) {
      console.log(`   - ${name} (${module.testCaseIds.length} tests)`);
    }
  });
} else {
  console.log('   - ALL modules (no filter)');
}

console.log('');
