import { TestPlan, GenerationResult } from '../types';
/**
 * Generates Jest test files by shelling out to `bob run`.
 *
 * Falls back to {@link StaticTestWriter} if:
 *  - `bob` is not on PATH (ENOENT), or
 *  - `bob run` exits with a non-zero code, or
 *  - the JSON response cannot be parsed.
 *
 * The `generator` field in the returned {@link GenerationResult} indicates
 * which path was taken ('bob' | 'static').  `sessionCost` records the
 * Bobcoin spend from `stats.session_costs` when available.
 */
export declare class BobTestWriter {
    write(plan: TestPlan, outputDir: string): Promise<GenerationResult>;
}
//# sourceMappingURL=bob-test-writer.d.ts.map