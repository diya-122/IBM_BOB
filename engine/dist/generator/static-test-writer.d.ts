import { TestPlan, GenerationResult } from '../types';
/**
 * Generates runnable Jest test files via deep static source analysis.
 *
 * IBM Bob runs as a desktop IDE (no `bob --print` CLI); shelling out is not
 * possible. Instead, this writer:
 *  1. Parses the source to find all exported functions.
 *  2. Extracts parameter names and body snippets per function.
 *  3. Detects whether functions are direct-call utilities or Express route
 *     handlers and generates the appropriate test style.
 *  4. Uses relative imports and proper `require()` vs `import` syntax.
 */
export declare class StaticTestWriter {
    /**
     * Writes a runnable Jest test file for `plan` to `outputDir/__tests__/`.
     */
    write(plan: TestPlan, outputDir: string): Promise<GenerationResult>;
}
//# sourceMappingURL=static-test-writer.d.ts.map