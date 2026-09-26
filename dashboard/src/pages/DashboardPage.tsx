import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { mockCoverageData, mockTrendData, mockGenerationProgress, mockRiskScores } from '../mock/sampleData';
import CoverageBadge from '../components/CoverageBadge';

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export default function DashboardPage() {
  const overallPct = avg(mockCoverageData.map((d) => d.functions.pct));
  const filesAnalyzed = mockCoverageData.length;
  const testsGenerated = mockGenerationProgress.reduce((s, g) => s + g.testsGenerated, 0);
  const avgRisk =
    mockRiskScores.length > 0
      ? avg(mockRiskScores.map((r) => r.riskScore))
      : 0;

  const summaryCards: Array<{ label: string; value: React.ReactNode; sub?: string }> = [
    {
      label: 'Overall Coverage',
      value: <CoverageBadge pct={overallPct} />,
      sub: 'function coverage avg',
    },
    {
      label: 'Files Analyzed',
      value: <span className="text-3xl font-bold text-gray-800">{filesAnalyzed}</span>,
      sub: 'source files',
    },
    {
      label: 'Tests Generated',
      value: <span className="text-3xl font-bold text-gray-800">{testsGenerated}</span>,
      sub: 'test cases',
    },
    {
      label: 'Avg Risk Score',
      value: <span className="text-3xl font-bold text-gray-800">{avgRisk.toFixed(1)}</span>,
      sub: 'across uncovered fns',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map(({ label, value, sub }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-2">
            <p className="text-sm text-gray-500 font-medium">{label}</p>
            <div>{value}</div>
            {sub && <p className="text-xs text-gray-400">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Coverage Trend</h2>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={mockTrendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: '#6b7280' }} />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <Tooltip formatter={(value: number) => [`${value}%`, 'Coverage']} />
            <Line
              type="monotone"
              dataKey="coverage"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#3b82f6' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
