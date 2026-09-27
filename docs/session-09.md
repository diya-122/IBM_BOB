# Session 09 — UI wiring: live data on Dashboard and Generate pages

**Date:** 2025-07-17  
**Goal:** Replace hardcoded mock data on `DashboardPage` with live pipeline results; fix the Generate page risk table showing stale 0.0% coverage after a successful run.

---

## What Was Done

### Priority 1 — Wire DashboardPage to live data

**Problem:** `DashboardPage.tsx` imported `mockCoverageData`, `mockTrendData`, `mockGenerationProgress`, and `mockRiskScores` directly and displayed fabricated "Week 1–6" trend values (28% → 87%) and fixed card values (30.6% coverage, 8 files, 26 tests, 7.9 avg risk).

**Fix applied to [`dashboard/src/pages/DashboardPage.tsx`](../dashboard/src/pages/DashboardPage.tsx):**

- Replaced all mock imports with a single `useReport()` call (the same hook already used by `ReportsPage`).
- The four summary cards now derive from the live `CoverageReport`:
  - **Overall Coverage** — `avg(report.after[*].functions.pct)`
  - **Files Analyzed** — `report.after.length`
  - **Functions Covered** — `report.functionsNewlyCovered.length`
  - **Coverage Delta** — `report.delta` with a `beforeAvg → afterAvg` subtitle
- Replaced the fabricated weekly line chart with a **per-file Before vs After bar chart** using `report.before` and `report.after`. No multi-run history is available yet, so a single-run grouped bar is the honest representation.
- Added a `Last pipeline run` timestamp/project path subtitle sourced from `report.timestamp` and `report.projectPath`.
- Loading / no-data states added (matches `ReportsPage` pattern).

---

### Priority 2 — Fix Generate page risk table showing 0.0% post-run

**Problem:** `TestGenerationPage.tsx` fell back to `mockRiskScores` (all `coveragePercent: 0.0`) when no pipeline had run, and even after a successful run `data.riskScores` reflected the *pre-run* analysis (scored against `beforeCoverage`), so `coveragePercent` remained 0.0% for every function.

**Fix applied to [`dashboard/src/pages/TestGenerationPage.tsx`](../dashboard/src/pages/TestGenerationPage.tsx):**

- Removed `mockRiskScores` and `mockGenerationProgress` fallback imports.
- After a successful `/pipeline` POST, the response `data.after` (`CoverageData[]`) is used to build a `filePath → functions.pct` map.
- Each `RiskScore` entry is enriched: `coveragePercent` is overwritten with the post-run function-coverage percentage for that file.
- `displayRisks` is now the enriched live array, with no mock fallback.
- Added a proper empty-state panel when no pipeline run has happened yet ("Run the pipeline to see the function risk table with live coverage data.").
- Removed the `ProgressTracker` block that rendered a hardcoded mock generation progress list.
- Cleaned the pipeline error banner (removed stale "showing mock data" note).

---

### Priority 3 — Fix all TypeScript errors

**`import.meta.env` — two errors in `useApi.ts` and `TestGenerationPage.tsx`:**

Cause: `vite/client` types were not referenced in tsconfig, so `ImportMeta.env` was unknown.

**Fix applied to [`dashboard/tsconfig.json`](../dashboard/tsconfig.json):**

```json
"types": ["vite/client"]
```

**`CoverageHeatmap` Treemap `onClick` overload mismatch:**

Cause: `recharts` `Treemap` `onClick` expects `(node: TreemapNode) => void` but the handler was typed as `(item: TreemapItem) => void` — `TreemapNode` doesn't carry the custom `size`/`pct` fields at the type level.

**Fix applied to [`dashboard/src/components/CoverageHeatmap.tsx`](../dashboard/src/components/CoverageHeatmap.tsx):**

```tsx
// Before
onClick={(item: TreemapItem) => handleClick(item)}

// After — accept unknown at the boundary, cast internally
onClick={(item: unknown) => handleClick(item as TreemapItem)}
```

**Result:** `npx tsc --noEmit` exits clean — **0 errors**.

---

### Priority 4 — README overhaul

Updated [`README.md`](../README.md) to reflect the final project state:

- Added **Team Glitch** section with all three members and GitHub handles
- Updated **Results** table with final numbers: 10% → 100% function coverage, 124 tests passing, ~0.878 Bobcoins total cost
- Replaced "Quick Start" with a numbered **How to Run / Replicate** guide covering clone → API key → build → server → dashboard → pipeline (UI, curl, and Make options) → Docker
- Expanded **Project Structure** to show subdirectory detail
- Rewrote **Dashboard Views** table to match current page behaviour (live data, no mock)
- Added **Bob Sessions** table (sessions 01–09) with two embedded screenshots
- Removed stale "Built by Dhriti Manoj" single-contributor attribution

---

### Priority 5 — Fix Lines metric showing 0/0

**Root cause:** Istanbul v2 (used by modern Jest's built-in coverage) no longer writes an `l` (line) map into `coverage-final.json`. The `_coverageSchema` hash changes between versions — v2 omits `l` entirely and relies on `statementMap` (which it always emits) for line-level data. `CoverageParser` was calling `metricFromMap(entry.l)` which hit the `!counts` guard and returned `{ covered: 0, total: 0, pct: 100 }` — producing the 0/0 display.

**Fix applied to [`engine/src/analyzer/coverage-parser.ts`](../engine/src/analyzer/coverage-parser.ts):**

Added `linesFromStatements(s, statementMap)`: groups each statement index by its `start.line`; a line is marked covered if any statement on it has a hit count > 0. When `entry.l` is absent (v2), this function is used instead.

```typescript
// Before
lines: metricFromMap(entry.l as Record<string, number> | undefined),

// After
const lines = entry.l
  ? metricFromMap(entry.l)                         // Istanbul v1 — use l map directly
  : linesFromStatements(entry.s, entry.statementMap); // Istanbul v2 — derive from statementMap
```

Verified against real `coverage-final.json` — all 7 source files now show real line counts (e.g. `db.js`: 14/14, `helpers.js`: 22/22).

**Test added to [`engine/src/__tests__/coverage-parser.test.ts`](../engine/src/__tests__/coverage-parser.test.ts):**

New fixture `V2_NYC_JSON` with no `l` key; asserts `lines.total=3`, `lines.covered=2`, `lines.pct≈66.67`.

**Also fixed — pre-existing engine build errors:**

`@types/express` and `dotenv` were missing from engine devDependencies, causing 4 TypeScript errors in `server.ts` and `bob-test-writer.ts`. Installed both; engine now builds with **0 errors**.

**Final validation:**
- `cd engine && npm test` → **11/11 passing** (7 original + 1 new coverage-parser test + 3 risk-scorer)
- `cd engine && npm run build` → **0 errors**
- `cd dashboard && npx tsc --noEmit` → **0 errors**

---

## What Remains

- [ ] Consider caching generated test files to avoid regenerating unchanged source
