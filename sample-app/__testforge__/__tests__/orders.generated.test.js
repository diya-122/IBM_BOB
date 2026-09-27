'use strict';

jest.mock('../../src/db');
jest.mock('uuid');

const { findAll, findById, insert, update } = require('../../src/db');
const { v4: uuidv4 } = require('uuid');

const {
  getOrdersList,
  placeOrder,
  getOrderById,
  updateOrderStatus,
  cancelOrder,
} = require('../../src/routes/orders');

// ---------------------------------------------------------------------------
// Helper – build a mock Express res object following the rule:
// define jest.fn() calls first, then attach to the object.
// ---------------------------------------------------------------------------
function makeRes() {
  const json   = jest.fn();
  const send   = jest.fn();
  const status = jest.fn();
  const res    = { json, send, status };
  // status() must return res so callers can chain .json()
  status.mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// getOrdersList  (exported as getOrdersList)
// ---------------------------------------------------------------------------
describe('getOrdersList', () => {
  beforeEach(() => jest.clearAllMocks());

  const sampleOrders = [
    { id: 'o1', userId: 'u1', products: [], status: 'delivered', total: 44.97 },
    { id: 'o2', userId: 'u2', products: [], status: 'pending',   total: 49.99 },
  ];

  test('happy path – returns all orders as JSON', () => {
    findAll.mockReturnValue(sampleOrders);
    const req = {};
    const res = makeRes();

    getOrdersList(req, res);

    expect(findAll).toHaveBeenCalledWith('orders');
    expect(res.json).toHaveBeenCalledWith(sampleOrders);
  });

  test('edge case – returns empty array when store is empty', () => {
    findAll.mockReturnValue([]);
    const req = {};
    const res = makeRes();

    getOrdersList(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });
});

// ---------------------------------------------------------------------------
// getOrderById
// ---------------------------------------------------------------------------
describe('getOrderById', () => {
  beforeEach(() => jest.clearAllMocks());

  const order = { id: 'o1', userId: 'u1', products: [], status: 'pending', total: 9.99 };

  test('happy path – returns the order when found', () => {
    findById.mockReturnValue(order);
    const req = { params: { id: 'o1' } };
    const res = makeRes();

    getOrderById(req, res);

    expect(findById).toHaveBeenCalledWith('orders', 'o1');
    expect(res.json).toHaveBeenCalledWith(order);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('error case – 404 when order not found', () => {
    findById.mockReturnValue(null);
    const req = { params: { id: 'does-not-exist' } };
    const res = makeRes();

    getOrderById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
  });
});

// ---------------------------------------------------------------------------
// placeOrder  (exported as placeOrder; the user spec calls it createOrder)
// ---------------------------------------------------------------------------
describe('placeOrder (createOrder)', () => {
  beforeEach(() => jest.clearAllMocks());

  const allProducts = [
    { id: 'p1', name: 'Widget A', price: 9.99,  stock: 100 },
    { id: 'p2', name: 'Widget B', price: 24.99, stock: 50  },
  ];

  test('happy path – creates order and returns 201 with computed total', () => {
    uuidv4.mockReturnValue('new-uuid');
    findAll.mockReturnValue(allProducts);
    const inserted = {
      id: 'new-uuid',
      userId: 'u1',
      products: [{ productId: 'p1', qty: 2 }],
      status: 'pending',
      total: 19.98,
    };
    insert.mockReturnValue(inserted);

    const req = { body: { userId: 'u1', products: [{ productId: 'p1', qty: 2 }] } };
    const res = makeRes();

    placeOrder(req, res);

    expect(insert).toHaveBeenCalledWith('orders', expect.objectContaining({
      id: 'new-uuid',
      userId: 'u1',
      status: 'pending',
      total: 19.98,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(inserted);
  });

  test('edge case – products whose IDs are not in the catalogue contribute 0 to total', () => {
    uuidv4.mockReturnValue('new-uuid-2');
    findAll.mockReturnValue(allProducts);
    const inserted = {
      id: 'new-uuid-2',
      userId: 'u2',
      products: [{ productId: 'unknown', qty: 3 }],
      status: 'pending',
      total: 0,
    };
    insert.mockReturnValue(inserted);

    const req = { body: { userId: 'u2', products: [{ productId: 'unknown', qty: 3 }] } };
    const res = makeRes();

    placeOrder(req, res);

    expect(insert).toHaveBeenCalledWith('orders', expect.objectContaining({ total: 0 }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('edge case – item.qty defaults to 1 when omitted', () => {
    uuidv4.mockReturnValue('uuid-qty');
    findAll.mockReturnValue(allProducts);
    const inserted = {
      id: 'uuid-qty',
      userId: 'u1',
      products: [{ productId: 'p1' }],
      status: 'pending',
      total: 9.99,
    };
    insert.mockReturnValue(inserted);

    const req = { body: { userId: 'u1', products: [{ productId: 'p1' }] } };
    const res = makeRes();

    placeOrder(req, res);

    expect(insert).toHaveBeenCalledWith('orders', expect.objectContaining({ total: 9.99 }));
  });

  test('error case – 400 when userId is missing', () => {
    const req = { body: { products: [{ productId: 'p1', qty: 1 }] } };
    const res = makeRes();

    placeOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Missing required fields: userId, products (non-empty array)',
    });
    expect(insert).not.toHaveBeenCalled();
  });

  test('error case – 400 when products is not an array', () => {
    const req = { body: { userId: 'u1', products: 'bad' } };
    const res = makeRes();

    placeOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(insert).not.toHaveBeenCalled();
  });

  test('error case – 400 when products array is empty', () => {
    const req = { body: { userId: 'u1', products: [] } };
    const res = makeRes();

    placeOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(insert).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updateOrderStatus
// ---------------------------------------------------------------------------
describe('updateOrderStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  const updatedOrder = { id: 'o2', userId: 'u2', products: [], status: 'shipped', total: 49.99 };

  test('happy path – updates status and returns the updated order', () => {
    update.mockReturnValue(updatedOrder);
    const req = { params: { id: 'o2' }, body: { status: 'shipped' } };
    const res = makeRes();

    updateOrderStatus(req, res);

    expect(update).toHaveBeenCalledWith('orders', 'o2', { status: 'shipped' });
    expect(res.json).toHaveBeenCalledWith(updatedOrder);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('edge case – accepts every valid status value', () => {
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    validStatuses.forEach((status) => {
      jest.clearAllMocks();
      update.mockReturnValue({ id: 'o1', status });
      const req = { params: { id: 'o1' }, body: { status } };
      const res = makeRes();

      updateOrderStatus(req, res);

      expect(update).toHaveBeenCalledWith('orders', 'o1', { status });
      expect(res.json).toHaveBeenCalled();
    });
  });

  test('error case – 400 when status is invalid', () => {
    const req = { params: { id: 'o1' }, body: { status: 'flying' } };
    const res = makeRes();

    updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('status must be one of') }),
    );
    expect(update).not.toHaveBeenCalled();
  });

  test('error case – 400 when status is missing', () => {
    const req = { params: { id: 'o1' }, body: {} };
    const res = makeRes();

    updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(update).not.toHaveBeenCalled();
  });

  test('error case – 404 when order does not exist', () => {
    update.mockReturnValue(null);
    const req = { params: { id: 'no-such-order' }, body: { status: 'pending' } };
    const res = makeRes();

    updateOrderStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
  });
});

// ---------------------------------------------------------------------------
// cancelOrder
// ---------------------------------------------------------------------------
describe('cancelOrder', () => {
  beforeEach(() => jest.clearAllMocks());

  const existingOrder   = { id: 'o2', userId: 'u2', products: [], status: 'pending',   total: 49.99 };
  const cancelledOrder  = { id: 'o2', userId: 'u2', products: [], status: 'cancelled', total: 49.99 };

  test('happy path – sets status to cancelled and returns updated order', () => {
    findById.mockReturnValue(existingOrder);
    update.mockReturnValue(cancelledOrder);
    const req = { params: { id: 'o2' } };
    const res = makeRes();

    cancelOrder(req, res);

    expect(findById).toHaveBeenCalledWith('orders', 'o2');
    expect(update).toHaveBeenCalledWith('orders', 'o2', { status: 'cancelled' });
    expect(res.json).toHaveBeenCalledWith(cancelledOrder);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('edge case – cancelling an already-cancelled order still calls update', () => {
    const alreadyCancelled = { ...existingOrder, status: 'cancelled' };
    findById.mockReturnValue(alreadyCancelled);
    update.mockReturnValue(alreadyCancelled);
    const req = { params: { id: 'o2' } };
    const res = makeRes();

    cancelOrder(req, res);

    expect(update).toHaveBeenCalledWith('orders', 'o2', { status: 'cancelled' });
    expect(res.json).toHaveBeenCalledWith(alreadyCancelled);
  });

  test('error case – 404 when order not found', () => {
    findById.mockReturnValue(null);
    const req = { params: { id: 'ghost-order' } };
    const res = makeRes();

    cancelOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Order not found' });
    expect(update).not.toHaveBeenCalled();
  });
});
