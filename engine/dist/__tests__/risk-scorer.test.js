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
const fs = __importStar(require("fs"));
const risk_scorer_1 = require("../analyzer/risk-scorer");
jest.mock('fs');
const mockedFs = jest.mocked(fs);
/** Minimal source content that contains branching keywords for complexity. */
const MOCK_SOURCE = `
function doWork(x) {
  if (x > 0) {
    for (let i = 0; i < x; i++) {
      while (i > 0) { i--; }
    }
  }
}
`;
/** Two mock coverage entries: one uncovered, one fully covered. */
const coverageData = [
    {
        filePath: '/project/src/uncovered.ts',
        statements: { covered: 0, total: 10, pct: 0 },
        branches: { covered: 0, total: 4, pct: 0 },
        functions: { covered: 0, total: 3, pct: 0 },
        lines: { covered: 0, total: 10, pct: 0 },
    },
    {
        filePath: '/project/src/covered.ts',
        statements: { covered: 10, total: 10, pct: 100 },
        branches: { covered: 4, total: 4, pct: 100 },
        functions: { covered: 3, total: 3, pct: 100 },
        lines: { covered: 10, total: 10, pct: 100 },
    },
];
describe('RiskScorer', () => {
    let scorer;
    beforeEach(() => {
        scorer = new risk_scorer_1.RiskScorer();
        jest.resetAllMocks();
        // fs.readFileSync: return mock source for uncovered file, throw for covered
        mockedFs.readFileSync.mockImplementation((filePath) => {
            if (filePath === '/project/src/uncovered.ts')
                return MOCK_SOURCE;
            throw new Error('ENOENT');
        });
        // fs.readdirSync: return empty directory (no importers)
        mockedFs.readdirSync.mockReturnValue([]);
    });
    it('returns only the uncovered file', () => {
        const results = scorer.score(coverageData, '/project');
        const paths = results.map((r) => r.filePath);
        expect(paths).toContain('/project/src/uncovered.ts');
        expect(paths).not.toContain('/project/src/covered.ts');
    });
    it('assigns a riskScore of at least 1', () => {
        const results = scorer.score(coverageData, '/project');
        for (const r of results) {
            expect(r.riskScore).toBeGreaterThanOrEqual(1);
        }
    });
    it('returns results sorted descending by riskScore', () => {
        const results = scorer.score(coverageData, '/project');
        for (let i = 0; i < results.length - 1; i++) {
            expect(results[i].riskScore).toBeGreaterThanOrEqual(results[i + 1].riskScore);
        }
    });
    it('sets coveragePercent to the functions pct of the source entry', () => {
        const results = scorer.score(coverageData, '/project');
        const uncoveredResults = results.filter((r) => r.filePath === '/project/src/uncovered.ts');
        expect(uncoveredResults.length).toBeGreaterThan(0);
        for (const r of uncoveredResults) {
            expect(r.coveragePercent).toBe(0);
        }
    });
});
//# sourceMappingURL=risk-scorer.test.js.map