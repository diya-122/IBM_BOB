# Session 01 — Initial Scaffold

**Date:** 2025-01-30  
**Goal:** Bootstrap the entire TestForge monorepo from scratch based on the project prompt.

---

## What Was Done

### Root Configuration
- `package.json` — npm workspaces: `engine`, `dashboard`, `sample-app`
- `README.md` — project description, Mermaid architecture diagram, quick-start, tech stack table, hackathon context, MIT license placeholder
- `docker-compose.yml` — three services: engine (node:20-alpine), dashboard (port 5173), sample-app (port 3000) with shared coverage volume
- `.eslintrc.json` — ESLint with TypeScript + React plugins, `no-explicit-any: error`
- `.prettierrc` — semi, singleQuote, 2 spaces, 100 printWidth
- `Makefile` — targets: install, build, dev-dashboard, dev-sample-app, analyze, generate, report, test, lint, clean, docker-up, docker-down
- `bob_sessions/.gitkeep` — session screenshots placeholder
- `docs/` — this folder, for per-session reports

### Engine Package (`engine/`)
Full Node.js CLI in TypeScript (`@testforge/engine`, bin: `testforge`):

| File | Purpose |
|---|---|
| `package.json` / `tsconfig.json` | Package config, strict TS, ES2020/commonjs |
| `src/types.ts` | Shared interfaces: CoverageData, RiskScore, TestCase, TestPlan, GenerationResult, CoverageReport |
| `src/index.ts` | Commander CLI: `analyze`, `generate`, `report` subcommands with chalk output |
| `src/analyzer/coverage-parser.ts` | Parses NYC coverage-final.json → CoverageData[] sorted by coverage asc |
| `src/analyzer/risk-scorer.ts` | Scores uncovered functions: riskScore = complexity × importCount |
| `src/analyzer/project-scanner.ts` | Globs source/test files, detects jest/mocha/unknown framework |
| `src/generator/test-planner.ts` | Maps RiskScores → TestPlans with happy/edge/error test cases |
| `src/generator/test-writer.ts` | Generates Jest test file content from function signature |
| `src/generator/parallel-orchestrator.ts` | Promise.allSettled parallelism with ora spinners |
| `src/runner/test-runner.ts` | Runs Jest via child_process, parses JSON output, retries up to 2x |
| `src/reporter/coverage-diff.ts` | Before/after CoverageData comparison → CoverageReport |
| `src/reporter/markdown-reporter.ts` | CoverageReport → markdown string with tables |
| `src/__tests__/coverage-parser.test.ts` | 6 unit tests — all passing |
| `src/__tests__/risk-scorer.test.ts` | 4 unit tests — all passing |

**Validation:** `tsc --noEmit` clean, 10/10 Jest tests passing.

### Dashboard Package (`dashboard/`)
React 18 + Vite + TypeScript + Tailwind CSS (`@testforge/dashboard`):

| File | Purpose |
|---|---|
| `package.json` / `vite.config.ts` / `tsconfig.json` | Vite + React + TS config |
| `tailwind.config.js` / `postcss.config.js` | Tailwind + PostCSS setup |
| `index.html` | Vite HTML entry |
| `src/types.ts` | TypeScript interfaces mirroring engine types |
| `src/mock/sampleData.ts` | Realistic mock data (sample-app function names: getUserById, createUser, placeOrder, etc.) — 6 data exports covering all views |
| `src/main.tsx` | React root with QueryClientProvider + BrowserRouter |
| `src/App.tsx` | Sidebar layout + react-router-dom routes |
| `src/pages/DashboardPage.tsx` | Summary cards + coverage trend LineChart (recharts) |
| `src/pages/CoverageMapPage.tsx` | Treemap heatmap, click-to-drill-down |
| `src/pages/TestGenerationPage.tsx` | Risk table + Generate Tests button + live progress |
| `src/pages/ReportsPage.tsx` | Before/after diff + markdown export |
| `src/components/CoverageHeatmap.tsx` | Recharts Treemap, color-coded by pct |
| `src/components/RiskTable.tsx` | Sortable risk table with row color coding |
| `src/components/CoverageBadge.tsx` | Color badge (red/yellow/green) |
| `src/components/ProgressTracker.tsx` | Real-time generation status list |
| `src/components/DiffViewer.tsx` | Side-by-side before/after coverage metrics |
| `src/hooks/useApi.ts` | React Query hooks backed by mock data |

**Note:** Dashboard works fully standalone — no engine dependency for demo.

### Sample App (`sample-app/`)
Deliberately under-tested Express API (`@testforge/sample-app`):

| File | Tested? | Functions |
|---|---|---|
| `src/routes/users.js` | 1/5 (getUsersList only) | getUsersList, getUserById, createUser, updateUser, deleteUser |
| `src/routes/products.js` | 0/4 | getAllProducts, createProduct, updateProduct, deleteProduct |
| `src/routes/orders.js` | 1/5 (getOrdersList only) | getOrdersList, placeOrder, getOrderById, updateOrderStatus, cancelOrder |
| `src/middleware/auth.js` | ✗ | authenticate |
| `src/middleware/validation.js` | ✗ | validateRequest, validatePagination |
| `src/utils/helpers.js` | 1/4 (formatDate only) | formatDate, calculateDiscount, generateId, paginate |
| `src/db.js` | indirect | findAll, findById, insert, update, remove |
| `__tests__/users.test.js` | — | GET /api/users → 200 |
| `__tests__/helpers.test.js` | — | formatDate (2 cases) |

**Coverage:** ~41% statements, ~10% functions — intentionally low for TestForge demo.

---

## What Remains

- [ ] `npm install` across all workspaces to generate `node_modules`
- [ ] `npm run build` in `engine/` to produce `dist/`
- [ ] Run `make test` to confirm all suites pass end-to-end
- [ ] Add screenshots to `bob_sessions/` after first demo run
- [ ] Update `README.md` team info placeholder before submission
- [ ] Wire `testforge analyze` against the sample-app and capture the first real coverage run
- [ ] Consider adding an Express API server to the engine so the dashboard can connect to live data (currently mock-only)
- [ ] Add GitHub Actions CI workflow (`.github/workflows/ci.yml`)

---

## Review Notes

- All TypeScript is strict (no `any`), JSDoc on all exports — ESLint rule enforced
- Mock data references real sample-app function names for realistic demo screenshots
- The plan file `testforge-plan.md` at the root documents all sub-task decisions and can be updated as work continues
- Docker Compose is configured but services need `npm install` at build time — a future improvement is a proper multi-stage Dockerfile per package
- The `engine/src/runner/test-runner.ts` spawns Jest via `npx` — this requires Jest to be installed in the target workspace at runtime
