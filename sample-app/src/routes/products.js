'use strict';

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { findAll, findById, insert, update, remove } = require('../db');

const router = Router();

function getAllProducts(req, res) {
  const products = findAll('products');
  res.json(products);
}

function getProductById(req, res) {
  const product = findById('products', req.params.id);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(product);
}

function createProduct(req, res) {
  const { name, price } = req.body;
  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: 'Missing required fields: name, price' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }
  const product = insert('products', {
    id: uuidv4(),
    name,
    price,
    stock: req.body.stock ?? 0,
  });
  res.status(201).json(product);
}

function updateProduct(req, res) {
  const updated = update('products', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.json(updated);
}

function deleteProduct(req, res) {
  const deleted = remove('products', req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Product not found' });
  }
  res.status(204).send();
}

router.get('/',     getAllProducts);
router.get('/:id',  getProductById);
router.post('/',    createProduct);
router.put('/:id',  updateProduct);
router.delete('/:id', deleteProduct);

module.exports = router;
module.exports.router          = router;
module.exports.getAllProducts   = getAllProducts;
module.exports.getProductById  = getProductById;
module.exports.createProduct   = createProduct;
module.exports.updateProduct   = updateProduct;
module.exports.deleteProduct   = deleteProduct;
