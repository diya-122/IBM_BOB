import * as fs from 'fs';
import * as path from 'path';
import { CoverageData, CoverageMetric } from '../types';

/**
 * Shape of a single file entry inside an NYC coverage-final.json.
 * Each map key is a statement/branch/function/line index (as string).
 */
interface StatementLocation {
  start: { line: number; column: number };
  end: { line: number; column: number };
}

interface NycFileCoverage {
  s: Record<string, number>;
  b: Record<string, number[]>;
  f: Record<string, number>;
  /** Present in Istanbul v1 output; absent in v2 / modern Jest coverage. */
  l?: Record<string, number>;
  fnMap: Record<string, { name: string; decl: unknown; loc: unknown; type: string }>;
  statementMap: Record<string, StatementLocation>;
  branchMap: Record<string, unknown>;
}

/**
 * Computes a {@link CoverageMetric} from a flat count map.
 * Division by zero resolves to 100 % (the item is considered fully covered
 * when there is nothing to cover).
 */
function metricFromMap(counts: Record<string, number> | null | undefined): CoverageMetric {
  if (!counts) return { covered: 0, total: 0, pct: 100 };
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
function branchMetricFromMap(counts: Record<string, number[]> | null | undefined): CoverageMetric {
  if (!counts) return { covered: 0, total: 0, pct: 100 };
  const flat = Object.values(counts).flat();
  const total = flat.length;
  const covered = flat.filter((v) => v > 0).length;
  const pct = total === 0 ? 100 : (covered / total) * 100;
  return { covered, total, pct };
}

/**
 * Derives a lines metric from statementMap + s when the `l` map is absent.
 *
 * Istanbul v2 (used by modern Jest) no longer writes an `l` map into
 * coverage-final.json. We reconstruct it by grouping each statement by its
 * start line: a line is "covered" if at least one statement on that line was
 * hit at least once.
 */
function linesFromStatements(
  s: Record<string, number>,
  statementMap: Record<string, StatementLocation>,
): CoverageMetric {
  const lineCovered = new Map<number, boolean>();
  for (const [idx, loc] of Object.entries(statementMap)) {
    const line = loc.start.line;
    const hit = (s[idx] ?? 0) > 0;
    // A line is covered if any statement on it was hit.
    lineCovered.set(line, (lineCovered.get(line) ?? false) || hit);
  }
  const total = lineCovered.size;
  const covered = [...lineCovered.values()].filter(Boolean).length;
  const pct = total === 0 ? 100 : (covered / total) * 100;
  return { covered, total, pct };
}

/**
 * Parses NYC/Istanbul coverage JSON files into a normalised array of
 * {@link CoverageData} objects.
 */
export class CoverageParser {
  /**
   * Reads an NYC `coverage-final.json` file and converts each entry into a
   * {@link CoverageData} object.
   *
   * @param coveragePath - Absolute or relative path to the
   *   `coverage-final.json` produced by NYC.
   * @returns Array of {@link CoverageData} sorted ascending by function
   *   coverage percentage (least-covered files first).
   */
  parse(coveragePath: string): CoverageData[] {
    const resolvedPath = path.resolve(coveragePath);
    const raw = fs.readFileSync(resolvedPath, 'utf-8');
    const json = JSON.parse(raw) as Record<string, NycFileCoverage>;

    const results: CoverageData[] = Object.entries(json).map(([filePath, entry]) => {
      // Use the legacy `l` map when present; otherwise derive from statementMap.
      const lines = entry.l
        ? metricFromMap(entry.l)
        : linesFromStatements(entry.s, entry.statementMap);
      return {
        filePath,
        statements: metricFromMap(entry.s),
        branches: branchMetricFromMap(entry.b),
        functions: metricFromMap(entry.f),
        lines,
      };
    });

    return results.sort((a, b) => a.functions.pct - b.functions.pct);
  }
}
