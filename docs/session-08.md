# Session 08 — Full-coverage scope expansion: all 6 files, all functions

**Date:** 2025-07-17  
**Goal:** Raise function coverage from ~11.5% to 70–80%+ by widening test generation to all source files and all uncovered functions. Confirm `db.js` and `helpers.js` are included. Log total session cost.

---

## What Was Done

### Priority 1 — Fix `TestPlanner` to group by file (one plan per source file)

**Root cause:** `TestPlanner.plan()` previously generated one `TestPlan` per *function* entry from `RiskScorer`. Since `BobTestWriter` names output files by *source file basename* (e.g. `users.generated.test.js`), multiple Bob calls for the same file overwrote each other — only the last function's test survived. For a file with 5 functions, 4 Bob calls' work was silently discarded.

**Fix applied to [`engine/src/generator/test-planner.ts`](../engine/src/generator/test-planner.ts):**

Replaced the flat `map()` with a `Map`-based grouping loop:

```typescript
// Before: one TestPlan per RiskScore entry (one per function)
plan(riskScores: RiskScore[]): TestPlan[] {
  return riskScores.map((rs) => { … });
}

// After: group by filePath → one TestPlan per source file
plan(riskScores: RiskScore[]): TestPlan[] {
  const byFile = new Map<string, RiskScore[]>();
  for (const rs of riskScores) { … }
  // produce one plan per file, functionNames = all functions in the file
}
```

**Fix applied to [`engine/src/types.ts`](../engine/src/types.ts):**

Added `functionNames: string[]` to `TestPlan` (alongside the existing `functionName` primary field).

---

### Priority 2 — Route ALL functions through `BobTestWriter` with full-file prompts

**Fix applied to [`engine/src/generator/bob-test-writer.ts`](../engine/src/generator/bob-test-writer.ts):**

`buildPrompt` now takes `fnNames: string[]` and asks Bob to cover **all** functions in one call:

```typescript
// Before
`Write a complete Jest test file for ${fnName} in ${relFile}.`

// After
`Write a complete Jest test file covering ALL of the following functions in ${relFile}: ${fnList}.
 Include at least one test (happy path, edge case, and error case where applicable) for each function.`
```

`--max-cost` raised from `0.30` → `0.50` and `--max-turns` from `3` → `5` to accommodate larger per-file prompts.

---

### Priority 3 — Keep TDZ fix, add `clearAllMocks` guard

Both existing prompt safety instructions from session 06/07 were preserved:
- TDZ fix: mock Express `res` properties as separate `jest.fn()` declarations
- Date.UTC arithmetic fix

**New prompt instruction added:**
```
Add a beforeEach(() => jest.clearAllMocks()) inside every describe block
so mock call counts reset between tests.
```

This fixed 7 test failures in `users.js` and `orders.js` where the shared in-memory `db` module accumulated `jest.fn()` call counts across tests, causing `expect(db.update).not.toHaveBeenCalled()` to fail.

`--max-cost` guard: `0.50` per file. `--max-turns` guard: `5`. Both preserved.

---

### Priority 4 — Clean pipeline run results

**Steps:**
1. Cleared `sample-app/__testforge__/__tests__/` entirely.
2. Rebuilt `engine/dist` cleanly (0 TypeScript errors).
3. Ran full pipeline: `analyze → generate → run → re-analyze → diff`.

**Generator outcome (initial run):**

| File | Generator | Functions covered | Tests | Pass | Fail |
|---|---|---|---|---|---|
| `orders.js` | **bob** | 5/5 | 18 | 18 ✅ | 0 |
| `products.js` | **bob** | 5/5 | 19 | 19 ✅ | 0 |
| `users.js` | **bob** | 5/5 | 16 | 16 ✅ | 0 |
| `helpers.js` | **bob** | 4/4 | 35 | 35 ✅ | 0 |
| `db.js` | **bob** | 8/8 | 25 | 25 ✅ | 0 |
| `app.js` | **bob** | 2/2 | 8 | 8 ✅ | 0 |

*All 6 source files generated via Bob API — no static fallback used.*

**Initial run required one fix cycle:**
- First generation: `app.generated.test.js` contained `helpers.js` source (Bob read the wrong file). `users.js` and `orders.js` had 7 mock-isolation failures.
- Added `clearAllMocks` instruction to prompt. Regenerated 3 files (`app`, `users`, `orders`).
- Final result: **121 passing, 0 failing** across all 6 generated test files.

**Total: 121 generated + 3 hand-written = 124 passing, 0 failing.** ✅

---

### Priority 5 — Coverage diff

| Metric | Before (hand-written tests only) | After (all generated tests) | Δ |
|---|---|---|---|
| Statements | 40.91% | **100.00%** | **+59.09 pp** |
| Branches | 4.05% | **100.00%** | **+95.95 pp** |
| Functions | 10.00% | **100.00%** | **+90.00 pp** |
| Lines | — | — | — |

*Lines metric is 0/0 (not tracked by this NYC config — line counts collapse into statements).*

**Target: 70–80% function coverage. Achieved: 100%.** ✅

---

### Priority 6 — Session cost

| File | Bob cost (Bobcoins) |
|---|---|
| `orders.js` (initial) | 0.1180 |
| `products.js` | 0.1028 |
| `users.js` (initial) | 0.1007 |
| `helpers.js` | 0.1145 |
| `db.js` | 0.0733 |
| `app.js` (initial) | 0.1201 |
| `users.js` (retry) | 0.0754 |
| `orders.js` (retry) | 0.1054 |
| `app.js` (retry) | 0.0691 |
| **Total** | **~0.878 Bobcoins** |

Cost logged via `totalSessionCost` field added to `PipelineResult` in [`engine/src/pipeline/pipeline.ts`](../engine/src/pipeline/pipeline.ts) and printed to stdout on every pipeline run.

---

### Priority 7 — `pipeline-result.json` freshness

- `pipeline-result.json` at `engine/pipeline-result.json` is overwritten after every `/pipeline` POST.
- On server startup, `loadFromDisk()` reads it fresh — no in-memory caching that would serve stale data.
- Dashboard's `/report` endpoint reads `lastPipeline.report` which is populated from the disk-loaded value on startup and overwritten live on each pipeline run.

---

## What Remains

- [ ] Investigate why `Lines` metric shows 0/0 (may need `.nycrc.json` tweak to enable line instrumentation separately)
- [ ] Add GitHub Actions CI (`.github/workflows/ci.yml`)
- [ ] Consider caching generated test files to avoid regenerating when source hasn't changed

---

## Review Notes

- **Root cause of 11.5% function coverage** was the per-function plan model: `N` functions in one file → `N` Bob calls each writing the same filename → only the last survived. Grouping by file fixes this structurally.
- `db.js` and `helpers.js` were **always** in `coverage-final.json`. They were not "skipped" by the planner — they were overwritten. Session 07 note that they were "low priority / skipped" was inaccurate; the overwrite bug was the real cause.
- `clearAllMocks` instruction is now baked into the prompt template permanently — no hand-editing of generated files required.
- All 6 files went through Bob (no static fallback), confirming the API key path fires for every file.
- 100% coverage is an upper bound for this codebase; the generated tests exercise every route handler branch including 404 and validation error paths.
