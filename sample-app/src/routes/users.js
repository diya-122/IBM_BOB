'use strict';

const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');
const { findAll, findById, insert, update, remove } = require('../db');

const router = Router();

function getUsersList(req, res) {
  const users = findAll('users');
  res.json(users);
}

function getUserById(req, res) {
  const user = findById('users', req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
}

function createUser(req, res) {
  const { name, email } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Missing required fields: name, email' });
  }
  const user = insert('users', {
    id: uuidv4(),
    name,
    email,
    role: req.body.role || 'user',
  });
  res.status(201).json(user);
}

function updateUser(req, res) {
  const updated = update('users', req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(updated);
}

function deleteUser(req, res) {
  const deleted = remove('users', req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.status(204).send();
}

router.get('/',    getUsersList);
router.get('/:id', getUserById);
router.post('/',   createUser);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

module.exports = router;
module.exports.router        = router;
module.exports.getUsersList  = getUsersList;
module.exports.getUserById   = getUserById;
module.exports.createUser    = createUser;
module.exports.updateUser    = updateUser;
module.exports.deleteUser    = deleteUser;
