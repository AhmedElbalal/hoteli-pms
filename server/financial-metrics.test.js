import test from 'node:test';
import assert from 'node:assert/strict';
import { computeMetrics } from './src/services/metricsService.js';

// Regression cases: cumulative audited revenue must not be divided by today's occupancy.
test('ADR uses sold room nights for the same audited date, not current occupied rooms', () => {
  const db = {
    rooms: [{ status: 'Occupied' }, { status: 'Vacant' }, { status: 'Vacant' }, { status: 'Vacant' }],
    reservations: [],
    nightAudits: [
      { date: '2035-06-09', status: 'LOCKED', roomRevenue: 600, roomNightsSold: 3 },
      { date: '2035-06-10', status: 'LOCKED', roomRevenue: 200, roomNightsSold: 2 }
    ]
  };
  const metrics = computeMetrics(db);
  assert.equal(metrics.adr, 100, 'Daily ADR should be 200 / 2 sold room nights');
  assert.equal(metrics.revpar, 50, 'Daily RevPAR should be 200 / 4 available rooms');
});

test('zero sold room nights gives ADR zero, even with occupied room statuses', () => {
  const db = {
    rooms: [{ status: 'Occupied' }, { status: 'Vacant' }],
    reservations: [],
    nightAudits: [{ date: '2035-06-10', status: 'LOCKED', roomRevenue: 0, roomNightsSold: 0 }]
  };
  assert.equal(computeMetrics(db).adr, 0);
});
