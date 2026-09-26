/**
 * Minimal Express API server for the TestForge engine.
 * Exposes /analyze, /generate, /pipeline, /status.
 *
 * Start with: node dist/server.js
 * Configure port via PORT env var (default 4001).
 * Pipeline results are persisted to PERSIST_PATH (default: pipeline-result.json).
 */
declare const app: import("express-serve-static-core").Express;
export { app };
//# sourceMappingURL=server.d.ts.map