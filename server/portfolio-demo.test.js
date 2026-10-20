import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { seedData } from './src/data/seedData.js';

test('demo includes all four portfolio roles and matching password hashes', () => {
  const expected = ['ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'];
  assert.deepEqual(seedData.users.map(u => u.role), expected);
  for (const user of seedData.users) {
    assert.match(user.email, /@hoteli\.com$/);
    assert.equal(bcrypt.compareSync('demo123', user.passwordHash), true, 'Demo login password must match the documented credentials');
  }
});

test('demo reservation rooms and folios reference valid records', () => {
  const roomNumbers = new Set(seedData.rooms.map(r => r.number));
  const reservationIds = new Set(seedData.reservations.map(r => r.id));
  assert.equal(seedData.rooms.length, 24);
  for (const r of seedData.reservations) {
    if (r.roomNumber) assert.ok(roomNumbers.has(r.roomNumber), 'Reservation room must exist');
    assert.ok(r.checkIn < r.checkOut, 'Check-out must follow check-in');
  }
  for (const f of seedData.folios) {
    assert.ok(reservationIds.has(f.reservationId), 'Folio must belong to a reservation');
    assert.ok(Array.isArray(f.items));
  }
});

test('demo includes night audit and reporting sample collections', () => {
  for (const key of ['nightAudits', 'houseAccounts', 'auditLogs', 'supportTickets']) {
    assert.ok(Array.isArray(seedData[key]), key + ' should be a list');
  }
});
