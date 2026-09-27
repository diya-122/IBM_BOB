'use strict';

jest.mock('../../src/db');
jest.mock('uuid');

const { findAll, insert } = require('../../src/db');
const { v4: uuidv4 } = require('uuid');
const { placeOrder } = require('../../src/routes/orders');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
}

function makeReq(body = {}) {
  return { body };
}

// ---------------------------------------------------------------------------
// Shared product catalogue used across tests
// ---------------------------------------------------------------------------

const PRODUCTS = [
  { id: 'p1', name: 'Widget A', price: 9.99,  stock: 100 },
  { id: 'p2', name: 'Widget B', price: 24.99, stock: 50  },
  { id: 'p3', name: 'Gadget X', price: 49.99, stock: 20  },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('placeOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: findAll('products') returns the catalogue; findAll('orders') not used by placeOrder
    findAll.mockImplementation((collection) => {
      if (collection === 'products') return [...PRODUCTS];
      return [];
    });
    uuidv4.mockReturnValue('test-uuid-1234');
  });

  // -------------------------------------------------------------------------
  // 400 – validation failures
  // -------------------------------------------------------------------------

  describe('400 Bad Request', () => {
    test('missing userId returns 400 with descriptive error', () => {
      const req = makeReq({ products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();

      placeOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: userId, products (non-empty array)',
      });
      expect(insert).not.toHaveBeenCalled();
    });

    test('missing products returns 400', () => {
      const req = makeReq({ userId: 'u1' });
      const res = makeRes();

      placeOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: userId, products (non-empty array)',
      });
      expect(insert).not.toHaveBeenCalled();
    });

    test('products is not an array returns 400', () => {
      const req = makeReq({ userId: 'u1', products: 'p1' });
      const res = makeRes();

      placeOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: userId, products (non-empty array)',
      });
      expect(insert).not.toHaveBeenCalled();
    });

    test('products is an empty array returns 400', () => {
      const req = makeReq({ userId: 'u1', products: [] });
      const res = makeRes();

      placeOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: userId, products (non-empty array)',
      });
      expect(insert).not.toHaveBeenCalled();
    });

    test('userId is empty string returns 400', () => {
      const req = makeReq({ userId: '', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();

      placeOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Missing required fields: userId, products (non-empty array)',
      });
      expect(insert).not.toHaveBeenCalled();
    });

    test('both userId and products missing returns 400', () => {
      const req = makeReq({});
      const res = makeRes();

      placeOrder(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(insert).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // 201 – successful order creation
  // -------------------------------------------------------------------------

  describe('201 Created', () => {
    test('creates order with correct total for a single product with qty 1', () => {
      // p1 = 9.99, qty = 1  →  total = 9.99
      const req = makeReq({ userId: 'u1', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();
      const expectedOrder = {
        id: 'test-uuid-1234',
        userId: 'u1',
        products: [{ productId: 'p1', qty: 1 }],
        status: 'pending',
        total: 9.99,
      };
      insert.mockReturnValue(expectedOrder);

      placeOrder(req, res);

      expect(insert).toHaveBeenCalledWith('orders', expectedOrder);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expectedOrder);
    });

    test('creates order with correct total for a single product with qty > 1', () => {
      // p2 = 24.99, qty = 3  →  total = 74.97
      const req = makeReq({ userId: 'u2', products: [{ productId: 'p2', qty: 3 }] });
      const res = makeRes();
      const expectedOrder = {
        id: 'test-uuid-1234',
        userId: 'u2',
        products: [{ productId: 'p2', qty: 3 }],
        status: 'pending',
        total: 74.97,
      };
      insert.mockReturnValue(expectedOrder);

      placeOrder(req, res);

      expect(insert).toHaveBeenCalledWith('orders', expectedOrder);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expectedOrder);
    });

    test('creates order with correct summed total for multiple products', () => {
      // p1 (9.99 × 2) + p2 (24.99 × 1)  →  19.98 + 24.99 = 44.97
      const req = makeReq({
        userId: 'u1',
        products: [{ productId: 'p1', qty: 2 }, { productId: 'p2', qty: 1 }],
      });
      const res = makeRes();
      const expectedOrder = {
        id: 'test-uuid-1234',
        userId: 'u1',
        products: [{ productId: 'p1', qty: 2 }, { productId: 'p2', qty: 1 }],
        status: 'pending',
        total: 44.97,
      };
      insert.mockReturnValue(expectedOrder);

      placeOrder(req, res);

      expect(insert).toHaveBeenCalledWith('orders', expectedOrder);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expectedOrder);
    });

    test('defaults qty to 1 when qty is omitted from a product line item', () => {
      // p3 = 49.99, no qty provided  →  total = 49.99
      const req = makeReq({ userId: 'u3', products: [{ productId: 'p3' }] });
      const res = makeRes();
      const expectedOrder = {
        id: 'test-uuid-1234',
        userId: 'u3',
        products: [{ productId: 'p3' }],
        status: 'pending',
        total: 49.99,
      };
      insert.mockReturnValue(expectedOrder);

      placeOrder(req, res);

      expect(insert).toHaveBeenCalledWith('orders', expectedOrder);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('new order always has status "pending"', () => {
      const req = makeReq({ userId: 'u1', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      expect(insertedOrder.status).toBe('pending');
    });

    test('uses a uuid for the new order id', () => {
      uuidv4.mockReturnValue('fixed-uuid-abcd');
      const req = makeReq({ userId: 'u1', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      expect(insertedOrder.id).toBe('fixed-uuid-abcd');
    });

    test('total is rounded to 2 decimal places', () => {
      // Use a product whose price × qty produces a floating-point rounding candidate
      // Override products with a price that triggers rounding: 0.1 + 0.2 = 0.30000000000000004
      findAll.mockImplementation((collection) => {
        if (collection === 'products') {
          return [{ id: 'px', name: 'Tricky', price: 0.1, stock: 10 }];
        }
        return [];
      });
      const req = makeReq({ userId: 'u9', products: [{ productId: 'px', qty: 3 }] });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      // 0.1 × 3 = 0.30000000000000004 raw; rounded → 0.3
      expect(insertedOrder.total).toBe(0.3);
    });

    test('unknown productId is silently skipped (contributes 0 to total)', () => {
      const req = makeReq({
        userId: 'u1',
        products: [{ productId: 'UNKNOWN', qty: 5 }, { productId: 'p1', qty: 1 }],
      });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      // Only p1 (9.99 × 1) contributes
      expect(insertedOrder.total).toBe(9.99);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('all products unknown results in total of 0', () => {
      const req = makeReq({
        userId: 'u1',
        products: [{ productId: 'NOPE', qty: 2 }],
      });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      expect(insertedOrder.total).toBe(0);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('inserts order into the "orders" collection', () => {
      const req = makeReq({ userId: 'u2', products: [{ productId: 'p2', qty: 1 }] });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      expect(insert).toHaveBeenCalledTimes(1);
      expect(insert.mock.calls[0][0]).toBe('orders');
    });

    test('response body is the object returned by insert', () => {
      const req = makeReq({ userId: 'u1', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();
      const dbReturn = { id: 'test-uuid-1234', userId: 'u1', products: [], status: 'pending', total: 9.99, _extra: true };
      insert.mockReturnValue(dbReturn);

      placeOrder(req, res);

      expect(res.json).toHaveBeenCalledWith(dbReturn);
    });

    test('preserves the original products array on the inserted record', () => {
      const productItems = [{ productId: 'p1', qty: 2 }, { productId: 'p3', qty: 1 }];
      const req = makeReq({ userId: 'u1', products: productItems });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      expect(insertedOrder.products).toEqual(productItems);
    });

    test('preserves the userId on the inserted record', () => {
      const req = makeReq({ userId: 'u-special', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      const insertedOrder = insert.mock.calls[0][1];
      expect(insertedOrder.userId).toBe('u-special');
    });
  });

  // -------------------------------------------------------------------------
  // Interaction / side-effect checks
  // -------------------------------------------------------------------------

  describe('DB interaction', () => {
    test('calls findAll("products") exactly once per request', () => {
      const req = makeReq({ userId: 'u1', products: [{ productId: 'p1', qty: 1 }] });
      const res = makeRes();
      insert.mockImplementation((_, item) => item);

      placeOrder(req, res);

      expect(findAll).toHaveBeenCalledWith('products');
      expect(findAll).toHaveBeenCalledTimes(1);
    });

    test('does not call findAll when validation fails', () => {
      const req = makeReq({ userId: 'u1', products: [] });
      const res = makeRes();

      placeOrder(req, res);

      expect(findAll).not.toHaveBeenCalled();
    });
  });
});
