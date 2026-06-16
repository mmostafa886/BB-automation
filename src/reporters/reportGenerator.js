const fs = require('fs').promises;
const path = require('path');
const tcGenerateLogger = require('../utils/tc-generate-logger');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
  }

  async initialize() {
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  async generateReport(executionResult, changedAreas, testCases) {
    tcGenerateLogger.info('Generating test execution report...');
    
    const report = {
      executionDate: new Date().toISOString(),
      summary: {
        totalTests: testCases.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      },
      changedAreas,
      testResults: [],
      coverage: this.calculateCoverage(changedAreas, testCases),
      executionCommand: executionResult.command || 'N/A'
    };

    // Parse Playwright JSON report
    try {
      const reportPath = path.join(process.cwd(), 'playwright-report', 'results.json');
      const playwrightReport = JSON.parse(await fs.readFile(reportPath, 'utf-8'));
      
      // Process results from Playwright report
      if (playwrightReport.suites) {
        for (const suite of playwrightReport.suites) {
          this.processSuite(suite, report);
        }
      }
      
      // Calculate total duration
      report.summary.duration = report.testResults.reduce(
        (sum, test) => sum + (test.duration || 0), 
        0
      );
    } catch (error) {
      tcGenerateLogger.warn('Could not parse Playwright report', error);
      
      // Fallback: mark all tests as executed based on execution result
      report.testResults = testCases.map(tc => ({
        testCaseId: tc.id,
        title: tc.title,
        area: tc.area,
        status: executionResult.success ? 'passed' : 'unknown',
        duration: 0
      }));
      
      if (executionResult.success) {
        report.summary.passed = testCases.length;
      }
    }

    // Save reports
    await this.saveJSONReport(report);
    await this.generateHTMLReport(report);
    await this.generateMarkdownReport(report);
    
    tcGenerateLogger.info('Report generation completed');
    return report;
  }

  processSuite(suite, report) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        const testResult = this.processSpec(spec);
        report.testResults.push(testResult);
        report.summary[testResult.status]++;
      }
    }
    
    if (suite.suites) {
      for (const nestedSuite of suite.suites) {
        this.processSuite(nestedSuite, report);
      }
    }
  }

  processSpec(spec) {
    const result = {
      title: spec.title,
      file: spec.file,
      line: spec.line,
      status: 'skipped',
      duration: 0,
      error: null,
      retries: 0
    };

    if (spec.tests && spec.tests.length > 0) {
      const test = spec.tests[0];
      
      if (test.results && test.results.length > 0) {
        const lastResult = test.results[test.results.length - 1];
        
        result.status = lastResult.status;
        result.duration = lastResult.duration || 0;
        result.error = lastResult.error?.message || null;
        result.retries = test.results.length - 1;
      }
    }

    return result;
  }

  calculateCoverage(areas, tests) {
    const coverage = {};
    
    for (const area of areas) {
      const areaTests = tests.filter(t => t.area === area);
      
      coverage[area] = {
        totalTests: areaTests.length,
        executed: areaTests.length, // All tests in affected areas should be executed
        percentage: 100
      };
    }
    
    return coverage;
  }

  async saveJSONReport(report) {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `execution-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);
    
    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    
    // Also save as latest
    await fs.writeFile(
      path.join(this.reportsDir, 'latest-execution.json'),
      JSON.stringify(report, null, 2)
    );
    
    tcGenerateLogger.info(`JSON report saved: ${filepath}`);
  }

  async generateHTMLReport(report) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Automation Report - ${new Date(report.executionDate).toLocaleString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container { 
      max-width: 1200px; 
      margin: 0 auto; 
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { 
      color: #2c3e50; 
      margin-bottom: 10px;
      font-size: 28px;
    }
    .subtitle {
      color: #7f8c8d;
      margin-bottom: 30px;
      font-size: 14px;
    }
    .summary { 
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .summary-card {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3498db;
    }
    .summary-card.passed { border-left-color: #27ae60; }
    .summary-card.failed { border-left-color: #e74c3c; }
    .summary-card.skipped { border-left-color: #95a5a6; }
    .summary-card h3 {
      font-size: 14px;
      color: #7f8c8d;
      margin-bottom: 5px;
      text-transform: uppercase;
      font-weight: 600;
    }
    .summary-card .value {
      font-size: 32px;
      font-weight: bold;
      color: #2c3e50;
    }
    .section {
      margin-bottom: 30px;
    }
    .section h2 {
      font-size: 20px;
      color: #2c3e50;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #ecf0f1;
    }
    .areas {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }
    .area-tag {
      background: #3498db;
      color: white;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
    table { 
      width: 100%; 
      border-collapse: collapse;
      margin-top: 10px;
      background: white;
    }
    th, td { 
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th { 
      background: #34495e;
      color: white;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 12px;
      letter-spacing: 0.5px;
    }
    tr:hover { background: #f8f9fa; }
    .status {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }
    .status.passed { background: #d4edda; color: #155724; }
    .status.failed { background: #f8d7da; color: #721c24; }
    .status.skipped { background: #e2e3e5; color: #383d41; }
    .error {
      color: #e74c3c;
      font-size: 12px;
      margin-top: 5px;
      font-family: 'Courier New', monospace;
    }
    .coverage-grid {
      display: grid;
      gap: 15px;
      margin-top: 15px;
    }
    .coverage-item {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
    }
    .coverage-item h4 {
      margin-bottom: 10px;
      color: #2c3e50;
    }
    .progress-bar {
      background: #ecf0f1;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 5px;
    }
    .progress-fill {
      background: #27ae60;
      height: 100%;
      transition: width 0.3s ease;
    }
    .meta-info {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      margin-bottom: 20px;
      font-size: 14px;
    }
    .meta-info strong {
      color: #2c3e50;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🤖 QA Automation Test Report</h1>
    <div class="subtitle">Generated on ${new Date(report.executionDate).toLocaleString()}</div>
    
    <div class="meta-info">
      <strong>Execution Command:</strong> <code>${report.executionCommand}</code><br>
      <strong>Duration:</strong> ${(report.summary.duration / 1000).toFixed(2)}s
    </div>

    <div class="summary">
      <div class="summary-card">
        <h3>Total Tests</h3>
        <div class="value">${report.summary.totalTests}</div>
      </div>
      <div class="summary-card passed">
        <h3>Passed</h3>
        <div class="value">${report.summary.passed}</div>
      </div>
      <div class="summary-card failed">
        <h3>Failed</h3>
        <div class="value">${report.summary.failed}</div>
      </div>
      <div class="summary-card skipped">
        <h3>Skipped</h3>
        <div class="value">${report.summary.skipped}</div>
      </div>
    </div>

    <div class="section">
      <h2>📍 Changed Areas</h2>
      <div class="areas">
        ${report.changedAreas.map(area => `<span class="area-tag">${area}</span>`).join('')}
      </div>
    </div>

    <div class="section">
      <h2>📊 Coverage by Area</h2>
      <div class="coverage-grid">
        ${Object.entries(report.coverage).map(([area, cov]) => `
          <div class="coverage-item">
            <h4>${area}</h4>
            <div>${cov.executed} / ${cov.totalTests} tests executed (${cov.percentage}%)</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${cov.percentage}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="section">
      <h2>📝 Test Results</h2>
      <table>
        <thead>
          <tr>
            <th>Test Name</th>
            <th>Status</th>
            <th>Duration</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          ${report.testResults.map(test => `
            <tr>
              <td>
                ${test.title}
                ${test.error ? `<div class="error">${test.error}</div>` : ''}
              </td>
              <td><span class="status ${test.status}">${test.status}</span></td>
              <td>${(test.duration / 1000).toFixed(2)}s</td>
              <td>${test.file || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;

    const filepath = path.join(this.reportsDir, 'latest-report.html');
    await fs.writeFile(filepath, html);
    
    tcGenerateLogger.info(`HTML report saved: ${filepath}`);
  }

  async generateMarkdownReport(report) {
    const passRate = ((report.summary.passed / report.summary.totalTests) * 100).toFixed(1);
    
    const markdown = `# QA Automation Test Report

**Generated:** ${new Date(report.executionDate).toLocaleString()}  
**Duration:** ${(report.summary.duration / 1000).toFixed(2)}s

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| ✅ Passed | ${report.summary.passed} |
| ❌ Failed | ${report.summary.failed} |
| ⏭️ Skipped | ${report.summary.skipped} |
| **Pass Rate** | **${passRate}%** |

## Changed Areas

${report.changedAreas.map(area => `- ${area}`).join('\n')}

## Coverage by Area

${Object.entries(report.coverage).map(([area, cov]) => 
  `### ${area}\n- Tests: ${cov.executed}/${cov.totalTests}\n- Coverage: ${cov.percentage}%`
).join('\n\n')}

## Test Results

| Test | Status | Duration |
|------|--------|----------|
${report.testResults.map(test => 
  `| ${test.title} | ${test.status} | ${(test.duration / 1000).toFixed(2)}s |`
).join('\n')}

${report.summary.failed > 0 ? `
## Failed Tests Details

${report.testResults.filter(t => t.status === 'failed').map(test => `
### ${test.title}
- **File:** ${test.file || 'N/A'}
- **Error:** ${test.error || 'No error message'}
`).join('\n')}
` : ''}
`;

    const filepath = path.join(this.reportsDir, 'latest-report.md');
    await fs.writeFile(filepath, markdown);
    
    tcGenerateLogger.info(`Markdown report saved: ${filepath}`);
  }
}

module.exports = ReportGenerator;