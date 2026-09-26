import { CoverageData, RiskScore } from '../types';
export { RiskScore };
/**
 * Scores source files by risk based on coverage gaps and structural coupling.
 */
export declare class RiskScorer {
    /**
     * Computes a {@link RiskScore} for every function in files whose function
     * coverage is below 100 %.
     *
     * The risk score formula is:
     *   `riskScore = max(complexity, 1) × max(importCount, 1)`
     *
     * where `complexity` is the number of branching keywords found in the
     * function's source file and `importCount` is the number of other source
     * files that import it.
     *
     * @param coverageData - Parsed coverage array (e.g. from {@link CoverageParser}).
     * @param projectPath  - Root directory of the project to scan for importers.
     * @returns Array of {@link RiskScore} sorted descending by `riskScore`.
     */
    score(coverageData: CoverageData[], projectPath: string): RiskScore[];
}
//# sourceMappingURL=risk-scorer.d.ts.map