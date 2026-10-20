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

test.after(async () => { await fs.rm(tempDir, { recursive: true, force: true }); });
