import * as path from 'path';
import { CoverageData, CoverageReport } from '../types';

/**
 * Computes the average function coverage percentage across an array of
 * {@link CoverageData} objects. Returns 0 for an empty array.
 */
function avgFunctionPct(data: CoverageData[]): number {
  if (data.length === 0) return 0;
  const sum = data.reduce((acc, d) => acc + d.functions.pct, 0);
  return sum / data.length;
}

/**
 * Builds a lookup map from file path to {@link CoverageData}.
 */
function toMap(data: CoverageData[]): Map<string, CoverageData> {
  return new Map(data.map((d) => [d.filePath, d]));
}

/**
 * Produces coverage improvement reports by comparing two coverage snapshots.
 */
export class CoverageDiff {
  /**
   * Compares `before` and `after` coverage snapshots to produce a
   * {@link CoverageReport}.
   *
   * - `delta` is the difference in average function coverage percentage
   *   (`avg(after) − avg(before)`).
   * - `filesImproved` contains paths of files where `after.functions.pct >
   *   before.functions.pct`.
   * - `functionsNewlyCovered` lists `"<file>:<functionCount>"` style
   *   identifiers for each file whose covered function count increased.
   * - `projectPath` is derived from the directory of the first file in the
   *   `before` array, or `'.'` if that array is empty.
   *
   * @param before - Coverage data collected before test generation.
   * @param after  - Coverage data collected after test generation.
   * @returns A fully populated {@link CoverageReport}.
   */
  compare(before: CoverageData[], after: CoverageData[]): CoverageReport {
    const beforeMap = toMap(before);
    const afterMap = toMap(after);

    const allPaths = new Set([...beforeMap.keys(), ...afterMap.keys()]);

    const filesImproved: string[] = [];
    const functionsNewlyCovered: string[] = [];

    for (const filePath of allPaths) {
      const b = beforeMap.get(filePath);
      const a = afterMap.get(filePath);

      if (!b || !a) continue;

      if (a.functions.pct > b.functions.pct) {
        filesImproved.push(filePath);

        const newlyCovered = a.functions.covered - b.functions.covered;
        for (let i = 0; i < newlyCovered; i++) {
          functionsNewlyCovered.push(`${path.basename(filePath)}:function_${b.functions.covered + i + 1}`);
        }
      }
    }

    const projectPath =
      before.length > 0 ? path.dirname(before[0].filePath) : '.';

    return {
      timestamp: new Date().toISOString(),
      projectPath,
      before,
      after,
      delta: avgFunctionPct(after) - avgFunctionPct(before),
      filesImproved,
      functionsNewlyCovered,
    };
  }
}
