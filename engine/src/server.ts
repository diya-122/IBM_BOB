/**
 * Minimal Express API server for the TestForge engine.
 * Exposes /analyze, /generate, /pipeline, /status.
 *
 * Start with: node dist/server.js
 * Configure port via PORT env var (default 4001).
 * Pipeline results are persisted to PERSIST_PATH (default: pipeline-result.json).
 */

import * as fs from 'fs';
import * as path from 'path';
import express, { Request, Response } from 'express';

import { ProjectScanner } from './analyzer/project-scanner';
import { CoverageParser } from './analyzer/coverage-parser';
import { RiskScorer } from './analyzer/risk-scorer';
import { TestPlanner } from './generator/test-planner';
import { ParallelOrchestrator } from './generator/parallel-orchestrator';
import { runPipeline, PipelineResult } from './pipeline/pipeline';
import { CoverageData, RiskScore, GenerationResult } from './types';

const app = express();
app.use(express.json());

// CORS for local dev dashboard
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

// ── persistence ────────────────────────────────────────────────────────────

// Default to the directory containing this compiled file so the JSON sits
// alongside server.js (engine/dist/) rather than wherever the process was
// launched from.
const PERSIST_PATH = path.resolve(
  process.env['PERSIST_PATH'] ?? path.join(__dirname, 'pipeline-result.json'),
);

function saveToDisk(data: unknown): void {
  try {
    fs.writeFileSync(PERSIST_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch { /* non-fatal */ }
}

function loadFromDisk<T>(): T | null {
  try {
    if (!fs.existsSync(PERSIST_PATH)) return null;
    return JSON.parse(fs.readFileSync(PERSIST_PATH, 'utf-8')) as T;
  } catch { return null; }
}

// ── in-memory state ────────────────────────────────────────────────────────

interface AnalysisState {
  projectPath: string;
  coverageData: CoverageData[];
  riskScores: RiskScore[];
  analyzedAt: string;
}

interface GenerationState {
  results: GenerationResult[];
  generatedAt: string;
}

let lastAnalysis: AnalysisState | null = null;
let lastGeneration: GenerationState | null = null;
let lastPipeline: PipelineResult | null = loadFromDisk<PipelineResult>();

// ── / ─────────────────────────────────────────────────────────────────────

app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'TestForge Engine API',
    version: '0.1.0',
    endpoints: [
      'GET  /          — this help',
      'GET  /status    — server state (analyzed, generated, pipelineRan)',
      'POST /analyze   — analyze a project (body: { projectPath })',
      'GET  /analyze   — last analysis result',
      'POST /generate  — generate tests (body: { outputDir? })',
      'GET  /generate  — last generation result',
      'POST /pipeline  — full pipeline (body: { projectPath, outputDir? })',
      'GET  /pipeline  — last pipeline result',
      'GET  /report    — last coverage report',
    ],
    note: 'projectPath can be an absolute Linux/WSL path (/home/user/project) or relative to the repo root (./sample-app)',
  });
});

// ── /status ────────────────────────────────────────────────────────────────

app.get('/status', (_req: Request, res: Response) => {
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

/** Returns true when the path looks like a Windows absolute path (C:\…). */
function isWindowsAbsPath(p: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(p);
}

/**
 * Resolves a project path to an absolute path.
 *
 * Relative paths (e.g. `./sample-app`, `sample-app`) are resolved relative to
 * the **repo root** — two directories above `engine/dist/` — so they work
 * correctly regardless of the directory `node` was launched from.
 *
 * Absolute paths are returned as-is.
 */
function resolveProjectPath(p: string): string {
  if (path.isAbsolute(p)) return p;
  // __dirname = engine/dist  →  ../.. = repo root
  const repoRoot = path.resolve(__dirname, '../..');
  return path.resolve(repoRoot, p);
}

app.post('/analyze', async (req: Request, res: Response) => {
  const { projectPath } = req.body as { projectPath?: string };
  if (!projectPath) { res.status(400).json({ error: 'projectPath is required' }); return; }
  if (isWindowsAbsPath(projectPath)) {
    res.status(400).json({
      error: `Windows path detected: "${projectPath}". Provide a Linux/WSL absolute path (e.g. /home/user/project) or a relative path like ./sample-app.`,
    });
    return;
  }

  const resolved = resolveProjectPath(projectPath);
  if (!fs.existsSync(resolved)) { res.status(404).json({ error: `Not found: ${resolved}` }); return; }

  const scanResult = new ProjectScanner().scan(resolved);

  const coveragePath = path.join(resolved, 'coverage', 'coverage-final.json');
  let coverageData: CoverageData[] = [];
  if (fs.existsSync(coveragePath)) {
    coverageData = new CoverageParser().parse(coveragePath);
  }

  const riskScores = new RiskScorer().score(coverageData, resolved);

  lastAnalysis = { projectPath: resolved, coverageData, riskScores, analyzedAt: new Date().toISOString() };
  res.json({ scanResult, coverageData, riskScores });
});

app.get('/analyze', (_req: Request, res: Response) => {
  if (!lastAnalysis) { res.status(404).json({ error: 'No analysis yet. POST /analyze first.' }); return; }
  res.json(lastAnalysis);
});

// ── /generate ──────────────────────────────────────────────────────────────

app.post('/generate', async (req: Request, res: Response) => {
  if (!lastAnalysis) { res.status(400).json({ error: 'Run POST /analyze first.' }); return; }

  const { outputDir } = req.body as { outputDir?: string };
  const resolvedOut = path.resolve(outputDir ?? path.join(lastAnalysis.projectPath, '__testforge__'));

  const plans = new TestPlanner().plan(lastAnalysis.riskScores);
  const results = await new ParallelOrchestrator().run(plans, resolvedOut);

  lastGeneration = { results, generatedAt: new Date().toISOString() };
  res.json({ results, outputDir: resolvedOut });
});

app.get('/generate', (_req: Request, res: Response) => {
  if (!lastGeneration) { res.status(404).json({ error: 'No generation yet. POST /generate first.' }); return; }
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
app.post('/pipeline', async (req: Request, res: Response) => {
  const { projectPath, outputDir } = req.body as { projectPath?: string; outputDir?: string };
  if (!projectPath) { res.status(400).json({ error: 'projectPath is required' }); return; }
  if (isWindowsAbsPath(projectPath)) {
    res.status(400).json({
      error: `Windows path detected: "${projectPath}". Provide a Linux/WSL absolute path (e.g. /home/user/project) or a relative path like ./sample-app.`,
    });
    return;
  }

  const resolved = resolveProjectPath(projectPath);
  if (!fs.existsSync(resolved)) { res.status(404).json({ error: `Not found: ${resolved}` }); return; }

  try {
    const result = await runPipeline(resolved, outputDir);
    lastPipeline = result;
    saveToDisk(result);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Pipeline failed: ${message}` });
  }
});

app.get('/pipeline', (_req: Request, res: Response) => {
  if (!lastPipeline) { res.status(404).json({ error: 'No pipeline run yet. POST /pipeline first.' }); return; }
  res.json(lastPipeline);
});

// ── /report ────────────────────────────────────────────────────────────────

app.get('/report', (_req: Request, res: Response) => {
  if (!lastPipeline?.report) { res.status(404).json({ error: 'No report yet. POST /pipeline first.' }); return; }
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

export { app };
