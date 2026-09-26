'use strict';

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { findAll, findById, insert, update } = require('../db');

const router = Router();

const VALID_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function getOrdersList(req, res) {
  const orders = findAll('orders');
  res.json(orders);
}

function placeOrder(req, res) {
  const { userId, products } = req.body;
  if (!userId || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: 'Missing required fields: userId, products (non-empty array)' });
  }

  // Compute total from products in db
  const allProducts = findAll('products');
  let total = 0;
  for (const item of products) {
    const product = allProducts.find((p) => p.id === item.productId);
    if (product) {
      total += product.price * (item.qty || 1);
    }
  }

  const order = insert('orders', {
    id: uuidv4(),
    userId,
    products,
    status: 'pending',
    total: Math.round(total * 100) / 100,
  });
  res.status(201).json(order);
}

function getOrderById(req, res) {
  const order = findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
}

function updateOrderStatus(req, res) {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  const updated = update('orders', req.params.id, { status });
  if (!updated) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(updated);
}

function cancelOrder(req, res) {
  const order = findById('orders', req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Order not found' });
  }
  const updated = update('orders', req.params.id, { status: 'cancelled' });
  res.json(updated);
}

router.get('/',            getOrdersList);
router.post('/',           placeOrder);
router.get('/:id',         getOrderById);
router.patch('/:id/status', updateOrderStatus);
router.delete('/:id',      cancelOrder);

module.exports = router;
module.exports.router            = router;
module.exports.getOrdersList     = getOrdersList;
module.exports.placeOrder        = placeOrder;
module.exports.getOrderById      = getOrderById;
module.exports.updateOrderStatus = updateOrderStatus;
module.exports.cancelOrder       = cancelOrder;
