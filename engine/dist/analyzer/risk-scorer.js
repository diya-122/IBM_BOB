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
exports.RiskScorer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Counts occurrences of branching keywords in a source string as a simple
 * cyclomatic-complexity proxy.
 */
function countBranchingKeywords(source) {
    const pattern = /\b(if|for|while|switch|catch)\b/g;
    return (source.match(pattern) ?? []).length;
}
/**
 * Returns the names of all top-level or exported functions found in a source
 * file via simple regex heuristics (handles `function foo`, `const foo =`,
 * `foo(` patterns common in JS/TS).
 */
function extractFunctionNames(source) {
    const names = new Set();
    // function declarations: function foo(
    const funcDecl = /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g;
    let m;
    while ((m = funcDecl.exec(source)) !== null) {
        names.add(m[1]);
    }
    // arrow / const functions: const foo = (  |  const foo = async (
    const arrowDecl = /(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(/g;
    while ((m = arrowDecl.exec(source)) !== null) {
        names.add(m[1]);
    }
    // class methods: foo(  at start of line (indented)
    const methodDecl = /^\s+(?:async\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gm;
    while ((m = methodDecl.exec(source)) !== null) {
        // Exclude common keywords that look like methods
        const keyword = m[1];
        if (!['if', 'for', 'while', 'switch', 'catch', 'return', 'new', 'await', 'typeof', 'instanceof'].includes(keyword)) {
            names.add(keyword);
        }
    }
    return Array.from(names);
}
/**
 * Counts how many source files in `projectPath` import the given `filePath`
 * by scanning each file with a plain string search.
 */
function countImporters(filePath, projectPath) {
    const baseName = path.basename(filePath, path.extname(filePath));
    let count = 0;
    const walk = (dir) => {
        let entries;
        try {
            entries = fs.readdirSync(dir, { withFileTypes: true });
        }
        catch {
            return;
        }
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (['node_modules', 'dist', 'coverage', '.git'].includes(entry.name))
                    continue;
                walk(full);
            }
            else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
                if (full === filePath)
                    continue;
                try {
                    const src = fs.readFileSync(full, 'utf-8');
                    if (src.includes(`'${baseName}'`) || src.includes(`"${baseName}"`)) {
                        count++;
                    }
                }
                catch {
                    // Unreadable file — skip silently.
                }
            }
        }
    };
    walk(projectPath);
    return count;
}
/**
 * Scores source files by risk based on coverage gaps and structural coupling.
 */
class RiskScorer {
    /**
     * Computes a {@link RiskScore} for every function in files whose function
     * coverage is below 100 %.
     *
     * The risk score formula is:
     *   `riskScore = max(complexity, 1) × max(importCount, 1)`
     *
     * where `complexity` is the number of branching keywords found in the
     * function's source file and `importCount` is the number of other source
     * files that import it.
     *
     * @param coverageData - Parsed coverage array (e.g. from {@link CoverageParser}).
     * @param projectPath  - Root directory of the project to scan for importers.
     * @returns Array of {@link RiskScore} sorted descending by `riskScore`.
     */
    score(coverageData, projectPath) {
        const results = [];
        for (const entry of coverageData) {
            if (entry.functions.pct >= 100)
                continue;
            let source = '';
            try {
                source = fs.readFileSync(entry.filePath, 'utf-8');
            }
            catch {
                // If the file can't be read, fall back to minimal defaults.
            }
            const functionNames = source ? extractFunctionNames(source) : ['(unknown)'];
            const complexity = Math.max(countBranchingKeywords(source), 1);
            const importCount = Math.max(countImporters(entry.filePath, projectPath), 1);
            const riskScore = complexity * importCount;
            for (const functionName of functionNames.length > 0 ? functionNames : ['(unknown)']) {
                results.push({
                    filePath: entry.filePath,
                    functionName,
                    complexity,
                    importCount,
                    riskScore,
                    coveragePercent: entry.functions.pct,
                });
            }
        }
        return results.sort((a, b) => b.riskScore - a.riskScore);
    }
}
exports.RiskScorer = RiskScorer;
//# sourceMappingURL=risk-scorer.js.map