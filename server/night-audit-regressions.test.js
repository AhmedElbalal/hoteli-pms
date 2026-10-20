import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import request from 'supertest';

// Independent fixture: exercise revenue recognition at the Night Audit boundary.
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoteli-night-audit-regression-'));
process.env.HOTELI_DB_PATH = path.join(dir, 'db.json');
const { app } = await import('./src/index.js');

test('multi-night reservation earns room revenue on each stayed hotel date, not all on arrival', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'auditor@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200);
  const auth = { Authorization: 'Bearer ' + login.body.token };
  const created = await request(app).post('/api/reservations').set(auth).send({
    guestName: 'Regression Multi Night', checkIn: '2035-07-10', checkOut: '2035-07-12',
    adults: 1, rate: 100, source: 'Direct'
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const first = await request(app).post('/api/night-audit/run').set(auth).send({ date: '2035-07-10' });
  assert.equal(first.status, 201, JSON.stringify(first.body));
  const second = await request(app).post('/api/night-audit/run').set(auth).send({ date: '2035-07-11' });
  assert.equal(second.status, 201, JSON.stringify(second.body));
  assert.equal(first.body.roomRevenue, 100, 'First hotel night must recognize one night of room revenue');
  assert.equal(second.body.roomRevenue, 100, 'Second hotel night must recognize its own room revenue');
});

test('no-show reservation must not count as a sold occupied room night', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'auditor@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200);
  const auth = { Authorization: 'Bearer ' + login.body.token };
  const rooms = await request(app).get('/api/rooms').set(auth);
  const available = rooms.body.find(r => r.status !== 'Maintenance');
  assert.ok(available, 'Need a room for the regression fixture');
  const created = await request(app).post('/api/reservations').set(auth).send({
    guestName: 'Regression No Show', roomNumber: available.number,
    checkIn: '2035-08-10', checkOut: '2035-08-11',
    adults: 1, rate: 100, source: 'Direct'
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const audit = await request(app).post('/api/night-audit/run').set(auth).send({ date: '2035-08-10' });
  assert.equal(audit.status, 201, JSON.stringify(audit.body));
  assert.equal(audit.body.roomNightsSold, 0, 'A no-show is not a stayed room night');
  assert.equal(audit.body.roomRevenue, 0, 'A no-show fee is separate from earned room revenue');
});

test('maintenance rooms are excluded from available inventory at audit close', async () => {
  const login = await request(app).post('/api/auth/login').send({ email: 'auditor@hoteli.com', password: 'demo123' });
  assert.equal(login.status, 200);
  const auth = { Authorization: 'Bearer ' + login.body.token };
  const rooms = await request(app).get('/api/rooms').set(auth);
  const room = rooms.body.find(r => r.status !== 'Maintenance');
  assert.ok(room);
  const changed = await request(app).patch('/api/rooms/' + room.number).set(auth).send({ status: 'Maintenance' });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  const updated = await request(app).get('/api/rooms').set(auth);
  const expected = updated.body.filter(r => r.status !== 'Maintenance').length;
  const audit = await request(app).post('/api/night-audit/run').set(auth).send({ date: '2035-09-10' });
  assert.equal(audit.status, 201, JSON.stringify(audit.body));
  assert.equal(audit.body.roomsAvailable, expected);
});

test.after(async () => { await fs.rm(dir, { recursive: true, force: true }); });
