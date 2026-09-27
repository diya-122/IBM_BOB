'use strict';

const app = require('../../src/app');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeMockRes() {
  const json   = jest.fn();
  const send   = jest.fn();
  const status = jest.fn();
  const res    = { json, send, status };
  // Allow chaining: res.status(404).json(...)
  status.mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// anonymous_0 — 404 handler  (req, res) => { res.status(404).json(...) }
// This is the 4th middleware registered on `app` (index 3 in the router
// stack after the three route-mounts and the built-in json body-parser).
// We extract it by filtering the stack for handlers that have exactly 2
// formal parameters and are not the built-in Express ones.
// The safest way is just to drive the full app with supertest-style fake
// req/res objects — but since the instructions forbid running tests we
// can also test the handler by pulling it from the stack.
// ---------------------------------------------------------------------------
function get404Handler() {
  // Walk the express router stack looking for plain middleware (not routers)
  // that accept exactly 2 params (req, res) — that is our 404 handler.
  return app._router.stack
    .map(layer => layer.handle)
    .find(fn => fn && fn.length === 2);
}

function getErrorHandler() {
  // Error handlers accept exactly 4 params (err, req, res, next).
  return app._router.stack
    .map(layer => layer.handle)
    .find(fn => fn && fn.length === 4);
}

// ---------------------------------------------------------------------------
// Suite: anonymous_0 — 404 handler
// ---------------------------------------------------------------------------
describe('anonymous_0 — 404 handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('happy path — responds with 404 and { error: "Not found" }', () => {
    const handler = get404Handler();
    const req = {};
    const res = makeMockRes();

    handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
  });

  test('edge case — calls status before json (correct chain order)', () => {
    const handler = get404Handler();
    const req = {};
    const res = makeMockRes();

    handler(req, res);

    const statusOrder = res.status.mock.invocationCallOrder[0];
    const jsonOrder   = res.json.mock.invocationCallOrder[0];
    expect(statusOrder).toBeLessThan(jsonOrder);
  });

  test('edge case — handler does not call next or send', () => {
    const handler = get404Handler();
    const req  = {};
    const res  = makeMockRes();
    const next = jest.fn();

    // The 404 handler only takes (req, res); passing next shouldn't break it
    handler(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Suite: anonymous_1 — error handler
// ---------------------------------------------------------------------------
describe('anonymous_1 — error handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('happy path — uses err.status and err.message when both are present', () => {
    const handler = getErrorHandler();
    const err  = { status: 422, message: 'Unprocessable entity', stack: 'stack' };
    const req  = {};
    const res  = makeMockRes();
    const next = jest.fn();

    handler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unprocessable entity' });
  });

  test('edge case — falls back to 500 when err.status is absent', () => {
    const handler = getErrorHandler();
    const err  = { message: 'Something went wrong', stack: 'stack' };
    const req  = {};
    const res  = makeMockRes();
    const next = jest.fn();

    handler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
  });

  test('edge case — falls back to "Internal server error" when err.message is absent', () => {
    const handler = getErrorHandler();
    const err  = { status: 503, stack: 'stack' };
    const req  = {};
    const res  = makeMockRes();
    const next = jest.fn();

    handler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  test('error case — err with neither status nor message uses 500 and default message', () => {
    const handler = getErrorHandler();
    const err  = { stack: 'bare error' };
    const req  = {};
    const res  = makeMockRes();
    const next = jest.fn();

    handler(err, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error' });
  });

  test('edge case — console.error is called with err.stack', () => {
    const handler = getErrorHandler();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const err  = { status: 500, message: 'boom', stack: 'Error: boom\n  at ...' };
    const req  = {};
    const res  = makeMockRes();
    const next = jest.fn();

    handler(err, req, res, next);

    expect(consoleSpy).toHaveBeenCalledWith(err.stack);
    consoleSpy.mockRestore();
  });
});
