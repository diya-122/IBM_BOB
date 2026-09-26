import { useState } from 'react';
import type { RiskScore } from '../types';
import CoverageBadge from './CoverageBadge';

type SortKey = keyof Pick<RiskScore, 'filePath' | 'functionName' | 'complexity' | 'importCount' | 'riskScore' | 'coveragePercent'>;

interface RiskTableProps {
  risks: RiskScore[];
}

const columns: Array<{ key: SortKey; label: string }> = [
  { key: 'filePath',        label: 'File' },
  { key: 'functionName',    label: 'Function' },
  { key: 'complexity',      label: 'Complexity' },
  { key: 'importCount',     label: 'Imports' },
  { key: 'riskScore',       label: 'Risk Score' },
  { key: 'coveragePercent', label: 'Coverage' },
];

function rowBg(riskScore: number): string {
  if (riskScore > 15) return 'bg-red-50';
  if (riskScore > 5)  return 'bg-yellow-50';
  return 'bg-white';
}

export default function RiskTable({ risks }: RiskTableProps) {
  const [sortKey, setSortKey]     = useState<SortKey>('riskScore');
  const [sortAsc, setSortAsc]     = useState(false);

  const sorted = [...risks].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') {
      return sortAsc ? av - bv : bv - av;
    }
    return sortAsc
      ? String(av).localeCompare(String(bv))
      : String(bv).localeCompare(String(av));
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map(({ key, label }) => (
              <th
                key={key}
                onClick={() => handleSort(key)}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide cursor-pointer select-none hover:bg-gray-100"
              >
                {label}
                {sortKey === key && (
                  <span className="ml-1 text-gray-400">{sortAsc ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r, i) => (
            <tr
              key={`${r.filePath}-${r.functionName}-${i}`}
              className={`border-b border-gray-100 ${rowBg(r.riskScore)}`}
            >
              <td className="px-4 py-2 font-mono text-xs text-gray-600 max-w-[180px] truncate">{r.filePath}</td>
              <td className="px-4 py-2 font-mono text-xs font-medium text-gray-800">{r.functionName}</td>
              <td className="px-4 py-2 text-center text-gray-700">{r.complexity}</td>
              <td className="px-4 py-2 text-center text-gray-700">{r.importCount}</td>
              <td className="px-4 py-2 text-center font-bold text-gray-800">{r.riskScore}</td>
              <td className="px-4 py-2">
                <CoverageBadge pct={r.coveragePercent} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
