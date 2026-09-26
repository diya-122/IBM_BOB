'use strict';

const { formatDate } = require('../src/utils/helpers');

describe('formatDate', () => {
  it('formats a Date object to YYYY-MM-DD', () => {
    const date = new Date('2024-03-15T10:00:00Z');
    expect(formatDate(date)).toBe('2024-03-15');
  });

  it('formats an ISO string to YYYY-MM-DD', () => {
    expect(formatDate('2024-01-01T00:00:00Z')).toBe('2024-01-01');
  });
});
