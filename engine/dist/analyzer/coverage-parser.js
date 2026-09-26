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
exports.CoverageParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Computes a {@link CoverageMetric} from a flat count map.
 * Division by zero resolves to 100 % (the item is considered fully covered
 * when there is nothing to cover).
 */
function metricFromMap(counts) {
    if (!counts)
        return { covered: 0, total: 0, pct: 100 };
    const values = Object.values(counts);
    const total = values.length;
    const covered = values.filter((v) => v > 0).length;
    const pct = total === 0 ? 100 : (covered / total) * 100;
    return { covered, total, pct };
}
/**
 * Computes a {@link CoverageMetric} for branches, which are stored as arrays
 * of hit counts rather than scalar values.
 */
function branchMetricFromMap(counts) {
    if (!counts)
        return { covered: 0, total: 0, pct: 100 };
    const flat = Object.values(counts).flat();
    const total = flat.length;
    const covered = flat.filter((v) => v > 0).length;
    const pct = total === 0 ? 100 : (covered / total) * 100;
    return { covered, total, pct };
}
/**
 * Parses NYC/Istanbul coverage JSON files into a normalised array of
 * {@link CoverageData} objects.
 */
class CoverageParser {
    /**
     * Reads an NYC `coverage-final.json` file and converts each entry into a
     * {@link CoverageData} object.
     *
     * @param coveragePath - Absolute or relative path to the
     *   `coverage-final.json` produced by NYC.
     * @returns Array of {@link CoverageData} sorted ascending by function
     *   coverage percentage (least-covered files first).
     */
    parse(coveragePath) {
        const resolvedPath = path.resolve(coveragePath);
        const raw = fs.readFileSync(resolvedPath, 'utf-8');
        const json = JSON.parse(raw);
        const results = Object.entries(json).map(([filePath, entry]) => {
            return {
                filePath,
                statements: metricFromMap(entry.s),
                branches: branchMetricFromMap(entry.b),
                functions: metricFromMap(entry.f),
                lines: metricFromMap(entry.l),
            };
        });
        return results.sort((a, b) => a.functions.pct - b.functions.pct);
    }
}
exports.CoverageParser = CoverageParser;
//# sourceMappingURL=coverage-parser.js.map