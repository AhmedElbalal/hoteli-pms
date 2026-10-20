import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import request from 'supertest';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoteli-revenue-test-'));
process.env.HOTELI_DB_PATH = path.join(tempDir, 'db.json');
const { app } = await import('./src/index.js');

test('future reservation does not increase recognized room revenue before stay', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'frontdesk@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const auth = { Authorization: `Bearer ${login.body.token}` };
  const before = await request(app).get('/api/dashboard').set(auth);
  assert.equal(before.status, 200);
  const created = await request(app).post('/api/reservations').set(auth).send({
    guestName: 'Future Revenue Test', checkIn: '2035-06-10', checkOut: '2035-06-12',
    adults: 1, rate: 200, source: 'Direct', parking: false
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const after = await request(app).get('/api/dashboard').set(auth);
  assert.equal(after.status, 200);
  assert.equal(after.body.metrics.roomRevenue, before.body.metrics.roomRevenue,
    'A future booking must not increase recognized room revenue');
  assert.equal(after.body.metrics.adr, before.body.metrics.adr);
  assert.equal(after.body.metrics.revpar, before.body.metrics.revpar);
});


test('night audit posts one room night and cannot post the same date twice', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'auditor@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const auth = { Authorization: `Bearer ${login.body.token}` };
  const date = '2035-06-10';
  const created = await request(app).post('/api/reservations').set(auth).send({
    guestName: 'Audit Revenue Test', roomNumber: '202', checkIn: date,
    checkOut: '2035-06-12', adults: 1, rate: 200, parking: false
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const checkIn = await request(app).patch(`/api/reservations/${created.body.id}/status`).set(auth).send({ status: 'IN_HOUSE' });
  assert.equal(checkIn.status, 200, JSON.stringify(checkIn.body));
  const first = await request(app).post('/api/night-audit/run').set(auth).send({ date });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const folio = await request(app).get(`/api/folios/F-${created.body.id}`).set(auth);
  assert.equal(folio.status, 200);
  const nightlyRoomItems = folio.body.items.filter(i => i.code === 'ROOM' && i.date === date);
  assert.equal(nightlyRoomItems.length, 1, 'Exactly one nightly room charge should be posted');
  assert.equal(nightlyRoomItems[0].amount, 200);
  assert.equal(first.body.roomRevenue >= 200, true, 'Audit should include the posted room charge');
  const duplicate = await request(app).post('/api/night-audit/run').set(auth).send({ date });
  assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
  const folioAfter = await request(app).get(`/api/folios/F-${created.body.id}`).set(auth);
  assert.equal(folioAfter.body.items.filter(i => i.code === 'ROOM' && i.date === date).length, 1);
});

test.after(async () => { await fs.rm(tempDir, { recursive: true, force: true }); });
