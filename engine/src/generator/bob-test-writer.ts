import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { TestPlan, GenerationResult } from '../types';
import { StaticTestWriter } from './static-test-writer';

/**
 * Response shape returned by `bob run --format json`.
 * Only the fields we need are typed.
 */
interface BobJsonResponse {
  last_message?: string;
  stats?: {
    session_costs?: number;
    total_cost?: number;
  };
}

/**
 * Strips leading/trailing markdown code fences from Bob's output.
 * Bob may wrap the file content in ```js ... ``` despite instructions.
 */
function stripMarkdownFences(text: string): string {
  return text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}

/**
 * Builds the `bob run` prompt for a single function.
 */
function buildPrompt(fnName: string, filePath: string, projectPath: string, testOutPath: string): string {
  const relFile = path.relative(projectPath, filePath).replace(/\\/g, '/');
  const relOut = path.relative(projectPath, testOutPath).replace(/\\/g, '/');
  return (
    `Write a complete Jest test file for ${fnName} in ${relFile}. ` +
    `Write it ONLY to ${relOut} — do NOT modify any existing file. ` +
    `Do not run any tests yourself. ` +
    `When constructing test dates, use Date.UTC(year, month, day) rather than raw millisecond literals, to avoid arithmetic errors. ` +
    `Output only the file write, then stop.`
  );
}

const staticWriter = new StaticTestWriter();

/**
 * Generates Jest test files by shelling out to `bob run`.
 *
 * Falls back to {@link StaticTestWriter} if:
 *  - `bob` is not on PATH (ENOENT), or
 *  - `bob run` exits with a non-zero code, or
 *  - the JSON response cannot be parsed.
 *
 * The `generator` field in the returned {@link GenerationResult} indicates
 * which path was taken ('bob' | 'static').  `sessionCost` records the
 * Bobcoin spend from `stats.session_costs` when available.
 */
export class BobTestWriter {
  async write(plan: TestPlan, outputDir: string): Promise<GenerationResult> {
    const baseName = path.basename(plan.filePath, path.extname(plan.filePath));
    const ext = /\.tsx?$/.test(plan.filePath) ? 'ts' : 'js';
    const testDir = path.join(outputDir, '__tests__');
    const outputFile = path.join(testDir, `${baseName}.generated.test.${ext}`);

    // Derive the project root (two levels up from outputDir: <project>/__testforge__)
    const projectPath = path.dirname(outputDir);

    fs.mkdirSync(testDir, { recursive: true });

    let bobResult: GenerationResult | null = null;

    try {
      const prompt = buildPrompt(plan.functionName, plan.filePath, projectPath, outputFile);

      const cmd = [
        'bob', 'run',
        '--accept-license',
        '--format', 'json',
        '--mode', 'agent',
        '--max-cost', '0.30',
        '--max-turns', '3',
        '--disable-tool-groups', 'execute',
        JSON.stringify(prompt),
      ].join(' ');

      const raw = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 120_000,
        cwd: projectPath,
      });

      // Locate the JSON object — Bob may prefix with non-JSON banner lines
      const jsonStart = raw.indexOf('{');
      if (jsonStart === -1) throw new Error('No JSON in bob run output');

      const parsed: BobJsonResponse = JSON.parse(raw.slice(jsonStart));
      const lastMessage = parsed.last_message ?? '';
      const content = stripMarkdownFences(lastMessage);
      const sessionCost = parsed.stats?.session_costs ?? parsed.stats?.total_cost;

      if (!content) throw new Error('bob run returned empty last_message');

      // Bob wrote the file itself via tool use — if it exists, we're done.
      // If not (Bob only returned content), write it ourselves.
      if (!fs.existsSync(outputFile)) {
        fs.writeFileSync(outputFile, content, 'utf-8');
      }

      bobResult = {
        filePath: plan.filePath,
        success: true,
        generatedPath: outputFile,
        testsGenerated: (content.match(/\bit\(/g) ?? []).length || 1,
        generator: 'bob',
        sessionCost,
      };
    } catch {
      // bob not on PATH, timed out, or returned bad JSON — fall back to static analysis
    }

    if (bobResult) return bobResult;

    // ── Fallback: static analysis ──────────────────────────────────────────
    const staticResult = await staticWriter.write(plan, outputDir);
    return { ...staticResult, generator: 'static' };
  }
}
