import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import CoverageBadge from '../components/CoverageBadge';
import { useReport } from '../hooks/useApi';

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export default function DashboardPage() {
  const { data: report, isLoading, isError } = useReport();

  if (isLoading) {
    return <div className="p-6 text-sm text-gray-400">Loading dashboard…</div>;
  }

  if (isError || !report) {
    return (
      <div className="p-6 text-sm text-red-500">
        No pipeline data yet. Run the pipeline from the Test Generation page.
      </div>
    );
  }

  const afterPcts = report.after.map((d) => d.functions.pct);
  const overallPct = avg(afterPcts);
  const filesAnalyzed = report.after.length;
  const testsGenerated = report.functionsNewlyCovered.length;
  const beforePcts = report.before.map((d) => d.functions.pct);
  const beforeAvg = avg(beforePcts);

  const summaryCards: Array<{ label: string; value: React.ReactNode; sub?: string }> = [
    {
      label: 'Overall Coverage',
      value: <CoverageBadge pct={overallPct} />,
      sub: 'function coverage (after)',
    },
    {
      label: 'Files Analyzed',
      value: <span className="text-3xl font-bold text-gray-800">{filesAnalyzed}</span>,
      sub: 'source files',
    },
    {
      label: 'Functions Covered',
      value: <span className="text-3xl font-bold text-gray-800">{testsGenerated}</span>,
      sub: 'newly covered functions',
    },
    {
      label: 'Coverage Delta',
      value: (
        <span className="text-3xl font-bold text-green-600">
          +{report.delta.toFixed(1)}%
        </span>
      ),
      sub: `${beforeAvg.toFixed(1)}% → ${overallPct.toFixed(1)}%`,
    },
  ];

  // Per-file before/after bar data
  const barData = report.after.map((d) => {
    const before = report.before.find((b) => b.filePath === d.filePath);
    return {
      name: d.filePath.split('/').pop() ?? d.filePath,
      before: before ? parseFloat(before.functions.pct.toFixed(1)) : 0,
      after: parseFloat(d.functions.pct.toFixed(1)),
    };
  });

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
      <p className="text-xs text-gray-400">
        Last pipeline run: {new Date(report.timestamp).toLocaleString()} &nbsp;·&nbsp; {report.projectPath}
      </p>

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

      {/* Per-file coverage: before vs after */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-700 mb-4">Function Coverage — Before vs After</h2>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} angle={-35} textAnchor="end" interval={0} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12, fill: '#6b7280' }} />
            <Tooltip formatter={(value: number) => [`${value}%`]} />
            <Bar dataKey="before" name="Before" fill="#fca5a5" radius={[3, 3, 0, 0]}>
              {barData.map((_, i) => <Cell key={i} fill="#fca5a5" />)}
            </Bar>
            <Bar dataKey="after" name="After" fill="#4ade80" radius={[3, 3, 0, 0]}>
              {barData.map((_, i) => <Cell key={i} fill="#4ade80" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 mt-1 text-center">
          <span className="inline-block w-3 h-3 bg-red-300 rounded-sm mr-1" />Before
          <span className="inline-block w-3 h-3 bg-green-400 rounded-sm ml-3 mr-1" />After
        </p>
      </div>
    </div>
  );
}
