import ora from 'ora';
import chalk from 'chalk';
import { TestPlan, GenerationResult } from '../types';
import { BobTestWriter } from './bob-test-writer';

/**
 * Groups test plans by the priority label for progressive spinner feedback.
 */
function groupByPriority(plans: TestPlan[]): Map<string, TestPlan[]> {
  const groups = new Map<string, TestPlan[]>([
    ['high', []],
    ['medium', []],
    ['low', []],
  ]);
  for (const plan of plans) {
    groups.get(plan.priority)!.push(plan);
  }
  return groups;
}

/**
 * Runs {@link BobTestWriter} instances in parallel across all test plans,
 * shelling out to Bob Shell per function for AI-generated test content.
 */
export class ParallelOrchestrator {
  private readonly writer = new BobTestWriter();

  /**
   * Executes test generation for every plan in `plans` concurrently using
   * `Promise.allSettled`, displaying an `ora` spinner while each priority
   * group is in flight.
   *
   * Both fulfilled and rejected settlements are converted to
   * {@link GenerationResult} objects so callers always receive a full result
   * array regardless of individual failures.
   *
   * @param plans     - Test plans to generate, typically produced by
   *   {@link TestPlanner}.
   * @param outputDir - Directory passed through to {@link TestWriter.write}.
   * @returns Promise resolving to an array of {@link GenerationResult}, one
   *   per plan.
   */
  async run(plans: TestPlan[], outputDir: string): Promise<GenerationResult[]> {
    const groups = groupByPriority(plans);
    const allResults: GenerationResult[] = [];

    for (const [priority, group] of groups) {
      if (group.length === 0) continue;

      const spinner = ora(
        chalk.cyan(`Generating ${group.length} ${priority}-priority test(s)…`),
      ).start();

      const settlements = await Promise.allSettled(
        group.map((plan) => this.writer.write(plan, outputDir)),
      );

      let succeeded = 0;
      let failed = 0;

      for (const settlement of settlements) {
        if (settlement.status === 'fulfilled') {
          allResults.push(settlement.value);
          if (settlement.value.success) {
            succeeded++;
          } else {
            failed++;
          }
        } else {
          failed++;
          // Convert the rejection into a GenerationResult so callers have a
          // uniform structure to work with.
          const errorMessage =
            settlement.reason instanceof Error
              ? settlement.reason.message
              : String(settlement.reason);
          allResults.push({
            filePath: group[settlements.indexOf(settlement)]?.filePath ?? 'unknown',
            success: false,
            error: errorMessage,
            testsGenerated: 0,
          });
        }
      }

      if (failed === 0) {
        spinner.succeed(
          chalk.green(`✔ ${priority}: ${succeeded} file(s) generated`),
        );
      } else {
        spinner.warn(
          chalk.yellow(`⚠ ${priority}: ${succeeded} succeeded, ${failed} failed`),
        );
      }
    }

    return allResults;
  }
}
