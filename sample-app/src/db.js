'use strict';

// In-memory store
const db = {
  users: [
    { id: 'u1', name: 'Alice Johnson', email: 'alice@example.com', role: 'admin' },
    { id: 'u2', name: 'Bob Smith',    email: 'bob@example.com',   role: 'user'  },
    { id: 'u3', name: 'Carol White',  email: 'carol@example.com', role: 'user'  },
  ],
  products: [
    { id: 'p1', name: 'Widget A', price: 9.99,  stock: 100 },
    { id: 'p2', name: 'Widget B', price: 24.99, stock: 50  },
    { id: 'p3', name: 'Gadget X', price: 49.99, stock: 20  },
  ],
  orders: [
    {
      id: 'o1',
      userId: 'u1',
      products: [{ productId: 'p1', qty: 2 }, { productId: 'p2', qty: 1 }],
      status: 'delivered',
      total: 44.97,
    },
    {
      id: 'o2',
      userId: 'u2',
      products: [{ productId: 'p3', qty: 1 }],
      status: 'pending',
      total: 49.99,
    },
  ],
};

function findAll(collection) {
  return db[collection] ?? [];
}

function findById(collection, id) {
  return db[collection].find((item) => item.id === id) ?? null;
}

function insert(collection, item) {
  db[collection].push(item);
  return item;
}

function update(collection, id, updates) {
  const index = db[collection].findIndex((item) => item.id === id);
  if (index === -1) return null;
  db[collection][index] = { ...db[collection][index], ...updates };
  return db[collection][index];
}

function remove(collection, id) {
  const index = db[collection].findIndex((item) => item.id === id);
  if (index === -1) return false;
  db[collection].splice(index, 1);
  return true;
}

module.exports = { findAll, findById, insert, update, remove };
