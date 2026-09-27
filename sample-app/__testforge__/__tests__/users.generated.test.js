'use strict';

jest.mock('../../src/db');

const { remove } = require('../../src/db');
const { deleteUser } = require('../../src/routes/users');

// Helper: build a minimal Express-style mock response
function makeRes() {
  const json = jest.fn();
  const send = jest.fn();
  const status = jest.fn();

  const res = { json, send, status };
  // Allow chaining: res.status(x).json(...) and res.status(x).send()
  status.mockReturnValue(res);

  return res;
}

describe('deleteUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the user exists', () => {
    it('calls remove with the correct collection and id', () => {
      remove.mockReturnValue(true);

      const req = { params: { id: 'u1' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith('users', 'u1');
    });

    it('responds with status 204', () => {
      remove.mockReturnValue(true);

      const req = { params: { id: 'u1' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('calls send() with no body after 204', () => {
      remove.mockReturnValue(true);

      const req = { params: { id: 'u1' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(res.send).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('does not call res.json when the user is found', () => {
      remove.mockReturnValue(true);

      const req = { params: { id: 'u2' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when the user does not exist', () => {
    it('calls remove with the correct collection and id', () => {
      remove.mockReturnValue(false);

      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(remove).toHaveBeenCalledTimes(1);
      expect(remove).toHaveBeenCalledWith('users', 'nonexistent');
    });

    it('responds with status 404', () => {
      remove.mockReturnValue(false);

      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('responds with a User not found error body', () => {
      remove.mockReturnValue(false);

      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    });

    it('does not call send() when the user is not found', () => {
      remove.mockReturnValue(false);

      const req = { params: { id: 'nonexistent' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(res.send).not.toHaveBeenCalled();
    });

    it('returns early after sending the 404 response', () => {
      // Verifies the guard clause returns so no further res calls happen
      remove.mockReturnValue(false);

      const req = { params: { id: 'ghost' } };
      const res = makeRes();

      deleteUser(req, res);

      // Only one status call (the 404), no 204 status call
      expect(res.status).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('edge cases', () => {
    it('passes an empty-string id to remove unchanged', () => {
      remove.mockReturnValue(false);

      const req = { params: { id: '' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(remove).toHaveBeenCalledWith('users', '');
    });

    it('handles a numeric-string id correctly', () => {
      remove.mockReturnValue(true);

      const req = { params: { id: '42' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(remove).toHaveBeenCalledWith('users', '42');
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.send).toHaveBeenCalledWith();
    });

    it('does not mutate req.params', () => {
      remove.mockReturnValue(true);

      const params = { id: 'u3' };
      const req = { params };
      const res = makeRes();

      deleteUser(req, res);

      expect(req.params).toBe(params);
      expect(req.params.id).toBe('u3');
    });

    it('always calls remove exactly once per invocation', () => {
      remove.mockReturnValue(true);

      const req = { params: { id: 'u1' } };
      const res = makeRes();

      deleteUser(req, res);

      expect(remove).toHaveBeenCalledTimes(1);
    });
  });
});
