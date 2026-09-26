"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectScanner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
/**
 * Detects the test framework used by the project by inspecting its
 * `package.json` dependencies and devDependencies.
 */
function detectFramework(projectPath) {
    const pkgPath = path.join(projectPath, 'package.json');
    try {
        const raw = fs.readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(raw);
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
    }
    catch {
        // package.json missing or unparseable — fall through to 'unknown'.
    }
    return 'unknown';
}
/**
 * Scans a project directory to collect source and test file paths and to
 * identify the testing framework in use.
 */
class ProjectScanner {
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
    scan(projectPath) {
        const resolved = path.resolve(projectPath);
        const allFiles = (0, glob_1.globSync)('**/*.{js,ts,jsx,tsx}', {
            cwd: resolved,
            absolute: true,
            ignore: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.git/**'],
        });
        const testFiles = [];
        const sourceFiles = [];
        for (const file of allFiles) {
            const isTest = file.includes('__tests__') ||
                /\.test\.[jt]sx?$/.test(file) ||
                /\.spec\.[jt]sx?$/.test(file);
            if (isTest) {
                testFiles.push(file);
            }
            else {
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
exports.ProjectScanner = ProjectScanner;
//# sourceMappingURL=project-scanner.js.map