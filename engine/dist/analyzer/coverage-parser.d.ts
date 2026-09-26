import { CoverageData } from '../types';
/**
 * Parses NYC/Istanbul coverage JSON files into a normalised array of
 * {@link CoverageData} objects.
 */
export declare class CoverageParser {
    /**
     * Reads an NYC `coverage-final.json` file and converts each entry into a
     * {@link CoverageData} object.
     *
     * @param coveragePath - Absolute or relative path to the
     *   `coverage-final.json` produced by NYC.
     * @returns Array of {@link CoverageData} sorted ascending by function
     *   coverage percentage (least-covered files first).
     */
    parse(coveragePath: string): CoverageData[];
}
//# sourceMappingURL=coverage-parser.d.ts.map