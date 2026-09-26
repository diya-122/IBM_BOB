/**
 * @module types
 * Shared TypeScript interfaces for the TestForge engine.
 */

/**
 * Coverage metrics for a single axis (statements, branches, functions, lines).
 */
export interface CoverageMetric {
  /** Number of covered items. */
  covered: number;
  /** Total number of items. */
  total: number;
  /** Coverage percentage (0–100). Division by zero yields 100. */
  pct: number;
}

/**
 * Full coverage data for a single source file as produced by NYC/Istanbul.
 */
export interface CoverageData {
  /** Absolute path to the source file. */
  filePath: string;
  /** Statement-level coverage. */
  statements: CoverageMetric;
  /** Branch-level coverage. */
  branches: CoverageMetric;
  /** Function-level coverage. */
  functions: CoverageMetric;
  /** Line-level coverage. */
  lines: CoverageMetric;
}

/**
 * Risk scoring result for a single function in a source file.
 */
export interface RiskScore {
  /** Absolute path to the source file. */
  filePath: string;
  /** Name of the function being scored. */
  functionName: string;
  /** Cyclomatic complexity proxy (count of branching keywords). */
  complexity: number;
  /** Number of other source files that import this file. */
  importCount: number;
  /** Composite risk score: complexity × importCount. */
  riskScore: number;
  /** Current function coverage percentage for the file (0–100). */
  coveragePercent: number;
}

/**
 * A single test case specification inside a test plan.
 */
export interface TestCase {
  /** Human-readable description of what the test verifies. */
  description: string;
  /** Category of the test case. */
  type: 'happy' | 'edge' | 'error';
  /** Stringified representation of the inputs to pass to the function. */
  inputs: string;
  /** Stringified representation of the expected output or behaviour. */
  expectedOutput: string;
}

/**
 * A test plan for one function in a source file.
 */
export interface TestPlan {
  /** Absolute path to the source file under test. */
  filePath: string;
  /** Name of the function under test. */
  functionName: string;
  /** Generation priority derived from risk score. */
  priority: 'high' | 'medium' | 'low';
  /** Ordered list of test cases to generate. */
  testCases: TestCase[];
  /** Approximate number of lines the generated test file will contain. */
  estimatedLines: number;
}

/**
 * Result of generating a single test file.
 */
export interface GenerationResult {
  /** Absolute path to the source file that was targeted. */
  filePath: string;
  /** Whether generation succeeded. */
  success: boolean;
  /** Absolute path to the generated test file, if successful. */
  generatedPath?: string;
  /** Error message, if generation failed. */
  error?: string;
  /** Number of test cases written to the output file. */
  testsGenerated: number;
}

/**
 * Full before/after coverage comparison report.
 */
export interface CoverageReport {
  /** ISO-8601 timestamp of when the report was generated. */
  timestamp: string;
  /** Absolute path to the root of the project. */
  projectPath: string;
  /** Coverage data collected before test generation. */
  before: CoverageData[];
  /** Coverage data collected after test generation. */
  after: CoverageData[];
  /** Overall delta: avg(after functions pct) − avg(before functions pct). */
  delta: number;
  /** Paths of files whose function coverage improved. */
  filesImproved: string[];
  /** Fully-qualified function names that gained coverage. */
  functionsNewlyCovered: string[];
}
