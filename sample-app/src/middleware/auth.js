'use strict';

const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'testforge-secret';

/**
 * Verifies Bearer JWT token. Attaches decoded payload to req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid token' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token verification failed' });
  }
}

module.exports = { authenticate };
