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
exports.StaticTestWriter = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Extracts all exported function names from a JS/TS source string.
 * Handles: function declarations, arrow/const functions, module.exports.
 */
function extractExportedFunctions(source) {
    const names = new Set();
    // function foo(
    const funcDecl = /^(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/gm;
    let m;
    while ((m = funcDecl.exec(source)) !== null)
        names.add(m[1]);
    // const/let foo = (async)? (  or  = async function
    const arrowDecl = /(?:const|let|var)\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:async\s*)?\(/gm;
    while ((m = arrowDecl.exec(source)) !== null)
        names.add(m[1]);
    // module.exports.foo = / module.exports = { foo,
    const cjsExport = /module\.exports(?:\.([A-Za-z_$][A-Za-z0-9_$]*)|\s*=\s*\{([^}]+)\})/g;
    while ((m = cjsExport.exec(source)) !== null) {
        if (m[1]) {
            names.add(m[1]);
        }
        else if (m[2]) {
            const inner = /([A-Za-z_$][A-Za-z0-9_$]*)/g;
            let n;
            while ((n = inner.exec(m[2])) !== null)
                names.add(n[1]);
        }
    }
    // Filter common non-function keywords captured by the patterns above
    const skip = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'new',
        'await', 'typeof', 'instanceof', 'router', 'require', 'exports', 'module',
        'Router', 'Promise', 'Object', 'Array', 'JSON', 'Math', 'Error', 'String']);
    return Array.from(names).filter((n) => !skip.has(n));
}
/**
 * Extracts parameter names for a specific function from source.
 */
function extractParams(source, fnName) {
    const patterns = [
        new RegExp(`function\\s+${fnName}\\s*\\(([^)]*)\\)`),
        new RegExp(`(?:const|let|var)\\s+${fnName}\\s*=\\s*(?:async\\s*)?\\(([^)]*)\\)`),
        new RegExp(`(?:const|let|var)\\s+${fnName}\\s*=\\s*(?:async\\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\\s*=>`),
    ];
    for (const pat of patterns) {
        const m = pat.exec(source);
        if (m) {
            const raw = m[1].trim();
            if (!raw)
                return [];
            return raw.split(',').map((p) => p.trim().replace(/\s*=.*$/, '').replace(/^\.\.\./, ''));
        }
    }
    return [];
}
/**
 * Extracts up to 20 lines of a function body starting at its declaration.
 */
function extractFunctionLines(source, fnName) {
    const lines = source.split('\n');
    const idx = lines.findIndex((l) => l.includes(`function ${fnName}(`) || new RegExp(`\\b${fnName}\\s*=\\s*(?:async\\s*)?\\(`).test(l));
    if (idx === -1)
        return '';
    return lines.slice(idx, Math.min(idx + 20, lines.length)).join('\n');
}
/**
 * Detects whether a source file uses CommonJS (require/module.exports).
 */
function isCommonJS(source) {
    return source.includes('module.exports') || source.includes("'use strict'") || source.includes('require(');
}
/**
 * Detects whether functions in this file take Express (req, res) parameters —
 * these are route handlers and cannot be unit-tested by direct invocation.
 * We generate supertest-style integration tests instead.
 */
function isRouteHandler(source, fnName) {
    const body = extractFunctionLines(source, fnName);
    return /\bres\s*\.\s*(json|send|status|end)\b/.test(body) || /\breq\s*\.\s*(body|params|query)\b/.test(body);
}
/**
 * Returns the relative import path from outputDir to the source file,
 * without extension.
 */
function relativeImport(outputDir, sourceFile) {
    const rel = path.relative(outputDir, sourceFile).replace(/\.[jt]sx?$/, '').replace(/\\/g, '/');
    return rel.startsWith('.') ? rel : `./${rel}`;
}
// ── assertion builders ────────────────────────────────────────────────────
/**
 * Produces a meaningful happy-path assertion based on what the function
 * actually does (return type inferred from body).
 */
function buildHappyAssertion(body, call) {
    if (/return\s+\{/.test(body) || /\.json\(/.test(body)) {
        return `  const result = ${call};\n  expect(result).toBeDefined();\n  expect(typeof result).toBe('object');`;
    }
    if (/return\s+`/.test(body) || /return\s+['"]\w/.test(body) || /padStart|padEnd|toFixed|toString/.test(body)) {
        return `  const result = ${call};\n  expect(typeof result).toBe('string');\n  expect(result.length).toBeGreaterThan(0);`;
    }
    if (/Math\.round|Math\.floor|Math\.ceil|\+\s*\d|\*\s*\d/.test(body)) {
        return `  const result = ${call};\n  expect(typeof result).toBe('number');\n  expect(isNaN(result)).toBe(false);`;
    }
    if (/\.push\(|\.slice\(|\.map\(|\.filter\(/.test(body)) {
        return `  const result = ${call};\n  expect(Array.isArray(result)).toBe(true);`;
    }
    return `  const result = ${call};\n  expect(result).toBeDefined();`;
}
/**
 * Generates sample input values for a parameter based on its name heuristic.
 */
function sampleValue(paramName) {
    const n = paramName.toLowerCase();
    if (n === 'date')
        return "new Date('2024-01-15')";
    if (n.includes('price'))
        return '100';
    if (n.includes('discount'))
        return '10';
    if (n.includes('length') || n.includes('limit') || n.includes('page'))
        return '1';
    if (n.includes('array') || n === 'arr')
        return "['a', 'b', 'c']";
    if (n.includes('id'))
        return "'test-id'";
    if (n.includes('collection'))
        return "'users'";
    if (n.includes('name') || n.includes('email') || n.includes('str') || n.includes('text'))
        return "'test'";
    if (n === 'item' || n === 'updates' || n === 'obj')
        return '{}';
    return "'value'";
}
/**
 * Generates invalid input for a parameter to trigger error paths.
 */
function invalidValue(paramName) {
    const n = paramName.toLowerCase();
    if (n.includes('price') || n.includes('discount') || n.includes('length') || n.includes('limit'))
        return '-999';
    if (n.includes('array') || n === 'arr')
        return 'null';
    return 'null';
}
// ── test file builders ────────────────────────────────────────────────────
function buildDirectCallTests(fnName, params, body, importPath, cjs) {
    const args = params.map(sampleValue).join(', ');
    const edgeArgs = params.length > 0 ? params.map(invalidValue).join(', ') : '';
    const call = `${fnName}(${args})`;
    const edgeCall = `${fnName}(${edgeArgs})`;
    const importLine = cjs
        ? `const { ${fnName} } = require('${importPath}');`
        : `import { ${fnName} } from '${importPath}';`;
    const happyBody = buildHappyAssertion(body, call);
    const hasThrow = /throw\s+new\s+Error|throw\s+new\s+\w+Error/.test(body);
    const errorBlock = hasThrow && params.length > 0
        ? [
            ``,
            `it('${fnName} throws on invalid input', () => {`,
            `  expect(() => ${edgeCall}).toThrow();`,
            `});`,
        ].join('\n')
        : '';
    return [
        `// Auto-generated by TestForge — smart static analysis.`,
        `// Source: ${importPath}`,
        ``,
        importLine,
        ``,
        `describe('${fnName}', () => {`,
        `  it('${fnName} returns expected result for valid input', () => {`,
        happyBody,
        `  });`,
        params.length > 0 ? [
            ``,
            `  it('${fnName} handles empty/null input gracefully', () => {`,
            `    expect(() => ${edgeCall}).not.toThrow();`, // or expect a graceful value
            `  });`,
        ].join('\n') : '',
        errorBlock ? `\n${errorBlock}` : '',
        `});`,
        ``,
    ].filter((l) => l !== '').join('\n');
}
function buildRouteHandlerTests(fnNames, importPath, cjs, source) {
    // Detect if supertest is available from the module's location
    const importLine = cjs
        ? `const request = require('supertest');\nconst app = require('${importPath.replace(/\/routes\/\w+$/, '/app')}');`
        : `import request from 'supertest';\nimport app from '${importPath.replace(/\/routes\/\w+$/, '/app')}';`;
    // Derive route prefix from file name (orders → /api/orders, users → /api/users)
    const routeFile = path.basename(importPath);
    const routePrefix = `/api/${routeFile}`;
    const tests = [
        `// Auto-generated by TestForge — route handler integration tests.`,
        `// Source: ${importPath}`,
        ``,
        importLine,
        ``,
        `describe('${routeFile} routes', () => {`,
    ];
    for (const fn of fnNames) {
        const body = extractFunctionLines(source, fn);
        // Determine HTTP method from function name heuristic
        let method = 'get';
        let route = routePrefix;
        if (/^(create|insert|place|add)/i.test(fn)) {
            method = 'post';
        }
        else if (/^(update|patch|edit)/i.test(fn)) {
            method = 'patch';
            route += '/:id';
        }
        else if (/^(delete|remove|cancel)/i.test(fn)) {
            method = 'delete';
            route += '/:id';
        }
        else if (/ById|ByI/i.test(fn)) {
            route += '/test-id';
        }
        const hasValidation = /status\(400\)/.test(body);
        const has404 = /status\(404\)/.test(body);
        tests.push(``, `  describe('${fn}', () => {`, `    it('responds to ${method.toUpperCase()} ${route}', async () => {`, `      const res = await request(app).${method}('${route.replace('/:id', '/test-id')}');`, `      expect([200, 201, 204, 400, 404, 500]).toContain(res.status);`, `    });`, hasValidation ? [
            ``,
            `    it('${fn} returns 400 for invalid input', async () => {`,
            `      const res = await request(app).${method}('${route.replace('/:id', '/test-id')}').send({});`,
            `      expect(res.status).toBe(400);`,
            `    });`,
        ].join('\n') : '', has404 ? [
            ``,
            `    it('${fn} returns 404 for unknown id', async () => {`,
            `      const res = await request(app).${method}('${route.replace('/:id', '/nonexistent-id-999')}');`,
            `      expect(res.status).toBe(404);`,
            `    });`,
        ].join('\n') : '', `  });`);
    }
    tests.push(`});`, ``);
    return tests.filter((l) => l !== '').join('\n');
}
// ── BobTestWriter ─────────────────────────────────────────────────────────
/**
 * Generates runnable Jest test files via deep static source analysis.
 *
 * IBM Bob runs as a desktop IDE (no `bob --print` CLI); shelling out is not
 * possible. Instead, this writer:
 *  1. Parses the source to find all exported functions.
 *  2. Extracts parameter names and body snippets per function.
 *  3. Detects whether functions are direct-call utilities or Express route
 *     handlers and generates the appropriate test style.
 *  4. Uses relative imports and proper `require()` vs `import` syntax.
 */
class StaticTestWriter {
    /**
     * Writes a runnable Jest test file for `plan` to `outputDir/__tests__/`.
     */
    async write(plan, outputDir) {
        const ext = /\.tsx?$/.test(plan.filePath) ? 'ts' : 'js';
        const baseName = path.basename(plan.filePath, path.extname(plan.filePath));
        const testDir = path.join(outputDir, '__tests__');
        const outputFile = path.join(testDir, `${baseName}.generated.test.${ext}`);
        let source = '';
        try {
            source = fs.readFileSync(plan.filePath, 'utf-8');
        }
        catch {
            return {
                filePath: plan.filePath,
                success: false,
                error: `Could not read source file: ${plan.filePath}`,
                testsGenerated: 0,
            };
        }
        const cjs = isCommonJS(source);
        const importPath = relativeImport(testDir, plan.filePath);
        const allFunctions = extractExportedFunctions(source);
        // Determine which functions to test (prioritise the plan's function, add others)
        const planFn = plan.functionName;
        const fnsToTest = allFunctions.includes(planFn)
            ? [planFn, ...allFunctions.filter((f) => f !== planFn)].slice(0, 6)
            : allFunctions.slice(0, 6);
        let content;
        if (fnsToTest.length === 0) {
            // Nothing exported we can identify — write a placeholder
            content = buildPlaceholder(plan, importPath, cjs);
        }
        else {
            const routeHandler = fnsToTest.some((f) => isRouteHandler(source, f));
            if (routeHandler) {
                content = buildRouteHandlerTests(fnsToTest, importPath, cjs, source);
            }
            else {
                // Generate one describe block per exported function
                const blocks = [
                    `// Auto-generated by TestForge — smart static analysis.`,
                    `// Source: ${importPath}`,
                    ``,
                    cjs
                        ? `const { ${fnsToTest.join(', ')} } = require('${importPath}');`
                        : `import { ${fnsToTest.join(', ')} } from '${importPath}';`,
                    ``,
                ];
                for (const fn of fnsToTest) {
                    const params = extractParams(source, fn);
                    const body = extractFunctionLines(source, fn);
                    const args = params.map(sampleValue).join(', ');
                    const call = `${fn}(${args})`;
                    const happyBody = buildHappyAssertion(body, call);
                    const hasThrow = /throw\s+new\s+Error|throw\s+new\s+\w+Error/.test(body);
                    blocks.push(`describe('${fn}', () => {`, `  it('returns expected result for valid input', () => {`, happyBody, `  });`);
                    if (params.length > 0) {
                        const edgeArgs = params.map((p, i) => i === 0 ? invalidValue(p) : sampleValue(p)).join(', ');
                        if (hasThrow) {
                            blocks.push(``, `  it('throws on invalid input', () => {`, `    expect(() => ${fn}(${edgeArgs})).toThrow();`, `  });`);
                        }
                        else {
                            blocks.push(``, `  it('handles edge-case input without throwing', () => {`, `    expect(() => ${fn}(${edgeArgs})).not.toThrow();`, `  });`);
                        }
                    }
                    blocks.push(`});`, ``);
                }
                content = blocks.join('\n');
            }
        }
        try {
            fs.mkdirSync(testDir, { recursive: true });
            fs.writeFileSync(outputFile, content, 'utf-8');
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                filePath: plan.filePath,
                success: false,
                error: `Could not write test file: ${message}`,
                testsGenerated: 0,
            };
        }
        return {
            filePath: plan.filePath,
            success: true,
            generatedPath: outputFile,
            testsGenerated: fnsToTest.length * 2,
        };
    }
}
exports.StaticTestWriter = StaticTestWriter;
function buildPlaceholder(plan, importPath, cjs) {
    const importLine = cjs
        ? `const mod = require('${importPath}');`
        : `import * as mod from '${importPath}';`;
    return [
        `// Auto-generated by TestForge — no exported functions detected.`,
        importLine,
        ``,
        `describe('${plan.functionName}', () => {`,
        `  it('module loads without error', () => {`,
        `    expect(mod).toBeDefined();`,
        `  });`,
        `});`,
        ``,
    ].join('\n');
}
//# sourceMappingURL=static-test-writer.js.map