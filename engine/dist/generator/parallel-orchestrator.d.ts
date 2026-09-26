import { TestPlan, GenerationResult } from '../types';
/**
 * Runs {@link BobTestWriter} instances in parallel across all test plans,
 * shelling out to Bob Shell per function for AI-generated test content.
 */
export declare class ParallelOrchestrator {
    private readonly writer;
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
    run(plans: TestPlan[], outputDir: string): Promise<GenerationResult[]>;
}
//# sourceMappingURL=parallel-orchestrator.d.ts.map