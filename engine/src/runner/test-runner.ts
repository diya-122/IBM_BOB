import { spawn } from 'child_process';

/**
 * Result for a single test file path.
 */
interface TestFileResult {
  /** Absolute or relative path to the test file. */
  path: string;
  /** Whether all tests in the file passed. */
  passed: boolean;
  /** Error message if the file had failures. */
  error?: string;
}

/**
 * Aggregated outcome of a {@link TestRunner.runTests} call.
 */
interface RunResult {
  /** Total number of passing test suites. */
  passed: number;
  /** Total number of failing test suites. */
  failed: number;
  /** Per-file breakdown. */
  results: TestFileResult[];
}

/**
 * Shape of the Jest `--json` output object (subset we need).
 */
interface JestJsonResult {
  numFailedTestSuites: number;
  numPassedTestSuites: number;
  testResults: Array<{
    testFilePath: string;
    status: 'passed' | 'failed';
    message: string;
  }>;
}

/**
 * Spawns a Jest child process and collects its `--json` output.
 */
function spawnJest(testPaths: string[], cwd?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const errChunks: Buffer[] = [];

    const child = spawn('npx', ['jest', '--testPathPattern', testPaths.join('|'), '--json', '--forceExit'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: cwd ?? process.cwd(),
    });

    child.stdout.on('data', (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk));

    child.on('close', () => {
      const output = Buffer.concat(chunks).toString('utf-8');
      if (output.trim().startsWith('{')) {
        resolve(output);
      } else {
        // Jest sometimes writes the JSON to stderr when tests fail.
        const errOutput = Buffer.concat(errChunks).toString('utf-8');
        const jsonStart = errOutput.indexOf('{');
        if (jsonStart !== -1) {
          resolve(errOutput.slice(jsonStart));
        } else {
          reject(new Error(`Jest produced no JSON output.\nstdout: ${output}\nstderr: ${errOutput}`));
        }
      }
    });

    child.on('error', (err) => reject(err));
  });
}

/**
 * Parses Jest JSON output into a {@link RunResult}.
 */
function parseJestOutput(json: string): RunResult {
  const data = JSON.parse(json) as JestJsonResult;

  const results: TestFileResult[] = data.testResults.map((tr) => ({
    path: tr.testFilePath,
    passed: tr.status === 'passed',
    error: tr.status === 'failed' ? tr.message : undefined,
  }));

  return {
    passed: data.numPassedTestSuites,
    failed: data.numFailedTestSuites,
    results,
  };
}

/**
 * Programmatic Jest runner with automatic retry on failure.
 */
export class TestRunner {
  /**
   * Runs Jest against the given test file paths and returns aggregated results.
   *
   * On failure, the runner retries up to **2 additional times** (3 total
   * attempts), re-executing the same set of paths each time. If Jest still
   * reports failures after all retries, the final result is returned as-is so
   * that the caller can decide how to proceed.
   *
   * @param testPaths - Paths passed to Jest's `--testPathPattern` flag.
   * @returns A promise that resolves to the aggregated {@link RunResult}.
   */
  /**
   * Optional project directory to run Jest in. Defaults to `process.cwd()`.
   * Set this to the project root so Jest resolves its config correctly.
   */
  projectDir?: string;

  async runTests(testPaths: string[]): Promise<RunResult> {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      let json: string;
      try {
        json = await spawnJest(testPaths, this.projectDir);
      } catch (err) {
        if (attempt === maxAttempts) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            passed: 0,
            failed: testPaths.length,
            results: testPaths.map((p) => ({ path: p, passed: false, error: message })),
          };
        }
        continue;
      }

      const result = parseJestOutput(json);

      if (result.failed === 0 || attempt === maxAttempts) {
        return result;
      }
      // There were failures — retry.
    }

    // Unreachable, but satisfies TypeScript's control-flow analysis.
    return { passed: 0, failed: testPaths.length, results: [] };
  }
}
