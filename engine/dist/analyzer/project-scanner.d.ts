/**
 * Result returned by {@link ProjectScanner.scan}.
 */
export interface ScanResult {
    /** Absolute paths of all discovered source files. */
    sourceFiles: string[];
    /** Absolute paths of all discovered test files. */
    testFiles: string[];
    /** Detected test framework based on package.json dependencies. */
    framework: 'jest' | 'mocha' | 'unknown';
}
/**
 * Scans a project directory to collect source and test file paths and to
 * identify the testing framework in use.
 */
export declare class ProjectScanner {
    /**
     * Scans `projectPath` for JavaScript and TypeScript files, categorising
     * them as source or test files.
     *
     * Test files are identified by path segments matching:
     * - `__tests__/` directory
     * - `.test.` filename infix
     * - `.spec.` filename infix
     *
     * The following directories are always excluded:
     * `node_modules`, `dist`, `coverage`, `.git`.
     *
     * @param projectPath - Root directory of the project to scan.
     * @returns A {@link ScanResult} containing categorised file lists and the
     *   detected framework.
     */
    scan(projectPath: string): ScanResult;
}
//# sourceMappingURL=project-scanner.d.ts.map