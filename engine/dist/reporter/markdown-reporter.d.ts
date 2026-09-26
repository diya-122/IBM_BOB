import { CoverageReport } from '../types';
/**
 * Generates human-readable Markdown coverage reports.
 */
export declare class MarkdownReporter {
    /**
     * Converts a {@link CoverageReport} into a complete Markdown document
     * suitable for publishing in a pull request, wiki, or static site.
     *
     * The document structure is:
     * 1. **H1** — "TestForge Coverage Report" with timestamp
     * 2. **Summary table** — before avg %, after avg %, delta, files improved,
     *    functions newly covered
     * 3. **H2 "Files Improved"** — table with file, before %, after %, delta
     * 4. **H2 "Functions Newly Covered"** — bulleted list
     *
     * @param report - The coverage comparison report to render.
     * @returns A complete Markdown string.
     */
    generate(report: CoverageReport): string;
}
//# sourceMappingURL=markdown-reporter.d.ts.map