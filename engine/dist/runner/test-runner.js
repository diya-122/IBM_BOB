"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestRunner = void 0;
const child_process_1 = require("child_process");
/**
 * Spawns a Jest child process and collects its `--json` output.
 */
function spawnJest(testPaths, cwd) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        const errChunks = [];
        const child = (0, child_process_1.spawn)('npx', ['jest', '--testPathPattern', testPaths.join('|'), '--json', '--forceExit'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            cwd: cwd ?? process.cwd(),
        });
        child.stdout.on('data', (chunk) => chunks.push(chunk));
        child.stderr.on('data', (chunk) => errChunks.push(chunk));
        child.on('close', () => {
            const output = Buffer.concat(chunks).toString('utf-8');
            if (output.trim().startsWith('{')) {
                resolve(output);
            }
            else {
                // Jest sometimes writes the JSON to stderr when tests fail.
                const errOutput = Buffer.concat(errChunks).toString('utf-8');
                const jsonStart = errOutput.indexOf('{');
                if (jsonStart !== -1) {
                    resolve(errOutput.slice(jsonStart));
                }
                else {
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
function parseJestOutput(json) {
    const data = JSON.parse(json);
    const results = data.testResults.map((tr) => ({
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
class TestRunner {
    async runTests(testPaths) {
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            let json;
            try {
                json = await spawnJest(testPaths, this.projectDir);
            }
            catch (err) {
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
exports.TestRunner = TestRunner;
//# sourceMappingURL=test-runner.js.map