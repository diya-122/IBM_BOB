import * as fs from 'fs';
import * as path from 'path';
import { globSync } from 'glob';

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
 * Detects the test framework used by the project by inspecting its
 * `package.json` dependencies and devDependencies.
 */
function detectFramework(projectPath: string): 'jest' | 'mocha' | 'unknown' {
  const pkgPath = path.join(projectPath, 'package.json');
  try {
    const raw = fs.readFileSync(pkgPath, 'utf-8');
    const pkg = JSON.parse(raw) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = {
      ...(pkg.dependencies ?? {}),
      ...(pkg.devDependencies ?? {}),
    };
    if ('jest' in allDeps || 'ts-jest' in allDeps || '@jest/core' in allDeps) {
      return 'jest';
    }
    if ('mocha' in allDeps || '@types/mocha' in allDeps) {
      return 'mocha';
    }
  } catch {
    // package.json missing or unparseable — fall through to 'unknown'.
  }
  return 'unknown';
}

/**
 * Scans a project directory to collect source and test file paths and to
 * identify the testing framework in use.
 */
export class ProjectScanner {
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
  scan(projectPath: string): ScanResult {
    const resolved = path.resolve(projectPath);

    const allFiles = globSync('**/*.{js,ts,jsx,tsx}', {
      cwd: resolved,
      absolute: true,
      ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**'],
    });

    const testFiles: string[] = [];
    const sourceFiles: string[] = [];

    for (const file of allFiles) {
      const isTest =
        file.includes('__tests__') ||
        /\.test\.[jt]sx?$/.test(file) ||
        /\.spec\.[jt]sx?$/.test(file);

      if (isTest) {
        testFiles.push(file);
      } else {
        sourceFiles.push(file);
      }
    }

    return {
      sourceFiles,
      testFiles,
      framework: detectFramework(resolved),
    };
  }
}
