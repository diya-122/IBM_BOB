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
exports.BobTestWriter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const static_test_writer_1 = require("./static-test-writer");
/**
 * Strips leading/trailing markdown code fences from Bob's output.
 * Bob may wrap the file content in ```js ... ``` despite instructions.
 */
function stripMarkdownFences(text) {
    return text.replace(/^```[a-z]*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
}
/**
 * Builds the `bob run` prompt for a single function.
 */
function buildPrompt(fnName, filePath, projectPath, testOutPath) {
    const relFile = path.relative(projectPath, filePath).replace(/\\/g, '/');
    const relOut = path.relative(projectPath, testOutPath).replace(/\\/g, '/');
    return (`Write a complete Jest test file for ${fnName} in ${relFile}. ` +
        `Write it ONLY to ${relOut} — do NOT modify any existing file. ` +
        `Do not run any tests yourself. ` +
        `When constructing test dates, use Date.UTC(year, month, day) rather than raw millisecond literals, to avoid arithmetic errors. ` +
        `Output only the file write, then stop.`);
}
const staticWriter = new static_test_writer_1.StaticTestWriter();
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
class BobTestWriter {
    async write(plan, outputDir) {
        const baseName = path.basename(plan.filePath, path.extname(plan.filePath));
        const ext = /\.tsx?$/.test(plan.filePath) ? 'ts' : 'js';
        const testDir = path.join(outputDir, '__tests__');
        const outputFile = path.join(testDir, `${baseName}.generated.test.${ext}`);
        // Derive the project root (two levels up from outputDir: <project>/__testforge__)
        const projectPath = path.dirname(outputDir);
        fs.mkdirSync(testDir, { recursive: true });
        let bobResult = null;
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
            const raw = (0, child_process_1.execSync)(cmd, {
                encoding: 'utf-8',
                timeout: 120000,
                cwd: projectPath,
            });
            // Locate the JSON object — Bob may prefix with non-JSON banner lines
            const jsonStart = raw.indexOf('{');
            if (jsonStart === -1)
                throw new Error('No JSON in bob run output');
            const parsed = JSON.parse(raw.slice(jsonStart));
            const lastMessage = parsed.last_message ?? '';
            const content = stripMarkdownFences(lastMessage);
            const sessionCost = parsed.stats?.session_costs ?? parsed.stats?.total_cost;
            if (!content)
                throw new Error('bob run returned empty last_message');
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
        }
        catch {
            // bob not on PATH, timed out, or returned bad JSON — fall back to static analysis
        }
        if (bobResult)
            return bobResult;
        // ── Fallback: static analysis ──────────────────────────────────────────
        const staticResult = await staticWriter.write(plan, outputDir);
        return { ...staticResult, generator: 'static' };
    }
}
exports.BobTestWriter = BobTestWriter;
//# sourceMappingURL=bob-test-writer.js.map