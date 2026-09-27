import * as fs from 'fs';
import { CoverageParser } from '../analyzer/coverage-parser';

jest.mock('fs');

const mockedFs = jest.mocked(fs);

/**
 * Minimal NYC coverage-final.json with one file entry (Istanbul v1 — has `l`).
 * - s (statements): 3 covered, 1 not covered → 75 %
 * - b (branches):   both branches of key "0" covered → 100 %
 * - f (functions):  1 covered, 1 not covered → 50 %
 * - l (lines):      3 covered, 1 not covered → 75 %
 */
const MINIMAL_NYC_JSON = JSON.stringify({
  '/project/src/foo.ts': {
    s: { '0': 1, '1': 1, '2': 1, '3': 0 },
    b: { '0': [1, 1] },
    f: { '0': 1, '1': 0 },
    l: { '0': 1, '1': 1, '2': 1, '3': 0 },
    fnMap: {},
    statementMap: {},
    branchMap: {},
  },
});

/**
 * Istanbul v2 / modern Jest coverage — no `l` map.
 * Lines must be derived from statementMap + s.
 * statementMap: 3 unique lines (1, 2, 3); line 1 has two statements (s0 hit, s1 not)
 *   → line 1 covered (s0 hit), line 2 covered (s2 hit), line 3 NOT covered (s3 miss)
 *   → 2 covered / 3 total → 66.67 %
 */
const V2_NYC_JSON = JSON.stringify({
  '/project/src/bar.ts': {
    s: { '0': 1, '1': 0, '2': 1, '3': 0 },
    b: {},
    f: {},
    fnMap: {},
    statementMap: {
      '0': { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
      '1': { start: { line: 1, column: 12 }, end: { line: 1, column: 20 } },
      '2': { start: { line: 2, column: 0 }, end: { line: 2, column: 10 } },
      '3': { start: { line: 3, column: 0 }, end: { line: 3, column: 10 } },
    },
    branchMap: {},
  },
});

/**
 * NYC JSON where all totals are zero, so every pct should resolve to 100.
 */
const ZERO_TOTAL_NYC_JSON = JSON.stringify({
  '/project/src/empty.ts': {
    s: {},
    b: {},
    f: {},
    l: {},
    fnMap: {},
    statementMap: {},
    branchMap: {},
  },
});

/**
 * Two-file NYC JSON for sorting tests.
 * File A: functions 0 %
 * File B: functions 100 %
 */
const TWO_FILE_NYC_JSON = JSON.stringify({
  '/project/src/b.ts': {
    s: { '0': 1 },
    b: {},
    f: { '0': 1 },
    l: { '0': 1 },
    fnMap: {},
    statementMap: {},
    branchMap: {},
  },
  '/project/src/a.ts': {
    s: { '0': 0 },
    b: {},
    f: { '0': 0 },
    l: { '0': 0 },
    fnMap: {},
    statementMap: {},
    branchMap: {},
  },
});

describe('CoverageParser', () => {
  let parser: CoverageParser;

  beforeEach(() => {
    parser = new CoverageParser();
    jest.resetAllMocks();
  });

  it('returns a CoverageData entry with correct statement pct', () => {
    mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    expect(results).toHaveLength(1);
    // 3 of 4 statements covered → 75 %
    expect(results[0].statements.pct).toBeCloseTo(75);
  });

  it('returns correct branch pct', () => {
    mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    // Both branches of key "0" covered → 100 %
    expect(results[0].branches.pct).toBeCloseTo(100);
  });

  it('returns correct function pct', () => {
    mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    // 1 of 2 functions covered → 50 %
    expect(results[0].functions.pct).toBeCloseTo(50);
  });

  it('resolves pct to 100 when total is zero (division-by-zero guard)', () => {
    mockedFs.readFileSync.mockReturnValue(ZERO_TOTAL_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    expect(results).toHaveLength(1);
    expect(results[0].statements.pct).toBe(100);
    expect(results[0].branches.pct).toBe(100);
    expect(results[0].functions.pct).toBe(100);
    expect(results[0].lines.pct).toBe(100);
  });

  it('sorts results ascending by functions.pct (least covered first)', () => {
    mockedFs.readFileSync.mockReturnValue(TWO_FILE_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    expect(results).toHaveLength(2);
    expect(results[0].functions.pct).toBeLessThanOrEqual(results[1].functions.pct);
  });

  it('populates filePath from the JSON key', () => {
    mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    expect(results[0].filePath).toBe('/project/src/foo.ts');
  });

  it('derives lines from statementMap when `l` map is absent (Istanbul v2)', () => {
    mockedFs.readFileSync.mockReturnValue(V2_NYC_JSON);
    const results = parser.parse('/fake/coverage-final.json');
    expect(results).toHaveLength(1);
    // 3 unique lines; line 1 covered (s0 hit), line 2 covered (s2 hit), line 3 not (s3 miss)
    expect(results[0].lines.total).toBe(3);
    expect(results[0].lines.covered).toBe(2);
    expect(results[0].lines.pct).toBeCloseTo(66.67);
  });
});
