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
const coverage_parser_1 = require("../analyzer/coverage-parser");
jest.mock('fs');
const mockedFs = jest.mocked(fs);
/**
 * Minimal NYC coverage-final.json with one file entry.
 * - s (statements): 3 covered, 1 not covered → 75 %
 * - b (branches):   both branches of key "0" covered → 100 %
 * - f (functions):  1 covered, 1 not covered → 50 %
 * - l (lines):      3 covered, 1 not covered → 75 %
 */
const MINIMAL_NYC_JSON = JSON.stringify({
    '/project/src/foo.ts': {
        s: { '0': 1, '1': 1, '2': 1, '3': 0 },
        b: { '0': [1, 1] },
        f: { '0': 1, '1': 0 },
        l: { '0': 1, '1': 1, '2': 1, '3': 0 },
        fnMap: {},
        statementMap: {},
        branchMap: {},
    },
});
/**
 * NYC JSON where all totals are zero, so every pct should resolve to 100.
 */
const ZERO_TOTAL_NYC_JSON = JSON.stringify({
    '/project/src/empty.ts': {
        s: {},
        b: {},
        f: {},
        l: {},
        fnMap: {},
        statementMap: {},
        branchMap: {},
    },
});
/**
 * Two-file NYC JSON for sorting tests.
 * File A: functions 0 %
 * File B: functions 100 %
 */
const TWO_FILE_NYC_JSON = JSON.stringify({
    '/project/src/b.ts': {
        s: { '0': 1 },
        b: {},
        f: { '0': 1 },
        l: { '0': 1 },
        fnMap: {},
        statementMap: {},
        branchMap: {},
    },
    '/project/src/a.ts': {
        s: { '0': 0 },
        b: {},
        f: { '0': 0 },
        l: { '0': 0 },
        fnMap: {},
        statementMap: {},
        branchMap: {},
    },
});
describe('CoverageParser', () => {
    let parser;
    beforeEach(() => {
        parser = new coverage_parser_1.CoverageParser();
        jest.resetAllMocks();
    });
    it('returns a CoverageData entry with correct statement pct', () => {
        mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
        const results = parser.parse('/fake/coverage-final.json');
        expect(results).toHaveLength(1);
        // 3 of 4 statements covered → 75 %
        expect(results[0].statements.pct).toBeCloseTo(75);
    });
    it('returns correct branch pct', () => {
        mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
        const results = parser.parse('/fake/coverage-final.json');
        // Both branches of key "0" covered → 100 %
        expect(results[0].branches.pct).toBeCloseTo(100);
    });
    it('returns correct function pct', () => {
        mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
        const results = parser.parse('/fake/coverage-final.json');
        // 1 of 2 functions covered → 50 %
        expect(results[0].functions.pct).toBeCloseTo(50);
    });
    it('resolves pct to 100 when total is zero (division-by-zero guard)', () => {
        mockedFs.readFileSync.mockReturnValue(ZERO_TOTAL_NYC_JSON);
        const results = parser.parse('/fake/coverage-final.json');
        expect(results).toHaveLength(1);
        expect(results[0].statements.pct).toBe(100);
        expect(results[0].branches.pct).toBe(100);
        expect(results[0].functions.pct).toBe(100);
        expect(results[0].lines.pct).toBe(100);
    });
    it('sorts results ascending by functions.pct (least covered first)', () => {
        mockedFs.readFileSync.mockReturnValue(TWO_FILE_NYC_JSON);
        const results = parser.parse('/fake/coverage-final.json');
        expect(results).toHaveLength(2);
        expect(results[0].functions.pct).toBeLessThanOrEqual(results[1].functions.pct);
    });
    it('populates filePath from the JSON key', () => {
        mockedFs.readFileSync.mockReturnValue(MINIMAL_NYC_JSON);
        const results = parser.parse('/fake/coverage-final.json');
        expect(results[0].filePath).toBe('/project/src/foo.ts');
    });
});
//# sourceMappingURL=coverage-parser.test.js.map