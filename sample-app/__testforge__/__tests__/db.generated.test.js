'use strict';

/**
 * Generated tests for src/db.js
 * Covers: findAll, findById, insert, update, remove
 */

// We re-require the module before each test so mutations from one test
// do not bleed into the next.
let db;

beforeEach(() => {
  jest.resetModules();
  db = require('../../src/db');
});

// ---------------------------------------------------------------------------
// findAll
// ---------------------------------------------------------------------------
describe('findAll', () => {
  test('happy path: returns all users', () => {
    const result = db.findAll('users');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
  });

  test('happy path: returns all products', () => {
    const result = db.findAll('products');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('happy path: returns all orders', () => {
    const result = db.findAll('orders');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  test('edge case: unknown collection returns empty array', () => {
    const result = db.findAll('nonexistent');
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// findById
// ---------------------------------------------------------------------------
describe('findById', () => {
  test('happy path: finds an existing user by id', () => {
    const user = db.findById('users', 'u1');
    expect(user).not.toBeNull();
    expect(user.id).toBe('u1');
    expect(user.name).toBe('Alice Johnson');
  });

  test('happy path: finds an existing product by id', () => {
    const product = db.findById('products', 'p2');
    expect(product).not.toBeNull();
    expect(product.id).toBe('p2');
    expect(product.name).toBe('Widget B');
  });

  test('edge case: returns null when id does not exist', () => {
    const result = db.findById('users', 'u999');
    expect(result).toBeNull();
  });

  test('edge case: id comparison is strict (no type coercion)', () => {
    // All ids are strings; passing a number-like string that does not match
    const result = db.findById('users', 1);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insert
// ---------------------------------------------------------------------------
describe('insert', () => {
  test('happy path: inserts a new user and returns it', () => {
    const newUser = { id: 'u99', name: 'Test User', email: 'test@example.com', role: 'user' };
    const result = db.insert('users', newUser);
    expect(result).toEqual(newUser);
    expect(db.findById('users', 'u99')).toEqual(newUser);
  });

  test('happy path: inserts a new product and it appears in findAll', () => {
    const newProduct = { id: 'p99', name: 'Super Gadget', price: 99.99, stock: 5 };
    db.insert('products', newProduct);
    const all = db.findAll('products');
    expect(all.find((p) => p.id === 'p99')).toEqual(newProduct);
  });

  test('happy path: inserted item with a date field round-trips correctly', () => {
    const createdAt = new Date(Date.UTC(2024, 0, 15)); // 2024-01-15 UTC
    const newOrder = {
      id: 'o99',
      userId: 'u1',
      products: [],
      status: 'pending',
      total: 0,
      createdAt,
    };
    const result = db.insert('orders', newOrder);
    expect(result.createdAt.getTime()).toBe(Date.UTC(2024, 0, 15));
  });

  test('edge case: inserting into a collection increments its length', () => {
    const before = db.findAll('users').length;
    db.insert('users', { id: 'u-extra', name: 'Extra', email: 'extra@example.com', role: 'user' });
    const after = db.findAll('users').length;
    expect(after).toBe(before + 1);
  });

  test('edge case: returns the exact same object reference that was inserted', () => {
    const item = { id: 'ref-test', name: 'Ref Check' };
    const result = db.insert('users', item);
    expect(result).toBe(item);
  });
});

// ---------------------------------------------------------------------------
// update
// ---------------------------------------------------------------------------
describe('update', () => {
  test('happy path: updates a single field on an existing user', () => {
    const updated = db.update('users', 'u1', { name: 'Alice Updated' });
    expect(updated).not.toBeNull();
    expect(updated.name).toBe('Alice Updated');
    expect(updated.id).toBe('u1'); // id must be preserved
  });

  test('happy path: merges updates without removing untouched fields', () => {
    const original = db.findById('users', 'u2');
    const originalEmail = original.email;
    db.update('users', 'u2', { role: 'admin' });
    const after = db.findById('users', 'u2');
    expect(after.email).toBe(originalEmail);
    expect(after.role).toBe('admin');
  });

  test('happy path: update is reflected in subsequent findById call', () => {
    db.update('products', 'p1', { stock: 999 });
    const product = db.findById('products', 'p1');
    expect(product.stock).toBe(999);
  });

  test('edge case: returns null when updating a non-existent id', () => {
    const result = db.update('users', 'u-does-not-exist', { name: 'Ghost' });
    expect(result).toBeNull();
  });

  test('edge case: updating with an empty object leaves the record unchanged', () => {
    const before = { ...db.findById('users', 'u3') };
    db.update('users', 'u3', {});
    const after = db.findById('users', 'u3');
    expect(after).toEqual(before);
  });

  test('edge case: can overwrite the id field if explicitly passed in updates', () => {
    db.update('users', 'u3', { id: 'u3-renamed' });
    // Original id no longer findable
    expect(db.findById('users', 'u3')).toBeNull();
    // New id is findable
    expect(db.findById('users', 'u3-renamed')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------
describe('remove', () => {
  test('happy path: removes an existing user and returns true', () => {
    const result = db.remove('users', 'u1');
    expect(result).toBe(true);
  });

  test('happy path: removed item is no longer in the collection', () => {
    db.remove('users', 'u2');
    expect(db.findById('users', 'u2')).toBeNull();
  });

  test('happy path: collection length decreases by one after removal', () => {
    const before = db.findAll('products').length;
    db.remove('products', 'p1');
    const after = db.findAll('products').length;
    expect(after).toBe(before - 1);
  });

  test('edge case: returns false when id does not exist', () => {
    const result = db.remove('users', 'u-ghost');
    expect(result).toBe(false);
  });

  test('edge case: removing a non-existent id does not change collection length', () => {
    const before = db.findAll('orders').length;
    db.remove('orders', 'o-ghost');
    const after = db.findAll('orders').length;
    expect(after).toBe(before);
  });

  test('edge case: removing the same id twice returns false on the second call', () => {
    db.remove('users', 'u3');
    const second = db.remove('users', 'u3');
    expect(second).toBe(false);
  });
});
