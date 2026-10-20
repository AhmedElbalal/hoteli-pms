import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import request from 'supertest';

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoteli-operations-test-'));
process.env.HOTELI_DB_PATH = path.join(tempDir, 'db.json');
const { app } = await import('./src/index.js');

test('portfolio workflow: check-in, folio charge/payment, check-out and night audit', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'auditor@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200, JSON.stringify(login.body));
  const auth = { Authorization: 'Bearer ' + login.body.token };
  const reservationId = 'R-3471241782';
  const inHouse = await request(app).patch('/api/reservations/' + reservationId + '/status').set(auth).send({ status: 'IN_HOUSE' });
  assert.equal(inHouse.status, 200, JSON.stringify(inHouse.body));
  assert.equal(inHouse.body.status, 'IN_HOUSE');

  const folioId = 'F-' + reservationId;
  const charge = await request(app).post('/api/folios/' + folioId + '/charge').set(auth)
    .send({ amount: 20, description: 'Demo minibar', code: 'MISC' });
  assert.equal(charge.status, 200, JSON.stringify(charge.body));
  assert.ok(charge.body.items.some(i => i.code === 'MISC' && i.amount === 20));
  const payment = await request(app).post('/api/folios/' + folioId + '/payment').set(auth)
    .send({ amount: 20, description: 'Demo card payment', code: 'CARD' });
  assert.equal(payment.status, 200, JSON.stringify(payment.body));
  assert.ok(payment.body.items.some(i => i.code === 'CARD' && i.amount === -20));

  const checkout = await request(app).patch('/api/reservations/' + reservationId + '/status').set(auth).send({ status: 'CHECKED_OUT' });
  assert.equal(checkout.status, 200, JSON.stringify(checkout.body));
  const rooms = await request(app).get('/api/rooms').set(auth);
  assert.equal(rooms.status, 200);
  assert.equal(rooms.body.find(r => r.number === '207')?.status, 'Vacant Dirty');

  const audit = await request(app).post('/api/night-audit/run').set(auth).send({ date: '2027-01-12', paymentMismatch: 0 });
  assert.equal(audit.status, 201, JSON.stringify(audit.body));
  assert.equal(audit.body.status, 'LOCKED');
  const duplicate = await request(app).post('/api/night-audit/run').set(auth).send({ date: '2027-01-12' });
  assert.equal(duplicate.status, 409);
  const report = await request(app).get('/api/reports/revenue').set(auth);
  assert.equal(report.status, 200);
  assert.ok(Array.isArray(report.body.nightAudits));
  assert.ok(report.body.nightAudits.some(a => a.date === '2027-01-12'));
});

test.after(async () => { await fs.rm(tempDir, { recursive: true, force: true }); });
