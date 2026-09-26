import type { CoverageData } from '../types';

interface DiffViewerProps {
  before: CoverageData;
  after: CoverageData;
}

type MetricKey = 'statements' | 'branches' | 'functions' | 'lines';
const METRICS: MetricKey[] = ['statements', 'branches', 'functions', 'lines'];

function DeltaArrow({ delta }: { delta: number }) {
  if (delta > 0) return <span className="text-green-600 font-semibold">↑ +{delta.toFixed(1)}%</span>;
  if (delta < 0) return <span className="text-red-500 font-semibold">↓ {delta.toFixed(1)}%</span>;
  return <span className="text-gray-400">— 0%</span>;
}

export default function DiffViewer({ before, after }: DiffViewerProps) {
  return (
    <div className="grid grid-cols-2 gap-4 text-sm">
      {/* Before */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
        <p className="font-semibold text-red-700 text-xs uppercase tracking-wide">Before</p>
        {METRICS.map((m) => (
          <div key={m} className="flex justify-between items-center">
            <span className="capitalize text-red-800 text-xs">{m}</span>
            <span className="font-mono text-red-700 text-xs">
              {before[m].covered}/{before[m].total} ({before[m].pct.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      {/* After */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
        <p className="font-semibold text-green-700 text-xs uppercase tracking-wide">After</p>
        {METRICS.map((m) => (
          <div key={m} className="flex justify-between items-center">
            <span className="capitalize text-green-800 text-xs">{m}</span>
            <span className="font-mono text-green-700 text-xs">
              {after[m].covered}/{after[m].total} ({after[m].pct.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>

      {/* Delta row spanning full width */}
      <div className="col-span-2 bg-white border border-gray-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Delta</p>
        <div className="grid grid-cols-4 gap-2">
          {METRICS.map((m) => (
            <div key={m} className="text-center">
              <p className="text-xs text-gray-500 capitalize mb-1">{m}</p>
              <DeltaArrow delta={after[m].pct - before[m].pct} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
