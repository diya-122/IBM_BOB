import { RiskScore, TestPlan } from '../types';
/**
 * Converts an array of risk scores into an ordered list of test plans.
 */
export declare class TestPlanner {
    /**
     * Transforms {@link RiskScore} entries into {@link TestPlan} objects, each
     * containing three generated {@link TestCase} instances (happy, edge, error).
     *
     * Priority mapping:
     * - `riskScore > 15` → `'high'`
     * - `riskScore > 5`  → `'medium'`
     * - otherwise        → `'low'`
     *
     * `estimatedLines` is calculated as `20 + testCases.length * 8`.
     *
     * @param riskScores - Scored functions produced by {@link RiskScorer}.
     * @returns Array of {@link TestPlan} objects, one per risk score entry.
     */
    plan(riskScores: RiskScore[]): TestPlan[];
}
//# sourceMappingURL=test-planner.d.ts.map