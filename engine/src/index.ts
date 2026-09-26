#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';

import { ProjectScanner } from './analyzer/project-scanner';
import { CoverageParser } from './analyzer/coverage-parser';
import { RiskScorer } from './analyzer/risk-scorer';
import { TestPlanner } from './generator/test-planner';
import { ParallelOrchestrator } from './generator/parallel-orchestrator';
import { CoverageDiff } from './reporter/coverage-diff';
import { MarkdownReporter } from './reporter/markdown-reporter';
import { RiskScore, TestPlan, GenerationResult, CoverageData } from './types';

const program = new Command();

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
  .action(async (projectPath: string, options: { output: string }) => {
    console.log(chalk.bold.cyan('\n▶ TestForge — Analyze\n'));

    const resolvedProject = path.resolve(projectPath);

    // 1. Scan project
    process.stdout.write(chalk.cyan('  Scanning project…  '));
    const scanner = new ProjectScanner();
    const scanResult = scanner.scan(resolvedProject);
    console.log(chalk.green(`✔  ${scanResult.sourceFiles.length} source file(s), ${scanResult.testFiles.length} test file(s), framework: ${scanResult.framework}`));

    // 2. Parse coverage
    const coveragePath = path.join(resolvedProject, 'coverage', 'coverage-final.json');
    let coverageData: CoverageData[] = [];

    if (fs.existsSync(coveragePath)) {
      process.stdout.write(chalk.cyan('  Parsing coverage… '));
      const parser = new CoverageParser();
      coverageData = parser.parse(coveragePath);
      console.log(chalk.green(`✔  ${coverageData.length} file(s) parsed`));
    } else {
      console.log(chalk.yellow(`  ⚠  Coverage file not found at ${coveragePath} — skipping coverage parse`));
    }

    // 3. Score risk
    process.stdout.write(chalk.cyan('  Scoring risk…     '));
    const scorer = new RiskScorer();
    const riskScores: RiskScore[] = scorer.score(coverageData, resolvedProject);
    console.log(chalk.green(`✔  ${riskScores.length} function(s) scored`));

    // 4. Write output
    const outputPath = path.resolve(options.output);
    const outputData = { scanResult, coverageData, riskScores };
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2), 'utf-8');
    console.log(chalk.green(`\n  ✔ Analysis written to ${outputPath}`));

    // 5. Summary table
    console.log(chalk.bold('\n  Top 5 high-risk functions:'));
    console.log(chalk.dim('  ─────────────────────────────────────────────────────────'));
    const top5 = riskScores.slice(0, 5);
    if (top5.length === 0) {
      console.log(chalk.dim('  (none — all functions are covered)'));
    } else {
      for (const rs of top5) {
        const shortPath = path.relative(resolvedProject, rs.filePath);
        console.log(
          chalk.white(`  ${rs.functionName.padEnd(30)} `) +
          chalk.yellow(`risk: ${String(rs.riskScore).padStart(4)} `) +
          chalk.dim(`[${shortPath}]`),
        );
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
  .action(async (projectPath: string, options: { plan: string; outputDir: string }) => {
    console.log(chalk.bold.cyan('\n▶ TestForge — Generate\n'));

    const planPath = path.resolve(options.plan);

    if (!fs.existsSync(planPath)) {
      console.error(chalk.red(`  ✖ Plan file not found: ${planPath}`));
      process.exit(1);
    }

    let plans: TestPlan[];
    try {
      const raw = fs.readFileSync(planPath, 'utf-8');
      const parsed = JSON.parse(raw) as { riskScores?: RiskScore[] } | TestPlan[];

      if (Array.isArray(parsed)) {
        plans = parsed as TestPlan[];
      } else if (parsed.riskScores) {
        const planner = new TestPlanner();
        plans = planner.plan(parsed.riskScores);
      } else {
        console.error(chalk.red('  ✖ Plan file must contain either an array of TestPlan objects or an object with a riskScores array'));
        process.exit(1);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`  ✖ Failed to parse plan file: ${message}`));
      process.exit(1);
    }

    const outputDir = path.resolve(options.outputDir);
    console.log(chalk.cyan(`  Generating ${plans.length} test plan(s) → ${outputDir}\n`));

    const orchestrator = new ParallelOrchestrator();
    const results: GenerationResult[] = await orchestrator.run(plans, outputDir);

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log('');
    console.log(chalk.bold('  Results:'));
    console.log(chalk.green(`  ✔ ${succeeded} test file(s) generated successfully`));
    if (failed > 0) {
      console.log(chalk.red(`  ✖ ${failed} test file(s) failed`));
      for (const r of results.filter((res) => !res.success)) {
        console.log(chalk.red(`    • ${r.filePath}: ${r.error ?? 'unknown error'}`));
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
  .action(async (
    projectPath: string,
    options: { before?: string; after?: string; output: string },
  ) => {
    console.log(chalk.bold.cyan('\n▶ TestForge — Report\n'));

    const parser = new CoverageParser();

    const resolveOrDefault = (optPath: string | undefined, defaultName: string): string =>
      path.resolve(optPath ?? path.join(projectPath, defaultName));

    const beforePath = resolveOrDefault(options.before, path.join('coverage', 'coverage-final.json'));
    const afterPath = resolveOrDefault(options.after, path.join('coverage-after', 'coverage-final.json'));

    if (!fs.existsSync(beforePath)) {
      console.error(chalk.red(`  ✖ Before coverage file not found: ${beforePath}`));
      process.exit(1);
    }
    if (!fs.existsSync(afterPath)) {
      console.error(chalk.red(`  ✖ After coverage file not found: ${afterPath}`));
      process.exit(1);
    }

    process.stdout.write(chalk.cyan('  Parsing before coverage…  '));
    const beforeData = parser.parse(beforePath);
    console.log(chalk.green('✔'));

    process.stdout.write(chalk.cyan('  Parsing after coverage…   '));
    const afterData = parser.parse(afterPath);
    console.log(chalk.green('✔'));

    process.stdout.write(chalk.cyan('  Computing diff…           '));
    const diff = new CoverageDiff();
    const report = diff.compare(beforeData, afterData);
    console.log(chalk.green('✔'));

    const markdown = new MarkdownReporter().generate(report);
    const outputPath = path.resolve(options.output);
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    const deltaSign = report.delta >= 0 ? '+' : '';
    console.log(chalk.green(`\n  ✔ Report written to ${outputPath}`));
    console.log(chalk.cyan(`  Coverage delta: ${deltaSign}${report.delta.toFixed(2)}%`));
    console.log(chalk.cyan(`  Files improved: ${report.filesImproved.length}`));
    console.log(chalk.cyan(`  Functions newly covered: ${report.functionsNewlyCovered.length}`));
    console.log('');
  });

program.parse(process.argv);
