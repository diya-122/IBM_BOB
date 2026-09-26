import { TestPlan, GenerationResult } from '../types';
/**
 * Generates Jest test files from {@link TestPlan} objects.
 */
export declare class TestWriter {
    /**
     * Writes a Jest test file for the given {@link TestPlan} to `outputDir`.
     *
     * The output path is:
     * `<outputDir>/__tests__/<basename>.generated.test.ts`
     *
     * The function reads the target source file to extract the function
     * signature before rendering the test template.
     *
     * @param plan      - The test plan describing the function and test cases.
     * @param outputDir - Directory under which the `__tests__` folder is created.
     * @returns A {@link GenerationResult} indicating success or failure.
     */
    write(plan: TestPlan, outputDir: string): Promise<GenerationResult>;
}
//# sourceMappingURL=test-writer.d.ts.map