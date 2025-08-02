/**
 * Integration test runner
 * Unified runner for all integration tests with report generation
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  errors: string[];
}

interface TestReport {
  timestamp: string;
  environment: string;
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  totalDuration: number;
  suites: TestResult[];
  success: boolean;
}

class IntegrationTestRunner {
  private testSuites = [
    'swapCoordinator.test.ts',
    'api.test.ts', 
    'clientSecretIntegration.test.ts',
    'e2eSwapFlow.test.ts',
  ];

  private reportDir = join(process.cwd(), 'test-reports');

  constructor() {
    // Ensure report directory exists
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Run a single test suite
   */
  async runTestSuite(suiteFile: string): Promise<TestResult> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const suiteName = suiteFile.replace('.test.ts', '');
      
      console.log(`\n🧪 Running ${suiteName} tests...`);
      
      const testProcess = spawn('bun', ['test', suiteFile], {
        cwd: join(process.cwd(), 'tests/integration'),
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let errorOutput = '';

      testProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      testProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      testProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        // Parse test results
        const result = this.parseTestOutput(output, errorOutput, suiteName, duration);
        
        if (code === 0) {
          console.log(`✅ ${suiteName}: ${result.passed} passed, ${result.failed} failed (${duration}ms)`);
        } else {
          console.log(`❌ ${suiteName}: ${result.passed} passed, ${result.failed} failed (${duration}ms)`);
        }
        
        resolve(result);
      });

      testProcess.on('error', (error) => {
        console.error(`Failed to run ${suiteName}:`, error);
        reject(error);
      });
    });
  }

  /**
   * Parse test output
   */
  private parseTestOutput(output: string, errorOutput: string, suiteName: string, duration: number): TestResult {
    // Simplified output parsing - more complex parsing logic needed in actual projects
    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);
    const skipMatch = output.match(/(\d+) skipped/);
    
    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;
    const skipped = skipMatch ? parseInt(skipMatch[1]) : 0;
    
    const errors: string[] = [];
    if (errorOutput) {
      errors.push(errorOutput);
    }
    
    // Extract error information from output
    const errorLines = output.split('\n').filter(line => 
      line.includes('Error:') || line.includes('Failed:') || line.includes('AssertionError')
    );
    errors.push(...errorLines);

    return {
      suite: suiteName,
      passed,
      failed,
      skipped,
      duration,
      errors,
    };
  }

  /**
   * Run all test suites
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🚀 Starting Integration Test Suite');
    console.log('=====================================');
    
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    // Run tests serially to avoid resource conflicts
    for (const suite of this.testSuites) {
      try {
        const result = await this.runTestSuite(suite);
        results.push(result);
      } catch (error) {
        console.error(`Failed to run test suite ${suite}:`, error);
        results.push({
          suite: suite.replace('.test.ts', ''),
          passed: 0,
          failed: 1,
          skipped: 0,
          duration: 0,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
        });
      }
    }
    
    const totalDuration = Date.now() - startTime;
    
    // Aggregate results
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      totalTests: results.reduce((sum, r) => sum + r.passed + r.failed + r.skipped, 0),
      totalPassed: results.reduce((sum, r) => sum + r.passed, 0),
      totalFailed: results.reduce((sum, r) => sum + r.failed, 0),
      totalSkipped: results.reduce((sum, r) => sum + r.skipped, 0),
      totalDuration,
      suites: results,
      success: results.every(r => r.failed === 0),
    };
    
    // Generate reports
    await this.generateReports(report);
    
    return report;
  }

  /**
   * Generate test reports
   */
  private async generateReports(report: TestReport): Promise<void> {
    // JSON report
    const jsonReport = JSON.stringify(report, null, 2);
    writeFileSync(join(this.reportDir, 'integration-test-report.json'), jsonReport);
    
    // HTML report
    const htmlReport = this.generateHtmlReport(report);
    writeFileSync(join(this.reportDir, 'integration-test-report.html'), htmlReport);
    
    // Console summary
    this.printSummary(report);
  }

  /**
   * Generate HTML report
   */
  private generateHtmlReport(report: TestReport): string {
    const statusColor = report.success ? '#28a745' : '#dc3545';
    const statusText = report.success ? 'PASSED' : 'FAILED';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Integration Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
        .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: center; }
        .metric-value { font-size: 32px; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .suite { border: 1px solid #dee2e6; border-radius: 5px; margin: 10px 0; }
        .suite-header { background: #f8f9fa; padding: 15px; border-bottom: 1px solid #dee2e6; }
        .suite-name { font-weight: bold; font-size: 18px; }
        .suite-stats { color: #6c757d; margin-top: 5px; }
        .errors { background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 3px; padding: 10px; margin: 10px 0; }
        .error { font-family: monospace; font-size: 12px; color: #721c24; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Integration Test Report</h1>
        <div class="status">${statusText}</div>
        <p>Generated: ${report.timestamp}</p>
        <p>Environment: ${report.environment}</p>
        <p>Duration: ${(report.totalDuration / 1000).toFixed(2)}s</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${report.totalTests}</div>
            <div class="metric-label">Total Tests</div>
        </div>
        <div class="metric">
            <div class="metric-value passed">${report.totalPassed}</div>
            <div class="metric-label">Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value failed">${report.totalFailed}</div>
            <div class="metric-label">Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value skipped">${report.totalSkipped}</div>
            <div class="metric-label">Skipped</div>
        </div>
    </div>
    
    <h2>Test Suites</h2>
    ${report.suites.map(suite => `
        <div class="suite">
            <div class="suite-header">
                <div class="suite-name">${suite.suite}</div>
                <div class="suite-stats">
                    <span class="passed">${suite.passed} passed</span>, 
                    <span class="failed">${suite.failed} failed</span>, 
                    <span class="skipped">${suite.skipped} skipped</span>
                    - ${(suite.duration / 1000).toFixed(2)}s
                </div>
            </div>
            ${suite.errors.length > 0 ? `
                <div class="errors">
                    <strong>Errors:</strong>
                    ${suite.errors.map(error => `<div class="error">${error}</div>`).join('')}
                </div>
            ` : ''}
        </div>
    `).join('')}
</body>
</html>`;
  }

  /**
   * Print test summary
   */
  private printSummary(report: TestReport): void {
    console.log('\n📊 Test Summary');
    console.log('================');
    console.log(`Status: ${report.success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Passed: ${report.totalPassed}`);
    console.log(`Failed: ${report.totalFailed}`);
    console.log(`Skipped: ${report.totalSkipped}`);
    console.log(`Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
    
    console.log('\n📁 Test Reports:');
    console.log(`JSON: ${join(this.reportDir, 'integration-test-report.json')}`);
    console.log(`HTML: ${join(this.reportDir, 'integration-test-report.html')}`);
    
    if (!report.success) {
      console.log('\n❌ Failed Suites:');
      report.suites.filter(s => s.failed > 0).forEach(suite => {
        console.log(`  • ${suite.suite}: ${suite.failed} failed`);
        if (suite.errors.length > 0) {
          suite.errors.slice(0, 3).forEach(error => {
            console.log(`    - ${error.slice(0, 100)}...`);
          });
        }
      });
    }
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const runner = new IntegrationTestRunner();
  
  try {
    const report = await runner.runAllTests();
    
    // Set exit code based on test results
    process.exit(report.success ? 0 : 1);
  } catch (error) {
    console.error('Test runner failed:', error);
    process.exit(1);
  }
}

// Execute tests if this file is run directly
if (require.main === module) {
  main();
}

export { IntegrationTestRunner, TestResult, TestReport };