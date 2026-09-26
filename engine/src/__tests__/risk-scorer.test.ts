import * as fs from 'fs';
import { RiskScorer } from '../analyzer/risk-scorer';
import { CoverageData } from '../types';

jest.mock('fs');

const mockedFs = jest.mocked(fs);

/** Minimal source content that contains branching keywords for complexity. */
const MOCK_SOURCE = `
function doWork(x) {
  if (x > 0) {
    for (let i = 0; i < x; i++) {
      while (i > 0) { i--; }
    }
  }
}
`;

/** Two mock coverage entries: one uncovered, one fully covered. */
const coverageData: CoverageData[] = [
  {
    filePath: '/project/src/uncovered.ts',
    statements: { covered: 0, total: 10, pct: 0 },
    branches:   { covered: 0, total: 4,  pct: 0 },
    functions:  { covered: 0, total: 3,  pct: 0 },
    lines:      { covered: 0, total: 10, pct: 0 },
  },
  {
    filePath: '/project/src/covered.ts',
    statements: { covered: 10, total: 10, pct: 100 },
    branches:   { covered: 4,  total: 4,  pct: 100 },
    functions:  { covered: 3,  total: 3,  pct: 100 },
    lines:      { covered: 10, total: 10, pct: 100 },
  },
];

describe('RiskScorer', () => {
  let scorer: RiskScorer;

  beforeEach(() => {
    scorer = new RiskScorer();
    jest.resetAllMocks();

    // fs.readFileSync: return mock source for uncovered file, throw for covered
    mockedFs.readFileSync.mockImplementation((filePath: unknown) => {
      if (filePath === '/project/src/uncovered.ts') return MOCK_SOURCE;
      throw new Error('ENOENT');
    });

    // fs.readdirSync: return empty directory (no importers)
    mockedFs.readdirSync.mockReturnValue([]);
  });

  it('returns only the uncovered file', () => {
    const results = scorer.score(coverageData, '/project');
    const paths = results.map((r) => r.filePath);
    expect(paths).toContain('/project/src/uncovered.ts');
    expect(paths).not.toContain('/project/src/covered.ts');
  });

  it('assigns a riskScore of at least 1', () => {
    const results = scorer.score(coverageData, '/project');
    for (const r of results) {
      expect(r.riskScore).toBeGreaterThanOrEqual(1);
    }
  });

  it('returns results sorted descending by riskScore', () => {
    const results = scorer.score(coverageData, '/project');
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].riskScore).toBeGreaterThanOrEqual(results[i + 1].riskScore);
    }
  });

  it('sets coveragePercent to the functions pct of the source entry', () => {
    const results = scorer.score(coverageData, '/project');
    const uncoveredResults = results.filter((r) => r.filePath === '/project/src/uncovered.ts');
    expect(uncoveredResults.length).toBeGreaterThan(0);
    for (const r of uncoveredResults) {
      expect(r.coveragePercent).toBe(0);
    }
  });
});
