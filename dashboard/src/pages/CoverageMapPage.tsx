import { useState } from 'react';
import { mockCoverageData } from '../mock/sampleData';
import type { CoverageData } from '../types';
import CoverageHeatmap from '../components/CoverageHeatmap';
import CoverageBadge from '../components/CoverageBadge';

// Map file path → function names (derived from real sample-app functions)
const fileFunctions: Record<string, string[]> = {
  'src/routes/users.js':        ['getUserById', 'createUser', 'updateUser', 'deleteUser', 'listUsers'],
  'src/routes/products.js':     ['getAllProducts', 'createProduct', 'updateProduct', 'deleteProduct'],
  'src/routes/orders.js':       ['placeOrder', 'getOrderById', 'updateOrderStatus', 'cancelOrder'],
  'src/middleware/auth.js':     ['authenticate'],
  'src/middleware/validation.js': ['validateRequest'],
  'src/utils/helpers.js':       ['formatDate', 'calculateDiscount', 'generateId', 'paginate'],
  'src/app.js':                 ['initApp', 'startServer'],
  'src/db.js':                  ['connect', 'disconnect', 'query', 'transaction'],
};

export default function CoverageMapPage() {
  const [selected, setSelected] = useState<CoverageData | null>(null);

  const heatmapData = mockCoverageData.map((d) => ({
    name: d.filePath.replace('src/', ''),
    size: d.functions.total,
    pct: d.functions.pct,
    filePath: d.filePath,
  }));

  const handleSelect = (name: string) => {
    const full = mockCoverageData.find(
      (d) => d.filePath === name || d.filePath.replace('src/', '') === name,
    );
    setSelected(full ?? null);
  };

  const coveredCount = selected ? selected.functions.covered : 0;
  const fns = selected ? (fileFunctions[selected.filePath] ?? []) : [];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Coverage Map</h1>
      <p className="text-sm text-gray-500">
        Click a file block to inspect function-level coverage.
      </p>

      <div className="flex gap-6">
        {/* Treemap */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 p-4">
          <CoverageHeatmap data={heatmapData} onSelect={handleSelect} />

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-red-500" /> &lt;30%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-yellow-500" /> 30–70%
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded-sm bg-green-500" /> &gt;70%
            </span>
          </div>
        </div>

        {/* Side panel */}
        {selected && (
          <div className="w-72 bg-white rounded-xl border border-gray-200 p-4 space-y-3 flex-shrink-0">
            <h2 className="font-semibold text-gray-800 text-sm break-all">{selected.filePath}</h2>
            <CoverageBadge pct={selected.functions.pct} />

            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Statements</span>
                <span>{selected.statements.covered}/{selected.statements.total} ({selected.statements.pct.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>Branches</span>
                <span>{selected.branches.covered}/{selected.branches.total} ({selected.branches.pct.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>Functions</span>
                <span>{selected.functions.covered}/{selected.functions.total} ({selected.functions.pct.toFixed(1)}%)</span>
              </div>
              <div className="flex justify-between">
                <span>Lines</span>
                <span>{selected.lines.covered}/{selected.lines.total} ({selected.lines.pct.toFixed(1)}%)</span>
              </div>
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-medium text-gray-600">Functions</p>
            <ul className="space-y-1">
              {fns.map((fn, i) => (
                <li key={fn} className="flex items-center gap-2 text-xs">
                  <span
                    className={[
                      'w-2 h-2 rounded-full flex-shrink-0',
                      i < coveredCount ? 'bg-green-500' : 'bg-red-400',
                    ].join(' ')}
                  />
                  <span className="font-mono text-gray-700">{fn}</span>
                  <span className={['ml-auto', i < coveredCount ? 'text-green-600' : 'text-red-500'].join(' ')}>
                    {i < coveredCount ? '✓' : '✗'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
