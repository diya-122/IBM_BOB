"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runPipeline = runPipeline;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const project_scanner_1 = require("../analyzer/project-scanner");
const coverage_parser_1 = require("../analyzer/coverage-parser");
const risk_scorer_1 = require("../analyzer/risk-scorer");
const test_planner_1 = require("../generator/test-planner");
const parallel_orchestrator_1 = require("../generator/parallel-orchestrator");
const test_runner_1 = require("../runner/test-runner");
const coverage_diff_1 = require("../reporter/coverage-diff");
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
async function runPipeline(projectPath, outputDir) {
    const resolvedProject = path.resolve(projectPath);
    const resolvedOutput = outputDir
        ? path.resolve(outputDir)
        : path.join(resolvedProject, '__testforge__');
    // ── 1. Before analysis ───────────────────────────────────────────────────
    // Run npm test with coverage to generate coverage-final.json
    try {
        (0, child_process_1.execSync)('npm test -- --coverage --coverageReporters=json --silent', {
            cwd: resolvedProject,
            stdio: 'ignore',
            timeout: 120000,
        });
    }
    catch {
        // Jest exits non-zero if tests fail — that's OK, we just need the JSON.
    }
    const coverageBeforePath = path.join(resolvedProject, 'coverage', 'coverage-final.json');
    const parser = new coverage_parser_1.CoverageParser();
    let beforeCoverage = [];
    if (fs.existsSync(coverageBeforePath)) {
        beforeCoverage = parser.parse(coverageBeforePath);
    }
    const scanner = new project_scanner_1.ProjectScanner();
    scanner.scan(resolvedProject);
    const riskScores = new risk_scorer_1.RiskScorer().score(beforeCoverage, resolvedProject);
    // ── 2. Generate tests ────────────────────────────────────────────────────
    const plans = new test_planner_1.TestPlanner().plan(riskScores);
    const orchestrator = new parallel_orchestrator_1.ParallelOrchestrator();
    const generationResults = await orchestrator.run(plans, resolvedOutput);
    // ── 3. Run generated tests ───────────────────────────────────────────────
    // Collect only the successfully generated test file paths
    const generatedPaths = generationResults
        .filter((r) => r.success && r.generatedPath)
        .map((r) => r.generatedPath);
    let runResult = { passed: 0, failed: generatedPaths.length };
    if (generatedPaths.length > 0) {
        // Run Jest in the project directory so it resolves its own config + deps
        const runner = new test_runner_1.TestRunner();
        runner.projectDir = resolvedProject;
        // Pass relative paths to avoid regex escaping issues with backslashes
        const relPaths = generatedPaths.map((p) => path.relative(resolvedProject, p).replace(/\\/g, '/'));
        try {
            const result = await runner.runTests(relPaths);
            runResult = { passed: result.passed, failed: result.failed };
        }
        catch {
            // Runner failed to get JSON — leave default
        }
    }
    // ── 4. Re-run coverage to get "after" snapshot ───────────────────────────
    // Re-run the full test suite (original + generated) with coverage
    try {
        (0, child_process_1.execSync)('npm test -- --coverage --coverageReporters=json --silent', {
            cwd: resolvedProject,
            stdio: 'ignore',
            timeout: 120000,
        });
    }
    catch {
        // Same as before — failures OK
    }
    let afterCoverage = [];
    if (fs.existsSync(coverageBeforePath)) {
        afterCoverage = parser.parse(coverageBeforePath);
    }
    // ── 5. Diff ──────────────────────────────────────────────────────────────
    const report = new coverage_diff_1.CoverageDiff().compare(beforeCoverage, afterCoverage);
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
    };
}
//# sourceMappingURL=pipeline.js.map