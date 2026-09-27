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
 * Converts an array of risk scores into an ordered list of test plans,
 * one plan per source file (grouping all functions in that file together).
 * This ensures a single Bob call writes one comprehensive test file per
 * source file rather than one call per function overwriting the same file.
 */
export class TestPlanner {
  /**
   * Groups {@link RiskScore} entries by `filePath` and produces one
   * {@link TestPlan} per source file containing all uncovered functions.
   *
   * Priority is derived from the highest risk score found in the file.
   * `functionName` is set to the primary (highest-risk) function;
   * `functionNames` lists all functions in the file.
   *
   * `estimatedLines` is calculated as `20 + testCases.length * 8`.
   *
   * @param riskScores - Scored functions produced by {@link RiskScorer}.
   * @returns Array of {@link TestPlan} objects, one per source file.
   */
  plan(riskScores: RiskScore[]): TestPlan[] {
    // Group risk scores by file path
    const byFile = new Map<string, RiskScore[]>();
    for (const rs of riskScores) {
      const existing = byFile.get(rs.filePath) ?? [];
      existing.push(rs);
      byFile.set(rs.filePath, existing);
    }

    const plans: TestPlan[] = [];

    for (const [filePath, scores] of byFile) {
      // Scores are already sorted descending by riskScore from RiskScorer
      const topScore = scores[0];
      const functionNames = [...new Set(scores.map((s) => s.functionName))];
      const testCases = buildTestCases(topScore.functionName);

      plans.push({
        filePath,
        functionName: topScore.functionName,
        functionNames,
        priority: priorityFromScore(topScore.riskScore),
        testCases,
        estimatedLines: 20 + testCases.length * 8,
      });
    }

    // Sort plans by priority (high first)
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return plans.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }
}
