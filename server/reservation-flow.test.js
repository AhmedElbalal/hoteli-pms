import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import request from 'supertest';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoteli-reservation-test-'));
process.env.HOTELI_DB_PATH = path.join(tempDir, 'db.json');
const { app } = await import('./src/index.js');

test('front desk creates a reservation, assigns a room, and rejects overlapping bookings', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'frontdesk@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const auth = { Authorization: 'Bearer ' + login.body.token };
  const dates = { checkIn: '2027-01-12', checkOut: '2027-01-14' };
  const created = await request(app).post('/api/reservations').set(auth).send({
    guestName: 'Portfolio Demo Guest', email: 'guest@example.com',
    ...dates, adults: 1, rate: 159, source: 'Direct', parking: false
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, 'UNASSIGNED');
  assert.equal(created.body.roomNumber, '');

  const assigned = await request(app).patch('/api/reservations/' + created.body.id + '/assign-room')
    .set(auth).send({ roomNumber: '202' });
  assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
  assert.equal(assigned.body.roomNumber, '202');
  assert.equal(assigned.body.status, 'ARRIVAL');

  const conflict = await request(app).post('/api/reservations').set(auth).send({
    guestName: 'Second Demo Guest', ...dates, roomNumber: '202', adults: 1, rate: 159
  });
  assert.equal(conflict.status, 409, JSON.stringify(conflict.body));

  const list = await request(app).get('/api/reservations').set(auth);
  assert.equal(list.status, 200);
  assert.ok(list.body.some(r => r.id === created.body.id && r.roomNumber === '202'));
});

test.after(async () => { await fs.rm(tempDir, { recursive: true, force: true }); });
