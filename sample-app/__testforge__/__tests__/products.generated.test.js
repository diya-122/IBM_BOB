'use strict';

jest.mock('../../src/db');
jest.mock('uuid');

const { findAll, findById, insert, update, remove } = require('../../src/db');
const { v4: uuidv4 } = require('uuid');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../../src/routes/products');

// ---------------------------------------------------------------------------
// Helper: build a minimal Express-style mock response
// ---------------------------------------------------------------------------
function makeRes() {
  const json   = jest.fn();
  const send   = jest.fn();
  const status = jest.fn();

  const res = { json, send, status };
  // status() must return the same res so callers can chain .json() / .send()
  status.mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// getAllProducts
// ---------------------------------------------------------------------------
describe('getAllProducts', () => {
  afterEach(() => jest.clearAllMocks());

  test('happy path — returns all products as JSON', () => {
    const products = [
      { id: 'p1', name: 'Widget A', price: 9.99,  stock: 100 },
      { id: 'p2', name: 'Widget B', price: 24.99, stock: 50  },
    ];
    findAll.mockReturnValue(products);

    const req = {};
    const res = makeRes();

    getAllProducts(req, res);

    expect(findAll).toHaveBeenCalledWith('products');
    expect(res.json).toHaveBeenCalledWith(products);
  });

  test('edge case — returns empty array when store is empty', () => {
    findAll.mockReturnValue([]);

    const req = {};
    const res = makeRes();

    getAllProducts(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });
});

// ---------------------------------------------------------------------------
// getProductById
// ---------------------------------------------------------------------------
describe('getProductById', () => {
  afterEach(() => jest.clearAllMocks());

  test('happy path — returns the matching product', () => {
    const product = { id: 'p1', name: 'Widget A', price: 9.99, stock: 100 };
    findById.mockReturnValue(product);

    const req = { params: { id: 'p1' } };
    const res = makeRes();

    getProductById(req, res);

    expect(findById).toHaveBeenCalledWith('products', 'p1');
    expect(res.json).toHaveBeenCalledWith(product);
  });

  test('error case — 404 when product does not exist', () => {
    findById.mockReturnValue(null);

    const req = { params: { id: 'does-not-exist' } };
    const res = makeRes();

    getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });

  test('edge case — id is an empty string returns 404', () => {
    findById.mockReturnValue(null);

    const req = { params: { id: '' } };
    const res = makeRes();

    getProductById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });
});

// ---------------------------------------------------------------------------
// createProduct
// ---------------------------------------------------------------------------
describe('createProduct', () => {
  afterEach(() => jest.clearAllMocks());

  test('happy path — creates and returns the new product with 201', () => {
    uuidv4.mockReturnValue('generated-uuid');
    const created = { id: 'generated-uuid', name: 'Gadget Z', price: 19.99, stock: 5 };
    insert.mockReturnValue(created);

    const req = { body: { name: 'Gadget Z', price: 19.99, stock: 5 } };
    const res = makeRes();

    createProduct(req, res);

    expect(insert).toHaveBeenCalledWith('products', {
      id: 'generated-uuid',
      name: 'Gadget Z',
      price: 19.99,
      stock: 5,
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });

  test('edge case — stock defaults to 0 when omitted', () => {
    uuidv4.mockReturnValue('uuid-no-stock');
    const created = { id: 'uuid-no-stock', name: 'No-Stock Item', price: 5.00, stock: 0 };
    insert.mockReturnValue(created);

    const req = { body: { name: 'No-Stock Item', price: 5.00 } };
    const res = makeRes();

    createProduct(req, res);

    expect(insert).toHaveBeenCalledWith('products', {
      id: 'uuid-no-stock',
      name: 'No-Stock Item',
      price: 5.00,
      stock: 0,
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('error case — 400 when name is missing', () => {
    const req = { body: { price: 9.99 } };
    const res = makeRes();

    createProduct(req, res);

    expect(insert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: name, price',
    });
  });

  test('error case — 400 when price is missing', () => {
    const req = { body: { name: 'Widget' } };
    const res = makeRes();

    createProduct(req, res);

    expect(insert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: name, price',
    });
  });

  test('error case — 400 when price is null', () => {
    const req = { body: { name: 'Widget', price: null } };
    const res = makeRes();

    createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: name, price',
    });
  });

  test('error case — 400 when price is negative', () => {
    const req = { body: { name: 'Widget', price: -1 } };
    const res = makeRes();

    createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'price must be a non-negative number',
    });
  });

  test('error case — 400 when price is a string', () => {
    const req = { body: { name: 'Widget', price: 'free' } };
    const res = makeRes();

    createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'price must be a non-negative number',
    });
  });

  test('edge case — price of zero is accepted', () => {
    uuidv4.mockReturnValue('uuid-zero-price');
    const created = { id: 'uuid-zero-price', name: 'Free Item', price: 0, stock: 0 };
    insert.mockReturnValue(created);

    const req = { body: { name: 'Free Item', price: 0 } };
    const res = makeRes();

    createProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(created);
  });
});

// ---------------------------------------------------------------------------
// updateProduct
// ---------------------------------------------------------------------------
describe('updateProduct', () => {
  afterEach(() => jest.clearAllMocks());

  test('happy path — returns updated product', () => {
    const updated = { id: 'p1', name: 'Widget A+', price: 12.99, stock: 80 };
    update.mockReturnValue(updated);

    const req = { params: { id: 'p1' }, body: { name: 'Widget A+', price: 12.99 } };
    const res = makeRes();

    updateProduct(req, res);

    expect(update).toHaveBeenCalledWith('products', 'p1', { name: 'Widget A+', price: 12.99 });
    expect(res.json).toHaveBeenCalledWith(updated);
  });

  test('error case — 404 when product does not exist', () => {
    update.mockReturnValue(null);

    const req = { params: { id: 'ghost' }, body: { price: 5.00 } };
    const res = makeRes();

    updateProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });

  test('edge case — partial update (single field) is forwarded as-is', () => {
    const updated = { id: 'p2', name: 'Widget B', price: 24.99, stock: 99 };
    update.mockReturnValue(updated);

    const req = { params: { id: 'p2' }, body: { stock: 99 } };
    const res = makeRes();

    updateProduct(req, res);

    expect(update).toHaveBeenCalledWith('products', 'p2', { stock: 99 });
    expect(res.json).toHaveBeenCalledWith(updated);
  });
});

// ---------------------------------------------------------------------------
// deleteProduct
// ---------------------------------------------------------------------------
describe('deleteProduct', () => {
  afterEach(() => jest.clearAllMocks());

  test('happy path — responds with 204 and no body', () => {
    remove.mockReturnValue(true);

    const req = { params: { id: 'p1' } };
    const res = makeRes();

    deleteProduct(req, res);

    expect(remove).toHaveBeenCalledWith('products', 'p1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
  });

  test('error case — 404 when product does not exist', () => {
    remove.mockReturnValue(false);

    const req = { params: { id: 'no-such-product' } };
    const res = makeRes();

    deleteProduct(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });

  test('edge case — delete is idempotent: second call for same id returns 404', () => {
    // First call succeeds, second call returns false (already gone)
    remove.mockReturnValueOnce(true).mockReturnValueOnce(false);

    const req1 = { params: { id: 'p3' } };
    const res1 = makeRes();
    deleteProduct(req1, res1);
    expect(res1.status).toHaveBeenCalledWith(204);

    const req2 = { params: { id: 'p3' } };
    const res2 = makeRes();
    deleteProduct(req2, res2);
    expect(res2.status).toHaveBeenCalledWith(404);
    expect(res2.json).toHaveBeenCalledWith({ error: 'Product not found' });
  });
});
