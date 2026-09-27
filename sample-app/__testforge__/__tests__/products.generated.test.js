'use strict';

const { deleteProduct } = require('../../src/routes/products');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  res.send   = jest.fn().mockReturnValue(res);
  return res;
}

jest.mock('../../src/db', () => ({
  findAll:  jest.fn(),
  findById: jest.fn(),
  insert:   jest.fn(),
  update:   jest.fn(),
  remove:   jest.fn(),
}));

const db = require('../../src/db');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('deleteProduct', () => {
  describe('when the product exists', () => {
    it('calls remove with the correct collection and id', () => {
      db.remove.mockReturnValue(true);
      const req = { params: { id: 'p1' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(db.remove).toHaveBeenCalledTimes(1);
      expect(db.remove).toHaveBeenCalledWith('products', 'p1');
    });

    it('responds with HTTP 204', () => {
      db.remove.mockReturnValue(true);
      const req = { params: { id: 'p1' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('calls send() with no body after 204', () => {
      db.remove.mockReturnValue(true);
      const req = { params: { id: 'p1' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(res.send).toHaveBeenCalledWith();
    });

    it('does not call res.json when deletion succeeds', () => {
      db.remove.mockReturnValue(true);
      const req = { params: { id: 'p2' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when the product does not exist', () => {
    it('calls remove with the correct collection and id', () => {
      db.remove.mockReturnValue(false);
      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(db.remove).toHaveBeenCalledTimes(1);
      expect(db.remove).toHaveBeenCalledWith('products', 'nonexistent');
    });

    it('responds with HTTP 404', () => {
      db.remove.mockReturnValue(false);
      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns a JSON error body with the expected message', () => {
      db.remove.mockReturnValue(false);
      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('does not call res.send when product is not found', () => {
      db.remove.mockReturnValue(false);
      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles an empty-string id — delegates to remove and returns 404', () => {
      db.remove.mockReturnValue(false);
      const req = { params: { id: '' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(db.remove).toHaveBeenCalledWith('products', '');
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Product not found' });
    });

    it('handles a numeric-string id that matches — responds 204', () => {
      db.remove.mockReturnValue(true);
      const req = { params: { id: '42' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(db.remove).toHaveBeenCalledWith('products', '42');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalled();
    });

    it('calls remove exactly once regardless of the outcome', () => {
      db.remove.mockReturnValue(true);
      const req = { params: { id: 'p3' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(db.remove).toHaveBeenCalledTimes(1);
    });

    it('does not call remove more than once when the product is absent', () => {
      db.remove.mockReturnValue(false);
      const req = { params: { id: 'ghost' } };
      const res = makeRes();

      deleteProduct(req, res);

      expect(db.remove).toHaveBeenCalledTimes(1);
    });

    it('status and send are called in the correct chained order on success', () => {
      const callOrder = [];
      db.remove.mockReturnValue(true);
      const req = { params: { id: 'p1' } };
      const res = {};
      res.status = jest.fn().mockImplementation((code) => {
        callOrder.push(`status(${code})`);
        return res;
      });
      res.send = jest.fn().mockImplementation(() => {
        callOrder.push('send()');
        return res;
      });
      res.json = jest.fn().mockReturnValue(res);

      deleteProduct(req, res);

      expect(callOrder).toEqual(['status(204)', 'send()']);
    });

    it('status and json are called in the correct chained order on not-found', () => {
      const callOrder = [];
      db.remove.mockReturnValue(false);
      const req = { params: { id: 'missing' } };
      const res = {};
      res.status = jest.fn().mockImplementation((code) => {
        callOrder.push(`status(${code})`);
        return res;
      });
      res.json = jest.fn().mockImplementation((body) => {
        callOrder.push(`json(${JSON.stringify(body)})`);
        return res;
      });
      res.send = jest.fn().mockReturnValue(res);

      deleteProduct(req, res);

      expect(callOrder).toEqual([
        'status(404)',
        `json(${JSON.stringify({ error: 'Product not found' })})`,
      ]);
    });
  });
});
