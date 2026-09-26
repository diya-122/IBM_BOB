'use strict';

/**
 * Formats a Date object or ISO string to "YYYY-MM-DD".
 */
function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  const year  = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates discounted price. discount is 0-100 percentage.
 */
function calculateDiscount(price, discount) {
  if (typeof price !== 'number' || price < 0) {
    throw new Error('price must be a non-negative number');
  }
  if (typeof discount !== 'number' || discount < 0 || discount > 100) {
    throw new Error('discount must be a number between 0 and 100');
  }
  const discounted = price * (1 - discount / 100);
  return Math.round(discounted * 100) / 100;
}

/**
 * Generates a random alphanumeric ID of given length (default 8).
 */
function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Paginates an array. Returns { data, page, limit, total, totalPages }.
 */
function paginate(array, page = 1, limit = 10) {
  const total      = array.length;
  const totalPages = Math.ceil(total / limit);
  const start      = (page - 1) * limit;
  const data       = array.slice(start, start + limit);
  return { data, page, limit, total, totalPages };
}

module.exports = { formatDate, calculateDiscount, generateId, paginate };
