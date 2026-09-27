'use strict';

jest.mock('../../src/db');
jest.mock('uuid');

const { findAll, findById, insert, update, remove } = require('../../src/db');
const { v4: uuidv4 } = require('uuid');
const {
  getUsersList,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../../src/routes/users');

// ---------------------------------------------------------------------------
// Shared response factory — follows the rule: define fns first, attach after.
// ---------------------------------------------------------------------------
function makeRes() {
  const json   = jest.fn();
  const send   = jest.fn();
  const status = jest.fn();

  const res = { json, send, status };
  // status() and json() must be chainable
  status.mockReturnValue(res);
  json.mockReturnValue(res);
  send.mockReturnValue(res);
  return res;
}

// ---------------------------------------------------------------------------
// getUsersList
// ---------------------------------------------------------------------------
describe('getUsersList', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path – returns all users as JSON', () => {
    const users = [
      { id: '1', name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: '2', name: 'Bob',   email: 'bob@example.com',   role: 'user'  },
    ];
    findAll.mockReturnValue(users);

    const req = {};
    const res = makeRes();

    getUsersList(req, res);

    expect(findAll).toHaveBeenCalledWith('users');
    expect(res.json).toHaveBeenCalledWith(users);
  });

  it('edge case – returns empty array when no users exist', () => {
    findAll.mockReturnValue([]);

    const req = {};
    const res = makeRes();

    getUsersList(req, res);

    expect(res.json).toHaveBeenCalledWith([]);
  });
});

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------
describe('getUserById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path – returns the user when found', () => {
    const user = { id: 'abc', name: 'Alice', email: 'alice@example.com', role: 'user' };
    findById.mockReturnValue(user);

    const req = { params: { id: 'abc' } };
    const res = makeRes();

    getUserById(req, res);

    expect(findById).toHaveBeenCalledWith('users', 'abc');
    expect(res.json).toHaveBeenCalledWith(user);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('error case – responds 404 when user is not found', () => {
    findById.mockReturnValue(null);

    const req = { params: { id: 'nonexistent' } };
    const res = makeRes();

    getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('edge case – responds 404 when findById returns undefined', () => {
    findById.mockReturnValue(undefined);

    const req = { params: { id: 'ghost' } };
    const res = makeRes();

    getUserById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------
describe('createUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path – creates and returns the new user with status 201', () => {
    const fixedId  = 'fixed-uuid-1234';
    const created  = new Date(Date.UTC(2024, 0, 15)); // 2024-01-15
    const newUser  = { id: fixedId, name: 'Carol', email: 'carol@example.com', role: 'user' };

    uuidv4.mockReturnValue(fixedId);
    insert.mockReturnValue(newUser);

    const req = { body: { name: 'Carol', email: 'carol@example.com' } };
    const res = makeRes();

    createUser(req, res);

    expect(insert).toHaveBeenCalledWith('users', {
      id:    fixedId,
      name:  'Carol',
      email: 'carol@example.com',
      role:  'user',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(newUser);
  });

  it('edge case – uses provided role when given', () => {
    const fixedId = 'fixed-uuid-5678';
    const newUser = { id: fixedId, name: 'Dan', email: 'dan@example.com', role: 'admin' };

    uuidv4.mockReturnValue(fixedId);
    insert.mockReturnValue(newUser);

    const req = { body: { name: 'Dan', email: 'dan@example.com', role: 'admin' } };
    const res = makeRes();

    createUser(req, res);

    expect(insert).toHaveBeenCalledWith('users', {
      id:    fixedId,
      name:  'Dan',
      email: 'dan@example.com',
      role:  'admin',
    });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('error case – responds 400 when name is missing', () => {
    const req = { body: { email: 'nobody@example.com' } };
    const res = makeRes();

    createUser(req, res);

    expect(insert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: name, email' });
  });

  it('error case – responds 400 when email is missing', () => {
    const req = { body: { name: 'Nameless' } };
    const res = makeRes();

    createUser(req, res);

    expect(insert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing required fields: name, email' });
  });

  it('error case – responds 400 when body is empty', () => {
    const req = { body: {} };
    const res = makeRes();

    createUser(req, res);

    expect(insert).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------
describe('updateUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path – returns the updated user', () => {
    const updatedUser = { id: 'abc', name: 'Alice Updated', email: 'alice@example.com', role: 'user' };
    update.mockReturnValue(updatedUser);

    const req = { params: { id: 'abc' }, body: { name: 'Alice Updated' } };
    const res = makeRes();

    updateUser(req, res);

    expect(update).toHaveBeenCalledWith('users', 'abc', { name: 'Alice Updated' });
    expect(res.json).toHaveBeenCalledWith(updatedUser);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('error case – responds 404 when user is not found', () => {
    update.mockReturnValue(null);

    const req = { params: { id: 'missing' }, body: { name: 'Ghost' } };
    const res = makeRes();

    updateUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  it('edge case – passes the full body to update, including multiple fields', () => {
    const body        = { name: 'Eve', email: 'eve@example.com', role: 'admin' };
    const updatedUser = { id: 'xyz', ...body };
    update.mockReturnValue(updatedUser);

    const req = { params: { id: 'xyz' }, body };
    const res = makeRes();

    updateUser(req, res);

    expect(update).toHaveBeenCalledWith('users', 'xyz', body);
    expect(res.json).toHaveBeenCalledWith(updatedUser);
  });
});

// ---------------------------------------------------------------------------
// deleteUser
// ---------------------------------------------------------------------------
describe('deleteUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path – responds 204 with no body when user is deleted', () => {
    remove.mockReturnValue({ id: 'abc', name: 'Alice' });

    const req = { params: { id: 'abc' } };
    const res = makeRes();

    deleteUser(req, res);

    expect(remove).toHaveBeenCalledWith('users', 'abc');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(res.send).toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('error case – responds 404 when user is not found', () => {
    remove.mockReturnValue(null);

    const req = { params: { id: 'nonexistent' } };
    const res = makeRes();

    deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
    expect(res.send).not.toHaveBeenCalled();
  });

  it('edge case – responds 404 when remove returns undefined', () => {
    remove.mockReturnValue(undefined);

    const req = { params: { id: 'ghost' } };
    const res = makeRes();

    deleteUser(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });
});
