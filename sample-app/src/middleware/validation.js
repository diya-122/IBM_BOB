'use strict';

/**
 * Returns middleware that validates required fields are present in req.body.
 */
function validateRequest(requiredFields) {
  return (req, res, next) => {
    const missing = requiredFields.filter(
      (field) => req.body[field] === undefined || req.body[field] === null
    );
    if (missing.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }
    next();
  };
}

/**
 * Validates pagination query params (page, limit).
 */
function validatePagination(req, res, next) {
  const page  = parseInt(req.query.page,  10);
  const limit = parseInt(req.query.limit, 10);
  if (req.query.page && (isNaN(page) || page < 1)) {
    return res.status(400).json({ error: 'Invalid page parameter' });
  }
  if (req.query.limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({ error: 'Invalid limit parameter' });
  }
  next();
}

module.exports = { validateRequest, validatePagination };
