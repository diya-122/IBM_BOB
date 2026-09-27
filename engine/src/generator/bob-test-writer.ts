import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { config as dotenvConfig } from 'dotenv';
import { TestPlan, GenerationResult } from '../types';
import { StaticTestWriter } from './static-test-writer';

// Load engine/.env so BOB_API_KEY is available regardless of shell inheritance
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

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
function buildPrompt(fnNames: string[], filePath: string, projectPath: string, testOutPath: string): string {
  const relFile = path.relative(projectPath, filePath).replace(/\\/g, '/');
  const relOut = path.relative(projectPath, testOutPath).replace(/\\/g, '/');
  const fnList = fnNames.join(', ');
  return (
    `Write a complete Jest test file covering ALL of the following functions in ${relFile}: ${fnList}. ` +
    `Include at least one test (happy path, edge case, and error case where applicable) for each function. ` +
    `Write it ONLY to ${relOut} — do NOT modify any existing file. ` +
    `Do not run any tests yourself. ` +
    `Add a beforeEach(() => jest.clearAllMocks()) inside every describe block so mock call counts reset between tests. ` +
    `When constructing test dates, use Date.UTC(year, month, day) rather than raw millisecond literals, to avoid arithmetic errors. ` +
    `When mocking an Express response object, define json/status/send as separate jest.fn() calls first, then attach them to the object — never reference the object being defined within its own literal. ` +
    `Output only the file write, then stop.`
  );
}

const staticWriter = new StaticTestWriter();

/**
 * Generates Jest test files by shelling out to `bob run`.
 *
 * If BOB_API_KEY is not set after loading .env, throws immediately so the
 * missing key is obvious rather than producing a confusing silent fallback.
 *
 * Falls back to {@link StaticTestWriter} only when `bob run` itself fails:
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
    // Fail fast if key is missing — do NOT silently fall back
    const BOB_API_KEY = process.env.BOB_API_KEY;
    if (!BOB_API_KEY) {
      throw new Error(
        '[BobTestWriter] BOB_API_KEY is not set. ' +
        'Add it to engine/.env (BOB_API_KEY=<your-key>) and restart the engine.'
      );
    }

    const baseName = path.basename(plan.filePath, path.extname(plan.filePath));
    const ext = /\.tsx?$/.test(plan.filePath) ? 'ts' : 'js';
    const testDir = path.join(outputDir, '__tests__');
    const outputFile = path.join(testDir, `${baseName}.generated.test.${ext}`);

    // Derive the project root (two levels up from outputDir: <project>/__testforge__)
    const projectPath = path.dirname(outputDir);

    fs.mkdirSync(testDir, { recursive: true });

    let bobResult: GenerationResult | null = null;

    try {
      const fnNames = plan.functionNames && plan.functionNames.length > 0
        ? plan.functionNames
        : [plan.functionName];
      const prompt = buildPrompt(fnNames, plan.filePath, projectPath, outputFile);

      const cmd = [
        'bob', 'run',
        '--accept-license',
        '--format', 'json',
        '--mode', 'agent',
        '--max-cost', '0.50',
        '--max-turns', '5',
        '--disable-tool-groups', 'execute',
        JSON.stringify(prompt),
      ].join(' ');

      const raw = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 120_000,
        cwd: projectPath,
        // Explicitly pass BOB_API_KEY — do not rely on ambient env inheritance
        env: { ...process.env, BOB_API_KEY },
      });

      // Bob may emit multiple newline-delimited JSON objects (e.g. an error
      // object followed by the result object).  Find the last line that
      // starts with '{' and contains '"type":"result"' — that is the payload.
      const jsonLines = raw.split('\n').filter(l => l.trimStart().startsWith('{'));
      if (jsonLines.length === 0) throw new Error('No JSON in bob run output');
      const resultLine = jsonLines.find(l => l.includes('"type":"result"')) ?? jsonLines[jsonLines.length - 1];

      const parsed: BobJsonResponse = JSON.parse(resultLine);
      const lastMessage = parsed.last_message ?? '';
      const sessionCost = parsed.stats?.session_costs ?? parsed.stats?.total_cost;

      // Bob wrote the file itself via tool use — if it exists, we're done.
      if (!fs.existsSync(outputFile)) {
        // Bob returned the content as text instead of writing it directly
        const content = stripMarkdownFences(lastMessage);
        if (!content) throw new Error('bob run returned empty last_message and did not write the file');
        fs.writeFileSync(outputFile, content, 'utf-8');
      }

      const writtenContent = fs.readFileSync(outputFile, 'utf-8');
      bobResult = {
        filePath: plan.filePath,
        success: true,
        generatedPath: outputFile,
        testsGenerated: (writtenContent.match(/\b(?:it|test)\(/g) ?? []).length || 1,
        generator: 'bob',
        sessionCost,
      };
    } catch (err) {
      // bob not on PATH, timed out, or returned bad JSON — fall back to static
      const reason = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[BobTestWriter] fallback for ${plan.functionName}: ${reason.split('\n')[0]}\n`);
    }

    if (bobResult) return bobResult;

    // ── Fallback: static analysis ──────────────────────────────────────────
    const staticResult = await staticWriter.write(plan, outputDir);
    return { ...staticResult, generator: 'static' };
  }
}
