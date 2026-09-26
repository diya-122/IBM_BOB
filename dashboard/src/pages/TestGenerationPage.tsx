import { useState } from 'react';
import { mockRiskScores, mockGenerationProgress, mockTestPlans } from '../mock/sampleData';
import RiskTable from '../components/RiskTable';
import ProgressTracker from '../components/ProgressTracker';

function buildTestPreview(): string {
  const topPlan = mockTestPlans[0];
  if (!topPlan) return '';

  const lines: string[] = [
    `// Auto-generated tests for ${topPlan.functionName}`,
    `// File: ${topPlan.filePath}`,
    `// Priority: ${topPlan.priority}`,
    '',
    `import { ${topPlan.functionName} } from '../../${topPlan.filePath}';`,
    '',
    `describe('${topPlan.functionName}', () => {`,
  ];

  for (const tc of topPlan.testCases) {
    const itLabel = tc.type === 'error'
      ? `throws — ${tc.description}`
      : tc.description;

    lines.push(`  it('${itLabel}', async () => {`);
    for (const inp of tc.inputs) {
      lines.push(`    // ${inp}`);
    }
    if (tc.type === 'error') {
      lines.push(`    await expect(${topPlan.functionName}(...args)).rejects.toThrow();`);
    } else {
      lines.push(`    const result = await ${topPlan.functionName}(...args);`);
      lines.push(`    // expected: ${tc.expectedOutput}`);
      lines.push(`    expect(result).toBeDefined();`);
    }
    lines.push(`  });`);
    lines.push('');
  }

  lines.push('});');
  return lines.join('\n');
}

export default function TestGenerationPage() {
  const [triggered, setTriggered] = useState(false);

  const preview = buildTestPreview();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Test Generation</h1>
        <button
          onClick={() => setTriggered(true)}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          ⚡ Generate Tests
        </button>
      </div>

      <p className="text-sm text-gray-500">
        Functions ranked by risk score (complexity × import count). High-risk uncovered functions
        are prioritised for generation.
      </p>

      {/* Risk table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <RiskTable risks={mockRiskScores} />
      </div>

      {/* Progress tracker */}
      {triggered && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-700 mb-3">Generation Progress</h2>
          <ProgressTracker items={mockGenerationProgress} />
        </div>
      )}

      {/* Code preview */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-base font-semibold text-gray-700">
          Preview — <span className="font-mono text-blue-600">{mockTestPlans[0]?.functionName}</span>
        </h2>
        <textarea
          readOnly
          value={preview}
          rows={24}
          className="w-full font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none text-gray-800"
        />
      </div>
    </div>
  );
}
