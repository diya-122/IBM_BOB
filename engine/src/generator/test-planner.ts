import { RiskScore, TestPlan, TestCase } from '../types';

/**
 * Derives a priority level from a numeric risk score.
 */
function priorityFromScore(riskScore: number): 'high' | 'medium' | 'low' {
  if (riskScore > 15) return 'high';
  if (riskScore > 5) return 'medium';
  return 'low';
}

/**
 * Builds the three canonical {@link TestCase} objects for a given function.
 *
 * - **happy**: validates the most common successful execution path.
 * - **edge**: validates behaviour with boundary / empty / null inputs.
 * - **error**: validates that the function throws on invalid input.
 */
function buildTestCases(functionName: string): TestCase[] {
  const happy: TestCase = {
    description: `${functionName} returns expected output for valid input`,
    type: 'happy',
    inputs: 'validInput',
    expectedOutput: 'expectedResult',
  };

  const edge: TestCase = {
    description: `${functionName} handles null or empty input gracefully`,
    type: 'edge',
    inputs: 'null',
    expectedOutput: 'null or undefined or empty',
  };

  const error: TestCase = {
    description: `${functionName} throws on invalid input`,
    type: 'error',
    inputs: 'invalidInput',
    expectedOutput: 'throws an error',
  };

  return [happy, edge, error];
}

/**
 * Converts an array of risk scores into an ordered list of test plans.
 */
export class TestPlanner {
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
  plan(riskScores: RiskScore[]): TestPlan[] {
    return riskScores.map((rs) => {
      const testCases = buildTestCases(rs.functionName);
      return {
        filePath: rs.filePath,
        functionName: rs.functionName,
        priority: priorityFromScore(rs.riskScore),
        testCases,
        estimatedLines: 20 + testCases.length * 8,
      };
    });
  }
}
