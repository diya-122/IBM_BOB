'use strict';

const request = require('supertest');
const app = require('../src/app');

describe('GET /api/users', () => {
  it('returns 200 with array of users', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
