export interface CoverageMetrics {
  covered: number;
  total: number;
  pct: number;
}

export interface CoverageData {
  filePath: string;
  statements: CoverageMetrics;
  branches: CoverageMetrics;
  functions: CoverageMetrics;
  lines: CoverageMetrics;
}

export interface RiskScore {
  filePath: string;
  functionName: string;
  complexity: number;
  importCount: number;
  riskScore: number;
  coveragePercent: number;
}

export interface TestCase {
  description: string;
  type: 'happy' | 'edge' | 'error';
  inputs: string[];
  expectedOutput: string;
}

export interface TestPlan {
  filePath: string;
  functionName: string;
  priority: 'high' | 'medium' | 'low';
  testCases: TestCase[];
  estimatedLines: number;
}

export interface GenerationResult {
  filePath: string;
  success: boolean;
  generatedPath?: string;
  error?: string;
  testsGenerated: number;
}

export interface CoverageReport {
  timestamp: string;
  projectPath: string;
  before: CoverageData[];
  after: CoverageData[];
  delta: number;
  filesImproved: string[];
  functionsNewlyCovered: string[];
}
