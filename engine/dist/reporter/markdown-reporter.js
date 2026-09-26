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
exports.MarkdownReporter = void 0;
const path = __importStar(require("path"));
/**
 * Formats a number as a fixed-precision percentage string.
 */
function fmt(n) {
    return n.toFixed(2) + '%';
}
/**
 * Computes the average function coverage percentage for an array of
 * {@link CoverageData} entries. Returns 0 for an empty array.
 */
function avgPct(data) {
    if (data.length === 0)
        return 0;
    return data.reduce((acc, d) => acc + d.functions.pct, 0) / data.length;
}
/**
 * Generates human-readable Markdown coverage reports.
 */
class MarkdownReporter {
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
    generate(report) {
        const beforeAvg = avgPct(report.before);
        const afterAvg = avgPct(report.after);
        const deltaSign = report.delta >= 0 ? '+' : '';
        const beforeMap = new Map(report.before.map((d) => [d.filePath, d]));
        const afterMap = new Map(report.after.map((d) => [d.filePath, d]));
        // --- Summary table ---
        const summaryRows = [
            `| Metric | Value |`,
            `|--------|-------|`,
            `| Before avg function coverage | ${fmt(beforeAvg)} |`,
            `| After avg function coverage  | ${fmt(afterAvg)} |`,
            `| Delta                        | ${deltaSign}${fmt(report.delta)} |`,
            `| Files improved               | ${report.filesImproved.length} |`,
            `| Functions newly covered      | ${report.functionsNewlyCovered.length} |`,
        ].join('\n');
        // --- Files improved table ---
        const fileTableHeader = [
            `| File | Before % | After % | Delta |`,
            `|------|----------|---------|-------|`,
        ].join('\n');
        const fileTableRows = report.filesImproved
            .map((filePath) => {
            const b = beforeMap.get(filePath);
            const a = afterMap.get(filePath);
            const bPct = b ? b.functions.pct : 0;
            const aPct = a ? a.functions.pct : 0;
            const d = aPct - bPct;
            const dSign = d >= 0 ? '+' : '';
            const shortPath = path.relative(report.projectPath, filePath);
            return `| \`${shortPath}\` | ${fmt(bPct)} | ${fmt(aPct)} | ${dSign}${fmt(d)} |`;
        })
            .join('\n');
        const filesSection = report.filesImproved.length > 0
            ? `${fileTableHeader}\n${fileTableRows}`
            : '_No files improved._';
        // --- Functions newly covered list ---
        const functionsSection = report.functionsNewlyCovered.length > 0
            ? report.functionsNewlyCovered.map((fn) => `- \`${fn}\``).join('\n')
            : '_No functions newly covered._';
        return [
            `# TestForge Coverage Report`,
            ``,
            `> Generated: ${report.timestamp}`,
            ``,
            `## Summary`,
            ``,
            summaryRows,
            ``,
            `## Files Improved`,
            ``,
            filesSection,
            ``,
            `## Functions Newly Covered`,
            ``,
            functionsSection,
            ``,
        ].join('\n');
    }
}
exports.MarkdownReporter = MarkdownReporter;
//# sourceMappingURL=markdown-reporter.js.map