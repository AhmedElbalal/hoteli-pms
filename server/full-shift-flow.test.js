import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import request from 'supertest';

const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hoteli-full-shift-'));
process.env.HOTELI_DB_PATH = path.join(dir, 'db.json');
const { app } = await import('./src/index.js');

test('full simulated shift: reservation to room assignment, check-in, payment, audit and check-out', async () => {
  async function login(email) {
    const response = await request(app).post('/api/auth/login').send({ email, password: 'demo123' });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return { Authorization: 'Bearer ' + response.body.token };
  }
  const frontDesk = await login('frontdesk@hoteli.com');
  const auditor = await login('auditor@hoteli.com');
  const rooms = await request(app).get('/api/rooms').set(frontDesk);
  assert.equal(rooms.status, 200);
  const room = rooms.body.find(r => r.status === 'Vacant Ready');
  assert.ok(room, 'Need a vacant ready room for the simulated guest');

  const date = '2036-02-10';
  const checkoutDate = '2036-02-11';
  const created = await request(app).post('/api/reservations').set(frontDesk).send({
    guestName: 'Simulated Full Shift Guest', checkIn: date, checkOut: checkoutDate,
    adults: 1, rate: 100, source: 'Direct'
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.status, 'UNASSIGNED');
  const id = created.body.id;
  const assigned = await request(app).patch('/api/reservations/' + id + '/assign-room')
    .set(frontDesk).send({ roomNumber: room.number });
  assert.equal(assigned.status, 200, JSON.stringify(assigned.body));
  assert.equal(assigned.body.status, 'ARRIVAL');
  const checkedIn = await request(app).patch('/api/reservations/' + id + '/status')
    .set(frontDesk).send({ status: 'IN_HOUSE' });
  assert.equal(checkedIn.status, 200, JSON.stringify(checkedIn.body));
  const occupied = await request(app).get('/api/rooms').set(frontDesk);
  assert.equal(occupied.body.find(r => r.number === room.number).status, 'Occupied');

  const folioId = 'F-' + id;
  const folioList = await request(app).get('/api/folios').set(frontDesk);
  assert.equal(folioList.status, 200);
  const folio = folioList.body.find(f => f.id === folioId);
  assert.ok(folio);
  const chargeBalance = folio.balance;
  assert.ok(chargeBalance > 100, 'Room rate plus taxes must be posted');
  const paid = await request(app).post('/api/folios/' + folioId + '/payment')
    .set(frontDesk).send({ amount: chargeBalance, description: 'Simulated card payment', code: 'CARD' });
  assert.equal(paid.status, 200, JSON.stringify(paid.body));
  assert.ok(Math.abs(paid.body.balance) < 0.01, 'Guest folio must be fully paid');

  const audit = await request(app).post('/api/night-audit/run').set(auditor)
    .send({ date, paymentMismatch: 0 });
  assert.equal(audit.status, 201, JSON.stringify(audit.body));
  assert.equal(audit.body.status, 'LOCKED');
  assert.equal(audit.body.roomRevenue, 100);
  assert.ok(audit.body.roomNightsSold >= 1);

  const checkedOut = await request(app).patch('/api/reservations/' + id + '/status')
    .set(frontDesk).send({ status: 'CHECKED_OUT' });
  assert.equal(checkedOut.status, 200, JSON.stringify(checkedOut.body));
  assert.ok(Math.abs(checkedOut.body.balance) < 0.01);
  const finalRooms = await request(app).get('/api/rooms').set(frontDesk);
  assert.equal(finalRooms.body.find(r => r.number === room.number).status, 'Vacant Dirty');
});

test.after(async () => { await fs.rm(dir, { recursive: true, force: true }); });
