import { CoverageData, CoverageReport } from '../types';
/**
 * Produces coverage improvement reports by comparing two coverage snapshots.
 */
export declare class CoverageDiff {
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
    compare(before: CoverageData[], after: CoverageData[]): CoverageReport;
}
//# sourceMappingURL=coverage-diff.d.ts.map