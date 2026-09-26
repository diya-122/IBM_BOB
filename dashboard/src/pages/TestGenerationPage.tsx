import { useState } from 'react';
import { mockRiskScores, mockGenerationProgress } from '../mock/sampleData';
import type { CoverageReport, RiskScore } from '../types';
import RiskTable from '../components/RiskTable';
import ProgressTracker from '../components/ProgressTracker';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:4001';
// project path the engine will analyze — adjust via env for different setups
const PROJECT_PATH = import.meta.env['VITE_PROJECT_PATH'] ?? './sample-app';

interface PipelineState {
  status: 'idle' | 'running' | 'done' | 'error';
  report: CoverageReport | null;
  riskScores: RiskScore[];
  generatedCount: number;
  error: string | null;
}

export default function TestGenerationPage() {
  const [pipeline, setPipeline] = useState<PipelineState>({
    status: 'idle',
    report: null,
    riskScores: [],
    generatedCount: 0,
    error: null,
  });

  async function handleGenerate() {
    setPipeline((s) => ({ ...s, status: 'running', error: null }));

    try {
      const res = await fetch(`${API_BASE}/pipeline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectPath: PROJECT_PATH }),
      });

      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json() as {
        report: CoverageReport;
        riskScores: RiskScore[];
        generationResults: Array<{ success: boolean }>;
      };

      setPipeline({
        status: 'done',
        report: data.report,
        riskScores: data.riskScores,
        generatedCount: data.generationResults.filter((r) => r.success).length,
        error: null,
      });
    } catch (err) {
      setPipeline((s) => ({
        ...s,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }));
    }
  }

  const displayRisks = pipeline.riskScores.length > 0 ? pipeline.riskScores : mockRiskScores;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Test Generation</h1>
        <button
          onClick={handleGenerate}
          disabled={pipeline.status === 'running'}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pipeline.status === 'running' ? '⏳ Running pipeline…' : '⚡ Generate Tests'}
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Clicking <strong>Generate Tests</strong> runs the full pipeline against the project:
        analyze → generate → run → re-analyze → diff.
      </p>

      {/* Status banner */}
      {pipeline.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          ✖ Pipeline error: {pipeline.error}
          <span className="ml-2 text-red-400">(API server may not be running — showing mock data)</span>
        </div>
      )}
      {pipeline.status === 'done' && pipeline.report && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 space-y-1">
          <p className="font-semibold">✔ Pipeline complete</p>
          <p>Tests generated: <strong>{pipeline.generatedCount}</strong></p>
          <p>Coverage delta: <strong>+{pipeline.report.delta.toFixed(1)}%</strong></p>
          <p>Files improved: <strong>{pipeline.report.filesImproved.length}</strong></p>
          <p>Functions newly covered: <strong>{pipeline.report.functionsNewlyCovered.length}</strong></p>
        </div>
      )}

      {/* Risk table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <RiskTable risks={displayRisks} />
      </div>

      {/* Progress tracker — shown during/after run */}
      {(pipeline.status === 'running' || pipeline.status === 'done') && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Generation Progress</h2>
          <ProgressTracker items={mockGenerationProgress} />
        </div>
      )}
    </div>
  );
}
