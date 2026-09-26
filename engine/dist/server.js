"use strict";
/**
 * Minimal Express API server for the TestForge engine.
 * Exposes /analyze, /generate, /pipeline, /status.
 *
 * Start with: node dist/server.js
 * Configure port via PORT env var (default 4001).
 * Pipeline results are persisted to PERSIST_PATH (default: pipeline-result.json).
 */
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
exports.app = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const express_1 = __importDefault(require("express"));
const project_scanner_1 = require("./analyzer/project-scanner");
const coverage_parser_1 = require("./analyzer/coverage-parser");
const risk_scorer_1 = require("./analyzer/risk-scorer");
const test_planner_1 = require("./generator/test-planner");
const parallel_orchestrator_1 = require("./generator/parallel-orchestrator");
const pipeline_1 = require("./pipeline/pipeline");
const app = (0, express_1.default)();
exports.app = app;
app.use(express_1.default.json());
// CORS for local dev dashboard
app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
});
// ── persistence ────────────────────────────────────────────────────────────
const PERSIST_PATH = path.resolve(process.env['PERSIST_PATH'] ?? 'pipeline-result.json');
function saveToDisk(data) {
    try {
        fs.writeFileSync(PERSIST_PATH, JSON.stringify(data, null, 2), 'utf-8');
    }
    catch { /* non-fatal */ }
}
function loadFromDisk() {
    try {
        if (!fs.existsSync(PERSIST_PATH))
            return null;
        return JSON.parse(fs.readFileSync(PERSIST_PATH, 'utf-8'));
    }
    catch {
        return null;
    }
}
let lastAnalysis = null;
let lastGeneration = null;
let lastPipeline = loadFromDisk();
// ── /status ────────────────────────────────────────────────────────────────
app.get('/status', (_req, res) => {
    res.json({
        ok: true,
        analyzed: lastAnalysis !== null,
        generated: lastGeneration !== null,
        pipelineRan: lastPipeline !== null,
        analyzedAt: lastAnalysis?.analyzedAt ?? null,
        generatedAt: lastGeneration?.generatedAt ?? null,
        pipelineRanAt: lastPipeline?.ranAt ?? null,
    });
});
// ── /analyze ───────────────────────────────────────────────────────────────
app.post('/analyze', async (req, res) => {
    const { projectPath } = req.body;
    if (!projectPath) {
        res.status(400).json({ error: 'projectPath is required' });
        return;
    }
    const resolved = path.resolve(projectPath);
    if (!fs.existsSync(resolved)) {
        res.status(404).json({ error: `Not found: ${resolved}` });
        return;
    }
    const scanResult = new project_scanner_1.ProjectScanner().scan(resolved);
    const coveragePath = path.join(resolved, 'coverage', 'coverage-final.json');
    let coverageData = [];
    if (fs.existsSync(coveragePath)) {
        coverageData = new coverage_parser_1.CoverageParser().parse(coveragePath);
    }
    const riskScores = new risk_scorer_1.RiskScorer().score(coverageData, resolved);
    lastAnalysis = { projectPath: resolved, coverageData, riskScores, analyzedAt: new Date().toISOString() };
    res.json({ scanResult, coverageData, riskScores });
});
app.get('/analyze', (_req, res) => {
    if (!lastAnalysis) {
        res.status(404).json({ error: 'No analysis yet. POST /analyze first.' });
        return;
    }
    res.json(lastAnalysis);
});
// ── /generate ──────────────────────────────────────────────────────────────
app.post('/generate', async (req, res) => {
    if (!lastAnalysis) {
        res.status(400).json({ error: 'Run POST /analyze first.' });
        return;
    }
    const { outputDir } = req.body;
    const resolvedOut = path.resolve(outputDir ?? path.join(lastAnalysis.projectPath, '__testforge__'));
    const plans = new test_planner_1.TestPlanner().plan(lastAnalysis.riskScores);
    const results = await new parallel_orchestrator_1.ParallelOrchestrator().run(plans, resolvedOut);
    lastGeneration = { results, generatedAt: new Date().toISOString() };
    res.json({ results, outputDir: resolvedOut });
});
app.get('/generate', (_req, res) => {
    if (!lastGeneration) {
        res.status(404).json({ error: 'No generation yet. POST /generate first.' });
        return;
    }
    res.json(lastGeneration);
});
// ── /pipeline ──────────────────────────────────────────────────────────────
/**
 * POST /pipeline
 * Body: { projectPath: string, outputDir?: string }
 *
 * Runs the full pipeline: analyze → generate → run → re-analyze → diff.
 * Returns a {@link PipelineResult} with before/after CoverageData and
 * a CoverageReport showing the delta.
 *
 * Result is persisted to disk (PERSIST_PATH) so it survives a server restart.
 */
app.post('/pipeline', async (req, res) => {
    const { projectPath, outputDir } = req.body;
    if (!projectPath) {
        res.status(400).json({ error: 'projectPath is required' });
        return;
    }
    const resolved = path.resolve(projectPath);
    if (!fs.existsSync(resolved)) {
        res.status(404).json({ error: `Not found: ${resolved}` });
        return;
    }
    try {
        const result = await (0, pipeline_1.runPipeline)(resolved, outputDir);
        lastPipeline = result;
        saveToDisk(result);
        res.json(result);
    }
    catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.status(500).json({ error: `Pipeline failed: ${message}` });
    }
});
app.get('/pipeline', (_req, res) => {
    if (!lastPipeline) {
        res.status(404).json({ error: 'No pipeline run yet. POST /pipeline first.' });
        return;
    }
    res.json(lastPipeline);
});
// ── /report ────────────────────────────────────────────────────────────────
app.get('/report', (_req, res) => {
    if (!lastPipeline?.report) {
        res.status(404).json({ error: 'No report yet. POST /pipeline first.' });
        return;
    }
    res.json(lastPipeline.report);
});
// ── start ──────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env['PORT'] ?? '4001', 10);
app.listen(PORT, () => {
    process.stdout.write(`TestForge API listening on http://localhost:${PORT}\n`);
    if (lastPipeline) {
        process.stdout.write(`  Loaded previous pipeline result from ${PERSIST_PATH}\n`);
    }
});
//# sourceMappingURL=server.js.map