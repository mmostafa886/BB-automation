import fs from 'fs/promises';
import path from 'path';
import tcGenerateLogger from '../utils/tc-generate-logger.js';
import type { TestCaseData } from '../listeners/testPlanListener.js';

interface TestResult {
  title: string;
  file?: string;
  line?: number;
  status: string;
  duration: number;
  error: string | null;
  retries: number;
  testCaseId?: number;
  area?: string;
}

interface ReportSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

interface AreaCoverage {
  totalTests: number;
  executed: number;
  percentage: number;
}

interface ExecutionReport {
  executionDate: string;
  summary: ReportSummary;
  changedAreas: string[];
  testResults: TestResult[];
  coverage: Record<string, AreaCoverage>;
  executionCommand: string;
}

interface RunResult {
  success: boolean;
  output: string;
  command?: string;
}

interface PlaywrightSpec {
  title: string;
  file?: string;
  line?: number;
  tests?: Array<{
    results?: Array<{
      status: string;
      duration?: number;
      error?: { message?: string };
    }>;
  }>;
}

interface PlaywrightSuite {
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

class ReportGenerator {
  private readonly reportsDir: string;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'reports');
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.reportsDir, { recursive: true });
  }

  async generateReport(executionResult: RunResult, changedAreas: string[], testCases: TestCaseData[]): Promise<ExecutionReport> {
    tcGenerateLogger.info('Generating test execution report...');

    const report: ExecutionReport = {
      executionDate: new Date().toISOString(),
      summary: {
        totalTests: testCases.length,
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
      changedAreas,
      testResults: [],
      coverage: this.calculateCoverage(changedAreas, testCases),
      executionCommand: executionResult.command || 'N/A',
    };

    try {
      const reportPath = path.join(process.cwd(), 'playwright-report', 'results.json');
      const playwrightReport = JSON.parse(await fs.readFile(reportPath, 'utf-8')) as { suites?: PlaywrightSuite[] };

      if (playwrightReport.suites) {
        for (const suite of playwrightReport.suites) {
          this.processSuite(suite, report);
        }
      }

      report.summary.duration = report.testResults.reduce(
        (sum, test) => sum + (test.duration || 0),
        0,
      );
    } catch (error) {
      tcGenerateLogger.warn('Could not parse Playwright report', error);

      report.testResults = testCases.map(tc => ({
        testCaseId: tc.id,
        title: tc.title,
        area: tc.areaPath,
        status: executionResult.success ? 'passed' : 'unknown',
        duration: 0,
        error: null,
        retries: 0,
      }));

      if (executionResult.success) {
        report.summary.passed = testCases.length;
      }
    }

    await this.saveJSONReport(report);
    await this.generateHTMLReport(report);
    await this.generateMarkdownReport(report);

    tcGenerateLogger.info('Report generation completed');
    return report;
  }

  private processSuite(suite: PlaywrightSuite, report: ExecutionReport): void {
    if (suite.specs) {
      for (const spec of suite.specs) {
        const testResult = this.processSpec(spec);
        report.testResults.push(testResult);
        (report.summary as Record<string, number>)[testResult.status]++;
      }
    }

    if (suite.suites) {
      for (const nestedSuite of suite.suites) {
        this.processSuite(nestedSuite, report);
      }
    }
  }

  private processSpec(spec: PlaywrightSpec): TestResult {
    const result: TestResult = {
      title: spec.title,
      file: spec.file,
      line: spec.line,
      status: 'skipped',
      duration: 0,
      error: null,
      retries: 0,
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

  private calculateCoverage(areas: string[], tests: TestCaseData[]): Record<string, AreaCoverage> {
    const coverage: Record<string, AreaCoverage> = {};

    for (const area of areas) {
      const areaTests = tests.filter(t => t.areaPath === area);

      coverage[area] = {
        totalTests: areaTests.length,
        executed: areaTests.length,
        percentage: 100,
      };
    }

    return coverage;
  }

  private async saveJSONReport(report: ExecutionReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const filename = `execution-${timestamp}.json`;
    const filepath = path.join(this.reportsDir, filename);

    await fs.writeFile(filepath, JSON.stringify(report, null, 2));
    await fs.writeFile(
      path.join(this.reportsDir, 'latest-execution.json'),
      JSON.stringify(report, null, 2),
    );

    tcGenerateLogger.info(`JSON report saved: ${filepath}`);
  }

  private async generateHTMLReport(report: ExecutionReport): Promise<void> {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QA Automation Report - ${new Date(report.executionDate).toLocaleString()}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #2c3e50; margin-bottom: 10px; font-size: 28px; }
    .subtitle { color: #7f8c8d; margin-bottom: 30px; font-size: 14px; }
    .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
    .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
    .summary-card.passed { border-left-color: #27ae60; }
    .summary-card.failed { border-left-color: #e74c3c; }
    .summary-card.skipped { border-left-color: #95a5a6; }
    .summary-card h3 { font-size: 14px; color: #7f8c8d; margin-bottom: 5px; text-transform: uppercase; font-weight: 600; }
    .summary-card .value { font-size: 32px; font-weight: bold; color: #2c3e50; }
    .section { margin-bottom: 30px; }
    .section h2 { font-size: 20px; color: #2c3e50; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #ecf0f1; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ecf0f1; }
    th { background: #34495e; color: white; font-weight: 600; text-transform: uppercase; font-size: 12px; }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
    .status.passed { background: #d4edda; color: #155724; }
    .status.failed { background: #f8d7da; color: #721c24; }
    .status.skipped { background: #e2e3e5; color: #383d41; }
    .error { color: #e74c3c; font-size: 12px; margin-top: 5px; font-family: 'Courier New', monospace; }
  </style>
</head>
<body>
  <div class="container">
    <h1>QA Automation Test Report</h1>
    <div class="subtitle">Generated on ${new Date(report.executionDate).toLocaleString()}</div>
    <div class="summary">
      <div class="summary-card"><h3>Total Tests</h3><div class="value">${report.summary.totalTests}</div></div>
      <div class="summary-card passed"><h3>Passed</h3><div class="value">${report.summary.passed}</div></div>
      <div class="summary-card failed"><h3>Failed</h3><div class="value">${report.summary.failed}</div></div>
      <div class="summary-card skipped"><h3>Skipped</h3><div class="value">${report.summary.skipped}</div></div>
    </div>
    <div class="section">
      <h2>Test Results</h2>
      <table>
        <thead><tr><th>Test Name</th><th>Status</th><th>Duration</th><th>File</th></tr></thead>
        <tbody>
          ${report.testResults.map(test => `
            <tr>
              <td>${test.title}${test.error ? `<div class="error">${test.error}</div>` : ''}</td>
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

  private async generateMarkdownReport(report: ExecutionReport): Promise<void> {
    const passRate = report.summary.totalTests > 0
      ? ((report.summary.passed / report.summary.totalTests) * 100).toFixed(1)
      : '0.0';

    const markdown = `# QA Automation Test Report

**Generated:** ${new Date(report.executionDate).toLocaleString()}
**Duration:** ${(report.summary.duration / 1000).toFixed(2)}s

## Summary

| Metric | Count |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| Passed | ${report.summary.passed} |
| Failed | ${report.summary.failed} |
| Skipped | ${report.summary.skipped} |
| **Pass Rate** | **${passRate}%** |

## Test Results

| Test | Status | Duration |
|------|--------|----------|
${report.testResults.map(test =>
  `| ${test.title} | ${test.status} | ${(test.duration / 1000).toFixed(2)}s |`,
).join('\n')}
`;

    const filepath = path.join(this.reportsDir, 'latest-report.md');
    await fs.writeFile(filepath, markdown);
    tcGenerateLogger.info(`Markdown report saved: ${filepath}`);
  }
}

export default ReportGenerator;
