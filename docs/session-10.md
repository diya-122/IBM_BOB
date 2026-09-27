# Session 10 — Pipeline hardening: Windows path guard, persist-path fix, dotenv dependency, GET / route, dashboard env

**Date:** 2025-07-17  
**Goal:** Fix three issues surfaced when running the pipeline from a Windows/WSL environment — a confusing "Not found" 404 on a Windows-style path, the `pipeline-result.json` being written to the wrong directory, and `dotenv` being miscategorised as a dev dependency.

---

## What Was Done

### Fix 1 — Windows path guard in `/analyze` and `/pipeline`

**Problem:** Sending a Windows absolute path such as `C:\Users\dhriti\Downloads\IBM_BOB\sample-app` to `POST /pipeline` or `POST /analyze` caused `path.resolve()` on Linux to treat the entire string as a relative path segment.  The resulting path `/home/mona/ibm_bob_hack/C:\Users\dhriti\Downloads\IBM_BOB\sample-app` did not exist, and the server returned a cryptic `404 Not found: ...` response with the mangled path embedded — giving the caller no indication of what went wrong.

**Fix applied to [`engine/src/server.ts`](../engine/src/server.ts):**

Added a `isWindowsAbsPath(p)` helper that tests for the `C:\` / `C:/` pattern:

```typescript
function isWindowsAbsPath(p: string): boolean {
  return /^[A-Za-z]:[/\\]/.test(p);
}
```

Both `POST /analyze` and `POST /pipeline` now call this before `path.resolve()`.  A match returns `400` with an actionable message:

```
Windows path detected: "C:\Users\...". Provide a Linux/WSL absolute path
(e.g. /home/user/project) or a path relative to the server's working directory.
```

**Before / after:**

| Input | Before | After |
|-------|--------|-------|
| `C:\Users\dhriti\Downloads\IBM_BOB\sample-app` | `404 Not found: /home/mona/ibm_bob_hack/C:\Users\…` | `400 Windows path detected: "C:\Users\…". Provide a Linux/WSL absolute path…` |
| `/home/mona/ibm_bob_hack/sample-app` | `200` (pipeline result) | `200` (unchanged) |

---

### Fix 2 — `PERSIST_PATH` resolves relative to the server binary, not to `cwd`

**Problem:** `PERSIST_PATH` defaulted to `'pipeline-result.json'` resolved via `path.resolve()`, which uses `process.cwd()`.  When the server was started from the repo root (`node engine/dist/server.js`), the JSON landed in `/home/mona/ibm_bob_hack/pipeline-result.json` rather than next to the server binary in `engine/dist/`.  This created a stale root-level file and caused the server to fail to reload a previous run after a restart (it looked in `dist/`, found nothing, and reported no previous result).

**Fix applied to [`engine/src/server.ts`](../engine/src/server.ts):**

```typescript
// Before
const PERSIST_PATH = path.resolve(process.env['PERSIST_PATH'] ?? 'pipeline-result.json');

// After — __dirname is the compiled output directory (engine/dist/)
const PERSIST_PATH = path.resolve(
  process.env['PERSIST_PATH'] ?? path.join(__dirname, 'pipeline-result.json'),
);
```

`engine/dist/pipeline-result.json` is the stable default.  The `PERSIST_PATH` env-var override still works normally.

---

### Fix 3 — `dotenv` moved from `devDependencies` to `dependencies`

**Problem:** [`engine/src/generator/bob-test-writer.ts`](../engine/src/generator/bob-test-writer.ts) calls `dotenv.config()` at **runtime** (not just at compile time) to load `BOB_API_KEY` from `engine/.env`.  `dotenv` was listed under `devDependencies` in [`engine/package.json`](../engine/package.json), which means it would be absent in a production install (`npm install --omit=dev`), causing a runtime `Cannot find module 'dotenv'` crash.

**Fix applied to [`engine/package.json`](../engine/package.json):**

Moved `"dotenv": "^18.0.4"` from `devDependencies` → `dependencies`.

---

## Validation

```
# Engine build — 0 errors
npm run build

# Engine tests — 11/11 passing (unchanged)
cd engine && npm test

# Windows path guard
curl -X POST http://localhost:4001/pipeline \
  -H 'Content-Type: application/json' \
  -d '{"projectPath":"C:\\Users\\dhriti\\Downloads\\IBM_BOB\\sample-app"}'
# → 400 {"error":"Windows path detected: ..."}

# Normal run unaffected
curl -X POST http://localhost:4001/pipeline \
  -H 'Content-Type: application/json' \
  -d '{"projectPath":"/home/mona/ibm_bob_hack/sample-app"}'
# → 200 {pipeline result...}

# Persist path
ls engine/dist/pipeline-result.json   # EXISTS
```

All checks pass.

---

---

### Fix 4 — `GET /` returns a helpful API directory (was `Cannot GET /`)

**Problem:** Opening `http://localhost:4001` in a browser or hitting it with `curl` returned Express's default `Cannot GET /` 404 response, giving no indication of what the server does or what routes exist.

**Fix applied to [`engine/src/server.ts`](../engine/src/server.ts):**

Added a `GET /` handler that returns a JSON API directory:

```json
{
  "name": "TestForge Engine API",
  "version": "0.1.0",
  "endpoints": [
    "GET  /          — this help",
    "GET  /status    — server state (analyzed, generated, pipelineRan)",
    "POST /analyze   — analyze a project (body: { projectPath })",
    ...
  ],
  "note": "projectPath must be a Linux/WSL absolute path, e.g. /home/user/project"
}
```

---

### Fix 5 — `dashboard/.env` had wrong Windows path for `VITE_PROJECT_PATH`

**Problem:** `dashboard/.env` contained:
```
VITE_PROJECT_PATH=C:\Users\dhriti\Downloads\IBM_BOB\sample-app
```
This Windows path was read by Vite at build time and embedded into the dashboard bundle, then sent verbatim to the engine's `POST /pipeline` — triggering the Windows path error on every "Generate Tests" click.

**Fix:** Updated `dashboard/.env` to the correct WSL absolute path:
```
VITE_PROJECT_PATH=/home/mona/ibm_bob_hack/sample-app
```

**Also created [`dashboard/.env.example`](../dashboard/.env.example)** with clear comments explaining that `VITE_PROJECT_PATH` must be a Linux/WSL path, not a Windows path, and how to find the correct WSL equivalent.

---

## Validation

```
# Engine build — 0 errors
npm run build

# Engine unit tests — 11/11 passing
cd engine && npm test

# GET / — now returns API directory
curl http://localhost:4001/
# → {"name":"TestForge Engine API","version":"0.1.0","endpoints":[...]}

# Windows path blocked (400)
curl -X POST http://localhost:4001/pipeline \
  -H 'Content-Type: application/json' \
  -d '{"projectPath":"C:\\Users\\dhriti\\Downloads\\IBM_BOB\\sample-app"}'
# → 400 {"error":"Windows path detected: ..."}

# Normal WSL path runs cleanly (200)
curl -X POST http://localhost:4001/pipeline \
  -H 'Content-Type: application/json' \
  -d '{"projectPath":"/home/mona/ibm_bob_hack/sample-app"}'
# → 200 {pipeline result, ranAt: ..., runResult: {passed:0, failed:0}}
```

All checks pass.

---

## What Remains

- [ ] Add a `collectCoverageFrom` glob to `sample-app/package.json` so middleware (`auth.js`, `validation.js`) are included in the coverage report even when no test directly imports them
- [ ] Consider caching generated test files to avoid regenerating unchanged source (carried from session 09)
