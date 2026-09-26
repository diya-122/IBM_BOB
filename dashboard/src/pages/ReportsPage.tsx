import { mockReport } from '../mock/sampleData';
import type { CoverageData } from '../types';
import DiffViewer from '../components/DiffViewer';
import CoverageBadge from '../components/CoverageBadge';

function avg(data: CoverageData[]): number {
  if (data.length === 0) return 0;
  return data.reduce((s, d) => s + d.functions.pct, 0) / data.length;
}

function generateMarkdown(): string {
  const beforeAvg = avg(mockReport.before);
  const afterAvg = avg(mockReport.after);
  const lines: string[] = [
    '# TestForge Coverage Report',
    '',
    `**Generated:** ${new Date(mockReport.timestamp).toLocaleString()}`,
    `**Project:** ${mockReport.projectPath}`,
    '',
    '## Summary',
    '',
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Before avg coverage | ${beforeAvg.toFixed(1)}% |`,
    `| After avg coverage  | ${afterAvg.toFixed(1)}% |`,
    `| Delta               | +${mockReport.delta.toFixed(1)}% |`,
    `| Files improved      | ${mockReport.filesImproved.length} |`,
    `| Functions covered   | ${mockReport.functionsNewlyCovered.length} |`,
    '',
    '## Files Improved',
    '',
    ...mockReport.filesImproved.map((f) => `- \`${f}\``),
    '',
    '## Functions Newly Covered',
    '',
    ...mockReport.functionsNewlyCovered.map((fn) => `- \`${fn}\``),
    '',
    '## Per-file Detail',
    '',
  ];

  for (const after of mockReport.after) {
    const before = mockReport.before.find((b) => b.filePath === after.filePath);
    if (!before) continue;
    const delta = after.functions.pct - before.functions.pct;
    lines.push(
      `### \`${after.filePath}\``,
      '',
      `| Metric | Before | After | Delta |`,
      `|--------|--------|-------|-------|`,
      `| Statements | ${before.statements.pct.toFixed(1)}% | ${after.statements.pct.toFixed(1)}% | ${(after.statements.pct - before.statements.pct).toFixed(1)}% |`,
      `| Branches   | ${before.branches.pct.toFixed(1)}% | ${after.branches.pct.toFixed(1)}% | ${(after.branches.pct - before.branches.pct).toFixed(1)}% |`,
      `| Functions  | ${before.functions.pct.toFixed(1)}% | ${after.functions.pct.toFixed(1)}% | ${delta.toFixed(1)}% |`,
      `| Lines      | ${before.lines.pct.toFixed(1)}% | ${after.lines.pct.toFixed(1)}% | ${(after.lines.pct - before.lines.pct).toFixed(1)}% |`,
      '',
    );
  }

  return lines.join('\n');
}

function downloadMarkdown() {
  const md = generateMarkdown();
  const blob = new Blob([md], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'testforge-report.md';
  a.click();
  URL.revokeObjectURL(url);
}

// Most-improved file: pick the one with highest (after - before) functions.pct
function getMostImproved(): { before: CoverageData; after: CoverageData } | null {
  let best: { before: CoverageData; after: CoverageData } | null = null;
  let bestDelta = -Infinity;
  for (const after of mockReport.after) {
    const before = mockReport.before.find((b) => b.filePath === after.filePath);
    if (!before) continue;
    const delta = after.functions.pct - before.functions.pct;
    if (delta > bestDelta) {
      bestDelta = delta;
      best = { before, after };
    }
  }
  return best;
}

export default function ReportsPage() {
  const beforeAvg = avg(mockReport.before);
  const afterAvg = avg(mockReport.after);
  const mostImproved = getMostImproved();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Coverage Report</h1>
        <button
          onClick={downloadMarkdown}
          className="px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
        >
          ↓ Export Markdown
        </button>
      </div>

      <p className="text-xs text-gray-400">
        Generated: {new Date(mockReport.timestamp).toLocaleString()} &nbsp;·&nbsp; {mockReport.projectPath}
      </p>

      {/* Before / after columns */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-red-800 text-sm">Before</h2>
          <p className="text-2xl font-bold text-red-700">{beforeAvg.toFixed(1)}%</p>
          <p className="text-xs text-red-600">avg function coverage</p>
          <ul className="mt-3 space-y-1">
            {mockReport.before.map((d) => (
              <li key={d.filePath} className="flex justify-between text-xs text-red-700">
                <span className="font-mono truncate max-w-[60%]">{d.filePath}</span>
                <CoverageBadge pct={d.functions.pct} />
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5 space-y-2">
          <h2 className="font-semibold text-green-800 text-sm">After</h2>
          <p className="text-2xl font-bold text-green-700">{afterAvg.toFixed(1)}%</p>
          <p className="text-xs text-green-600">avg function coverage</p>
          <ul className="mt-3 space-y-1">
            {mockReport.after.map((d) => (
              <li key={d.filePath} className="flex justify-between text-xs text-green-700">
                <span className="font-mono truncate max-w-[60%]">{d.filePath}</span>
                <CoverageBadge pct={d.functions.pct} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-semibold text-gray-700 text-sm">Summary</h2>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-500">Overall delta</td>
              <td className="py-2 font-semibold text-green-600">+{mockReport.delta.toFixed(1)}%</td>
            </tr>
            <tr className="border-b border-gray-100">
              <td className="py-2 text-gray-500">Files improved</td>
              <td className="py-2 font-semibold text-gray-800">{mockReport.filesImproved.length}</td>
            </tr>
            <tr>
              <td className="py-2 text-gray-500">Functions newly covered</td>
              <td className="py-2 font-semibold text-gray-800">{mockReport.functionsNewlyCovered.length}</td>
            </tr>
          </tbody>
        </table>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Files improved</p>
          <div className="flex flex-wrap gap-1">
            {mockReport.filesImproved.map((f) => (
              <span key={f} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                {f}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-gray-600 mb-1">Functions newly covered</p>
          <div className="flex flex-wrap gap-1">
            {mockReport.functionsNewlyCovered.map((fn) => (
              <span key={fn} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-mono">
                {fn}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Diff viewer */}
      {mostImproved && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-700 text-sm">
            Most Improved — <span className="font-mono text-blue-600">{mostImproved.after.filePath}</span>
          </h2>
          <DiffViewer before={mostImproved.before} after={mostImproved.after} />
        </div>
      )}
    </div>
  );
}
