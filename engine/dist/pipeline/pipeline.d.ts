import { CoverageData, RiskScore, GenerationResult, CoverageReport } from '../types';
export interface PipelineResult {
    projectPath: string;
    before: CoverageData[];
    after: CoverageData[];
    riskScores: RiskScore[];
    generationResults: GenerationResult[];
    runResult: {
        passed: number;
        failed: number;
    };
    report: CoverageReport;
    outputDir: string;
    ranAt: string;
}
/**
 * Runs the full TestForge pipeline against a project:
 *   analyze → generate → run tests → re-analyze → diff
 *
 * Generated test files are placed inside `<projectPath>/__testforge__/`
 * so Jest (configured in the project) can discover them.
 *
 * @param projectPath - Absolute path to the target project.
 * @param outputDir   - Where to write generated test files (default: `<projectPath>/__testforge__`).
 */
export declare function runPipeline(projectPath: string, outputDir?: string): Promise<PipelineResult>;
//# sourceMappingURL=pipeline.d.ts.map