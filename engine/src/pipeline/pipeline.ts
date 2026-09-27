import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

import { ProjectScanner } from '../analyzer/project-scanner';
import { CoverageParser } from '../analyzer/coverage-parser';
import { RiskScorer } from '../analyzer/risk-scorer';
import { TestPlanner } from '../generator/test-planner';
import { ParallelOrchestrator } from '../generator/parallel-orchestrator';
import { TestRunner } from '../runner/test-runner';
import { CoverageDiff } from '../reporter/coverage-diff';
import { CoverageData, RiskScore, GenerationResult, CoverageReport } from '../types';

export interface PipelineResult {
  projectPath: string;
  before: CoverageData[];
  after: CoverageData[];
  riskScores: RiskScore[];
  generationResults: GenerationResult[];
  runResult: { passed: number; failed: number };
  report: CoverageReport;
  outputDir: string;
  ranAt: string;
  /** Total Bobcoin cost across all Bob API calls in this pipeline run. */
  totalSessionCost: number;
}

/**
 * Runs the full TestForge pipeline against a project:
 *   analyze → generate → run tests → re-analyze → diff
 *
 * Generated test files are placed inside `<projectPath>/__testforge__/`
 * so Jest (configured in the project) can discover them.
 *
 * @param projectPath - Absolute path to the target project.
 * @param outputDir   - Where to write generated test files (default: `<projectPath>/__testforge__`).
 */
export async function runPipeline(
  projectPath: string,
  outputDir?: string,
): Promise<PipelineResult> {
  const resolvedProject = path.resolve(projectPath);
  const resolvedOutput = outputDir
    ? path.resolve(outputDir)
    : path.join(resolvedProject, '__testforge__');

  // ── 1. Before analysis ───────────────────────────────────────────────────

  // Run npm test with coverage to generate coverage-final.json
  try {
    execSync('npm test -- --coverage --coverageReporters=json --silent', {
      cwd: resolvedProject,
      stdio: 'ignore',
      timeout: 120_000,
    });
  } catch {
    // Jest exits non-zero if tests fail — that's OK, we just need the JSON.
  }

  const coverageBeforePath = path.join(resolvedProject, 'coverage', 'coverage-final.json');
  const parser = new CoverageParser();

  let beforeCoverage: CoverageData[] = [];
  if (fs.existsSync(coverageBeforePath)) {
    beforeCoverage = parser.parse(coverageBeforePath);
  }

  const scanner = new ProjectScanner();
  scanner.scan(resolvedProject);

  const riskScores: RiskScore[] = new RiskScorer().score(beforeCoverage, resolvedProject);

  // ── 2. Generate tests ────────────────────────────────────────────────────

  const plans = new TestPlanner().plan(riskScores);
  const orchestrator = new ParallelOrchestrator();
  const generationResults = await orchestrator.run(plans, resolvedOutput);

  // ── 3. Run generated tests ───────────────────────────────────────────────

  // Collect only the successfully generated test file paths
  const generatedPaths = generationResults
    .filter((r) => r.success && r.generatedPath)
    .map((r) => r.generatedPath as string);

  let runResult = { passed: 0, failed: generatedPaths.length };

  if (generatedPaths.length > 0) {
    // Run Jest in the project directory so it resolves its own config + deps
    const runner = new TestRunner();
    runner.projectDir = resolvedProject;

    // Pass relative paths to avoid regex escaping issues with backslashes
    const relPaths = generatedPaths.map((p) =>
      path.relative(resolvedProject, p).replace(/\\/g, '/'),
    );

    try {
      const result = await runner.runTests(relPaths);
      runResult = { passed: result.passed, failed: result.failed };
    } catch {
      // Runner failed to get JSON — leave default
    }
  }

  // ── 4. Re-run coverage to get "after" snapshot ───────────────────────────

  // Re-run the full test suite (original + generated) with coverage
  try {
    execSync('npm test -- --coverage --coverageReporters=json --silent', {
      cwd: resolvedProject,
      stdio: 'ignore',
      timeout: 120_000,
    });
  } catch {
    // Same as before — failures OK
  }

  let afterCoverage: CoverageData[] = [];
  if (fs.existsSync(coverageBeforePath)) {
    afterCoverage = parser.parse(coverageBeforePath);
  }

  // ── 5. Diff ──────────────────────────────────────────────────────────────

  const report = new CoverageDiff().compare(beforeCoverage, afterCoverage);

  const totalSessionCost = generationResults.reduce(
    (sum, r) => sum + (r.sessionCost ?? 0),
    0,
  );

  process.stdout.write(
    `[Pipeline] Total session cost: ${totalSessionCost.toFixed(4)} Bobcoins\n`,
  );

  return {
    projectPath: resolvedProject,
    before: beforeCoverage,
    after: afterCoverage,
    riskScores,
    generationResults,
    runResult,
    report,
    outputDir: resolvedOutput,
    ranAt: new Date().toISOString(),
    totalSessionCost,
  };
}
