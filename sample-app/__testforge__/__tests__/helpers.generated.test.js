'use strict';

const {
  formatDate,
  calculateDiscount,
  generateId,
  paginate,
} = require('../../src/utils/helpers');

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe('formatDate', () => {
  test('happy path: formats a Date object to YYYY-MM-DD', () => {
    const date = new Date(Date.UTC(2024, 5, 15)); // 2024-06-15
    expect(formatDate(date)).toBe('2024-06-15');
  });

  test('happy path: formats an ISO string to YYYY-MM-DD', () => {
    expect(formatDate('2023-01-07T00:00:00.000Z')).toBe('2023-01-07');
  });

  test('edge case: single-digit month and day are zero-padded', () => {
    const date = new Date(Date.UTC(2000, 0, 3)); // 2000-01-03
    expect(formatDate(date)).toBe('2000-01-03');
  });

  test('edge case: last day of year (December 31)', () => {
    const date = new Date(Date.UTC(1999, 11, 31)); // 1999-12-31
    expect(formatDate(date)).toBe('1999-12-31');
  });

  test('edge case: leap day February 29', () => {
    const date = new Date(Date.UTC(2000, 1, 29)); // 2000-02-29
    expect(formatDate(date)).toBe('2000-02-29');
  });
});

// ---------------------------------------------------------------------------
// calculateDiscount
// ---------------------------------------------------------------------------
describe('calculateDiscount', () => {
  test('happy path: 10% discount on 100 returns 90', () => {
    expect(calculateDiscount(100, 10)).toBe(90);
  });

  test('happy path: 0% discount leaves price unchanged', () => {
    expect(calculateDiscount(50, 0)).toBe(50);
  });

  test('happy path: 100% discount returns 0', () => {
    expect(calculateDiscount(200, 100)).toBe(0);
  });

  test('happy path: result is rounded to 2 decimal places', () => {
    // 10 * (1 - 33/100) = 6.7 exactly
    expect(calculateDiscount(10, 33)).toBe(6.7);
  });

  test('edge case: price of 0 returns 0 for any discount', () => {
    expect(calculateDiscount(0, 50)).toBe(0);
  });

  test('edge case: fractional price and discount', () => {
    expect(calculateDiscount(9.99, 5)).toBe(9.49);
  });

  test('error case: negative price throws', () => {
    expect(() => calculateDiscount(-1, 10)).toThrow('price must be a non-negative number');
  });

  test('error case: non-number price throws', () => {
    expect(() => calculateDiscount('100', 10)).toThrow('price must be a non-negative number');
  });

  test('error case: discount below 0 throws', () => {
    expect(() => calculateDiscount(100, -5)).toThrow('discount must be a number between 0 and 100');
  });

  test('error case: discount above 100 throws', () => {
    expect(() => calculateDiscount(100, 101)).toThrow('discount must be a number between 0 and 100');
  });

  test('error case: non-number discount throws', () => {
    expect(() => calculateDiscount(100, '10')).toThrow('discount must be a number between 0 and 100');
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------
describe('generateId', () => {
  test('happy path: default length is 8', () => {
    const id = generateId();
    expect(id).toHaveLength(8);
  });

  test('happy path: custom length is respected', () => {
    const id = generateId(16);
    expect(id).toHaveLength(16);
  });

  test('happy path: result contains only alphanumeric characters', () => {
    const id = generateId(50);
    expect(id).toMatch(/^[A-Za-z0-9]+$/);
  });

  test('edge case: length 1 returns a single character', () => {
    const id = generateId(1);
    expect(id).toHaveLength(1);
    expect(id).toMatch(/^[A-Za-z0-9]$/);
  });

  test('edge case: length 0 returns an empty string', () => {
    expect(generateId(0)).toBe('');
  });

  test('edge case: successive calls produce different IDs (collision test)', () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId(12)));
    // With a 62-char alphabet and length 12, the probability of ANY collision
    // across 20 draws is astronomically small — a collision would signal a bug.
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// paginate
// ---------------------------------------------------------------------------
describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1); // [1..25]

  test('happy path: first page with default limit', () => {
    const result = paginate(items);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  test('happy path: second page', () => {
    const result = paginate(items, 2, 10);
    expect(result.page).toBe(2);
    expect(result.data).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  test('happy path: last (partial) page', () => {
    const result = paginate(items, 3, 10);
    expect(result.data).toEqual([21, 22, 23, 24, 25]);
    expect(result.totalPages).toBe(3);
  });

  test('happy path: custom limit', () => {
    const result = paginate(items, 1, 5);
    expect(result.limit).toBe(5);
    expect(result.totalPages).toBe(5);
    expect(result.data).toEqual([1, 2, 3, 4, 5]);
  });

  test('edge case: empty array returns empty data and 0 totalPages', () => {
    const result = paginate([], 1, 10);
    expect(result.data).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  test('edge case: page beyond total returns empty data', () => {
    const result = paginate(items, 99, 10);
    expect(result.data).toEqual([]);
    expect(result.page).toBe(99);
  });

  test('edge case: limit equals array length returns all items on one page', () => {
    const result = paginate(items, 1, 25);
    expect(result.data).toHaveLength(25);
    expect(result.totalPages).toBe(1);
  });

  test('edge case: limit larger than array length returns all items', () => {
    const result = paginate(items, 1, 100);
    expect(result.data).toHaveLength(25);
    expect(result.totalPages).toBe(1);
  });

  test('edge case: returned object shape contains all expected keys', () => {
    const result = paginate(items, 1, 10);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('page');
    expect(result).toHaveProperty('limit');
    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('totalPages');
  });
});

// ---------------------------------------------------------------------------
// start  (src/server.js — calls app.listen to boot the HTTP server)
// ---------------------------------------------------------------------------
describe('start (server bootstrap)', () => {
  let mockListen;
  let originalEnv;

  beforeEach(() => {
    // Isolate module registry so we can inject mocks cleanly.
    jest.resetModules();
    originalEnv = process.env.PORT;

    // Build the mock listen function independently, then attach to the object.
    mockListen = jest.fn();
    jest.mock('../../src/app', () => ({ listen: mockListen }));
  });

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalEnv;
    }
    jest.resetModules();
  });

  test('happy path: calls app.listen with default port 3000 when PORT is not set', () => {
    delete process.env.PORT;
    require('../../src/server');
    expect(mockListen).toHaveBeenCalledTimes(1);
    expect(mockListen.mock.calls[0][0]).toBe(3000);
  });

  test('happy path: calls app.listen with PORT from environment variable', () => {
    process.env.PORT = '8080';
    require('../../src/server');
    expect(mockListen).toHaveBeenCalledTimes(1);
    expect(mockListen.mock.calls[0][0]).toBe('8080');
  });

  test('edge case: listen callback is provided as a function', () => {
    delete process.env.PORT;
    require('../../src/server');
    const callback = mockListen.mock.calls[0][1];
    expect(typeof callback).toBe('function');
  });

  test('edge case: listen callback does not throw when invoked', () => {
    delete process.env.PORT;
    // Suppress console.log output from the callback.
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    require('../../src/server');
    const callback = mockListen.mock.calls[0][1];
    expect(() => callback()).not.toThrow();
    spy.mockRestore();
  });
});
