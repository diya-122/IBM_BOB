#!/usr/bin/env node
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const project_scanner_1 = require("./analyzer/project-scanner");
const coverage_parser_1 = require("./analyzer/coverage-parser");
const risk_scorer_1 = require("./analyzer/risk-scorer");
const test_planner_1 = require("./generator/test-planner");
const parallel_orchestrator_1 = require("./generator/parallel-orchestrator");
const coverage_diff_1 = require("./reporter/coverage-diff");
const markdown_reporter_1 = require("./reporter/markdown-reporter");
const program = new commander_1.Command();
program
    .name('testforge')
    .version('0.1.0')
    .description('TestForge — intelligent test generation and coverage analysis');
// ---------------------------------------------------------------------------
// analyze <projectPath>
// ---------------------------------------------------------------------------
program
    .command('analyze <projectPath>')
    .description('Scan a project, parse coverage data, score risk, and write a JSON analysis report')
    .option('--output <file>', 'Path to write the JSON analysis output', 'coverage-analysis.json')
    .action(async (projectPath, options) => {
    console.log(chalk_1.default.bold.cyan('\n▶ TestForge — Analyze\n'));
    const resolvedProject = path.resolve(projectPath);
    // 1. Scan project
    process.stdout.write(chalk_1.default.cyan('  Scanning project…  '));
    const scanner = new project_scanner_1.ProjectScanner();
    const scanResult = scanner.scan(resolvedProject);
    console.log(chalk_1.default.green(`✔  ${scanResult.sourceFiles.length} source file(s), ${scanResult.testFiles.length} test file(s), framework: ${scanResult.framework}`));
    // 2. Parse coverage
    const coveragePath = path.join(resolvedProject, 'coverage', 'coverage-final.json');
    let coverageData = [];
    if (fs.existsSync(coveragePath)) {
        process.stdout.write(chalk_1.default.cyan('  Parsing coverage… '));
        const parser = new coverage_parser_1.CoverageParser();
        coverageData = parser.parse(coveragePath);
        console.log(chalk_1.default.green(`✔  ${coverageData.length} file(s) parsed`));
    }
    else {
        console.log(chalk_1.default.yellow(`  ⚠  Coverage file not found at ${coveragePath} — skipping coverage parse`));
    }
    // 3. Score risk
    process.stdout.write(chalk_1.default.cyan('  Scoring risk…     '));
    const scorer = new risk_scorer_1.RiskScorer();
    const riskScores = scorer.score(coverageData, resolvedProject);
    console.log(chalk_1.default.green(`✔  ${riskScores.length} function(s) scored`));
    // 4. Write output
    const outputPath = path.resolve(options.output);
    const outputData = { scanResult, coverageData, riskScores };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(chalk_1.default.green(`\n  ✔ Analysis written to ${outputPath}`));
    // 5. Summary table
    console.log(chalk_1.default.bold('\n  Top 5 high-risk functions:'));
    console.log(chalk_1.default.dim('  ─────────────────────────────────────────────────────────'));
    const top5 = riskScores.slice(0, 5);
    if (top5.length === 0) {
        console.log(chalk_1.default.dim('  (none — all functions are covered)'));
    }
    else {
        for (const rs of top5) {
            const shortPath = path.relative(resolvedProject, rs.filePath);
            console.log(chalk_1.default.white(`  ${rs.functionName.padEnd(30)} `) +
                chalk_1.default.yellow(`risk: ${String(rs.riskScore).padStart(4)} `) +
                chalk_1.default.dim(`[${shortPath}]`));
        }
    }
    console.log('');
});
// ---------------------------------------------------------------------------
// generate <projectPath>
// ---------------------------------------------------------------------------
program
    .command('generate <projectPath>')
    .description('Generate test files from a JSON test plan')
    .option('--plan <file>', 'Path to the JSON test plan file', 'coverage-analysis.json')
    .option('--output-dir <dir>', 'Directory to write generated tests', 'generated-tests')
    .action(async (projectPath, options) => {
    console.log(chalk_1.default.bold.cyan('\n▶ TestForge — Generate\n'));
    const planPath = path.resolve(options.plan);
    if (!fs.existsSync(planPath)) {
        console.error(chalk_1.default.red(`  ✖ Plan file not found: ${planPath}`));
        process.exit(1);
    }
    let plans;
    try {
        const raw = fs.readFileSync(planPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            plans = parsed;
        }
        else if (parsed.riskScores) {
            const planner = new test_planner_1.TestPlanner();
            plans = planner.plan(parsed.riskScores);
        }
        else {
            console.error(chalk_1.default.red('  ✖ Plan file must contain either an array of TestPlan objects or an object with a riskScores array'));
            process.exit(1);
        }
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(chalk_1.default.red(`  ✖ Failed to parse plan file: ${message}`));
        process.exit(1);
    }
    const outputDir = path.resolve(options.outputDir);
    console.log(chalk_1.default.cyan(`  Generating ${plans.length} test plan(s) → ${outputDir}\n`));
    const orchestrator = new parallel_orchestrator_1.ParallelOrchestrator();
    const results = await orchestrator.run(plans, outputDir);
    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log('');
    console.log(chalk_1.default.bold('  Results:'));
    console.log(chalk_1.default.green(`  ✔ ${succeeded} test file(s) generated successfully`));
    if (failed > 0) {
        console.log(chalk_1.default.red(`  ✖ ${failed} test file(s) failed`));
        for (const r of results.filter((res) => !res.success)) {
            console.log(chalk_1.default.red(`    • ${r.filePath}: ${r.error ?? 'unknown error'}`));
        }
    }
    console.log('');
});
// ---------------------------------------------------------------------------
// report <projectPath>
// ---------------------------------------------------------------------------
program
    .command('report <projectPath>')
    .description('Generate a Markdown coverage diff report')
    .option('--before <file>', 'Path to the before coverage JSON')
    .option('--after <file>', 'Path to the after coverage JSON')
    .option('--output <file>', 'Path to write the Markdown report', 'coverage-report.md')
    .action(async (projectPath, options) => {
    console.log(chalk_1.default.bold.cyan('\n▶ TestForge — Report\n'));
    const parser = new coverage_parser_1.CoverageParser();
    const resolveOrDefault = (optPath, defaultName) => path.resolve(optPath ?? path.join(projectPath, defaultName));
    const beforePath = resolveOrDefault(options.before, path.join('coverage', 'coverage-final.json'));
    const afterPath = resolveOrDefault(options.after, path.join('coverage-after', 'coverage-final.json'));
    if (!fs.existsSync(beforePath)) {
        console.error(chalk_1.default.red(`  ✖ Before coverage file not found: ${beforePath}`));
        process.exit(1);
    }
    if (!fs.existsSync(afterPath)) {
        console.error(chalk_1.default.red(`  ✖ After coverage file not found: ${afterPath}`));
        process.exit(1);
    }
    process.stdout.write(chalk_1.default.cyan('  Parsing before coverage…  '));
    const beforeData = parser.parse(beforePath);
    console.log(chalk_1.default.green('✔'));
    process.stdout.write(chalk_1.default.cyan('  Parsing after coverage…   '));
    const afterData = parser.parse(afterPath);
    console.log(chalk_1.default.green('✔'));
    process.stdout.write(chalk_1.default.cyan('  Computing diff…           '));
    const diff = new coverage_diff_1.CoverageDiff();
    const report = diff.compare(beforeData, afterData);
    console.log(chalk_1.default.green('✔'));
    const markdown = new markdown_reporter_1.MarkdownReporter().generate(report);
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, markdown, 'utf-8');
    const deltaSign = report.delta >= 0 ? '+' : '';
    console.log(chalk_1.default.green(`\n  ✔ Report written to ${outputPath}`));
    console.log(chalk_1.default.cyan(`  Coverage delta: ${deltaSign}${report.delta.toFixed(2)}%`));
    console.log(chalk_1.default.cyan(`  Files improved: ${report.filesImproved.length}`));
    console.log(chalk_1.default.cyan(`  Functions newly covered: ${report.functionsNewlyCovered.length}`));
    console.log('');
});
program.parse(process.argv);
//# sourceMappingURL=index.js.map