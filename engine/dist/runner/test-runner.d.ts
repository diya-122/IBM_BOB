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
 * Programmatic Jest runner with automatic retry on failure.
 */
export declare class TestRunner {
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
    runTests(testPaths: string[]): Promise<RunResult>;
}
export {};
//# sourceMappingURL=test-runner.d.ts.map