import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { readDb, writeDb, logAudit } from '../utils/db.js';
import { requireAuth, allowRoles, signUser } from '../middleware/auth.js';
import { computeMetrics, accountBalance } from '../services/metricsService.js';

export const api = Router();

const QC_TAX = { tps: 0.05, tvq: 0.09975, lodging: 0.035 };

const reservationSchema = z.object({
  guestName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  roomNumber: z.string().optional().or(z.literal('')),
  source: z.string().default('Direct'),
  checkIn: z.string(),
  checkOut: z.string(),
  adults: z.number().min(1).default(1),
  rate: z.number().nonnegative(),
  parking: z.boolean().optional().default(false),
  notes: z.string().optional().default('')
});
const moneySchema = z.object({ amount: z.number().positive(), description: z.string().min(2), code: z.string().default('MISC') });

function overlaps(aIn, aOut, bIn, bOut) { return aIn < bOut && aOut > bIn; }
function roomIsAvailable(db, roomNumber, checkIn, checkOut, ignoreReservationId = null) {
  const room = db.rooms.find(r => r.number === roomNumber);
  if (!room || room.status === 'Maintenance') return false;
  return !db.reservations.some(r =>
    r.id !== ignoreReservationId &&
    r.roomNumber === roomNumber &&
    !['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'].includes(r.status) &&
    overlaps(checkIn, checkOut, r.checkIn, r.checkOut)
  );
}
function folioBalance(folio) { return (folio.items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0); }
function addFolioItem(folio, { type = 'CHARGE', code, description, amount, date }) {
  folio.items.push({ id: `FI-${nanoid(8)}`, type, code, description, amount: Number(Number(amount).toFixed(2)), date });
}
function postRoomTaxPackage(folio, { roomRate, parking = false, date }) {
  addFolioItem(folio, { code: 'ROOM', description: 'Room charge', amount: roomRate, date });
  addFolioItem(folio, { code: 'TPS_ROOM', description: 'TPS / GST on room', amount: roomRate * QC_TAX.tps, date });
  addFolioItem(folio, { code: 'TVQ_ROOM', description: 'TVQ / QST on room', amount: roomRate * QC_TAX.tvq, date });
  addFolioItem(folio, { code: 'LODGING_TAX', description: "Taxe d'hébergement / Lodging tax", amount: roomRate * QC_TAX.lodging, date });
  if (parking) {
    const parkingBase = 30;
    addFolioItem(folio, { code: 'PARKING', description: 'Parking', amount: parkingBase, date });
    addFolioItem(folio, { code: 'TPS_PARKING', description: 'TPS / GST on parking', amount: parkingBase * QC_TAX.tps, date });
    addFolioItem(folio, { code: 'TVQ_PARKING', description: 'TVQ / QST on parking', amount: parkingBase * QC_TAX.tvq, date });
  }
}
function syncReservationBalance(db, reservationId) {
  const folio = db.folios.find(f => f.reservationId === reservationId);
  const resv = db.reservations.find(r => r.id === reservationId);
  if (folio && resv) resv.balance = Number(folioBalance(folio).toFixed(2));
}
function decorateFolio(folio) { return { ...folio, balance: Number(folioBalance(folio).toFixed(2)), taxes: QC_TAX }; }
function sendValidation(res, result) {
  if (result.success) return null;
  const first = result.error.issues?.[0];
  return res.status(400).json({ error: first?.message || 'Invalid request data', validation: result.error.flatten() });
}
function normalizeReservationInput(input) {
  return { ...input, guestName: String(input.guestName || '').trim(), email: String(input.email || '').trim(), roomNumber: String(input.roomNumber || '').trim(), source: String(input.source || 'Direct').trim() || 'Direct', adults: Number(input.adults || 1), rate: Number(input.rate || 0), parking: Boolean(input.parking), notes: String(input.notes || '').trim() };
}
function normalizeMoneyInput(input) {
  return { ...input, amount: Number(input.amount || 0), description: String(input.description || '').trim(), code: String(input.code || 'MISC').trim() || 'MISC' };
}

api.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  const db = await readDb();
  const user = db.users.find(u => u.email.toLowerCase() === String(email || '').toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) return res.status(401).json({ error: 'Invalid email or password' });
  const { passwordHash, ...safeUser } = user;
  res.json({ token: signUser(user), user: safeUser });
});

api.use(requireAuth);
api.get('/me', (req, res) => res.json({ user: req.user }));
api.get('/dashboard', async (_req, res) => {
  const db = await readDb();
  res.json({ metrics: computeMetrics(db), rooms: db.rooms, reservations: db.reservations, supportTickets: db.supportTickets, nightAudits: db.nightAudits });
});

api.get('/availability', async (req, res) => {
  const checkIn = String(req.query.checkIn || '');
  const checkOut = String(req.query.checkOut || '');
  if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut are required' });
  const db = await readDb();
  const rooms = db.rooms.map(room => ({
    ...room, available: roomIsAvailable(db, room.number, checkIn, checkOut), suggestedRate: room.rateBase,
    taxesPreview: { roomCharge: room.rateBase, tps: Number((room.rateBase * QC_TAX.tps).toFixed(2)), tvq: Number((room.rateBase * QC_TAX.tvq).toFixed(2)), lodgingTax: Number((room.rateBase * QC_TAX.lodging).toFixed(2)), total: Number((room.rateBase * (1 + QC_TAX.tps + QC_TAX.tvq + QC_TAX.lodging)).toFixed(2)) }
  }));
  res.json({ checkIn, checkOut, rooms });
});

api.get('/reservations', async (_req, res) => res.json((await readDb()).reservations));
api.post('/reservations', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res) => {
  const parsed = reservationSchema.safeParse(normalizeReservationInput(req.body));
  const validationResponse = sendValidation(res, parsed); if (validationResponse) return validationResponse;
  const data = parsed.data; const db = await readDb();
  if (data.roomNumber) {
    if (!db.rooms.some(r => r.number === data.roomNumber)) return res.status(400).json({ error: 'Room does not exist' });
    if (!roomIsAvailable(db, data.roomNumber, data.checkIn, data.checkOut)) return res.status(409).json({ error: 'Room is not available for these dates' });
  }
  const reservation = { id: `R-${nanoid(8).toUpperCase()}`, ...data, roomNumber: data.roomNumber || '', email: data.email || '', status: data.roomNumber ? 'ARRIVAL' : 'UNASSIGNED', balance: 0 };
  const folio = { id: `F-${reservation.id}`, reservationId: reservation.id, guestName: reservation.guestName, status: 'OPEN', items: [] };
  postRoomTaxPackage(folio, { roomRate: data.rate, parking: data.parking, date: data.checkIn });
  db.reservations.unshift(reservation); db.folios.unshift(folio);
  syncReservationBalance(db, reservation.id);
  await writeDb(db); await logAudit(req.user, 'CREATE_RESERVATION', reservation.id, reservation); res.status(201).json(reservation);
});
api.patch('/reservations/:id/status', allowRoles('ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res) => {
  const statusResult = z.enum(['UNASSIGNED', 'ARRIVAL', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'BALANCE_REVIEW']).safeParse(req.body.status);
  const validationResponse = sendValidation(res, statusResult); if (validationResponse) return validationResponse;
  const status = statusResult.data; const db = await readDb(); const r = db.reservations.find(x => x.id === req.params.id); if (!r) return res.status(404).json({ error: 'Reservation not found' });
  r.status = status;
  const room = db.rooms.find(x => x.number === r.roomNumber);
  if (room && status === 'IN_HOUSE') room.status = 'Occupied';
  if (room && status === 'CHECKED_OUT') { room.status = 'Vacant Dirty'; room.housekeeping = 'Dirty'; }
  await writeDb(db); await logAudit(req.user, 'UPDATE_RESERVATION_STATUS', r.id, { status }); res.json(r);
});
api.patch('/reservations/:id/assign-room', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res) => {
  const roomResult = z.string().min(1, 'Room number is required').safeParse(String(req.body.roomNumber || '').trim());
  const validationResponse = sendValidation(res, roomResult); if (validationResponse) return validationResponse;
  const roomNumber = roomResult.data; const db = await readDb(); const r = db.reservations.find(x => x.id === req.params.id); if (!r) return res.status(404).json({ error: 'Reservation not found' });
  if (!roomIsAvailable(db, roomNumber, r.checkIn, r.checkOut, r.id)) return res.status(409).json({ error: 'Room is not available for this reservation date range' });
  r.roomNumber = roomNumber; if (r.status === 'UNASSIGNED') r.status = 'ARRIVAL';
  await writeDb(db); await logAudit(req.user, 'ASSIGN_ROOM', r.id, { roomNumber }); res.json(r);
});
api.patch('/reservations/:id/unassign-room', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res) => {
  const db = await readDb(); const r = db.reservations.find(x => x.id === req.params.id); if (!r) return res.status(404).json({ error: 'Reservation not found' });
  const oldRoom = r.roomNumber; r.roomNumber = ''; r.status = 'UNASSIGNED';
  const room = db.rooms.find(x => x.number === oldRoom); if (room && room.status === 'Occupied') room.status = 'Vacant Ready';
  await writeDb(db); await logAudit(req.user, 'UNASSIGN_ROOM', r.id, { oldRoom }); res.json(r);
});

api.get('/rooms', async (_req, res) => res.json((await readDb()).rooms));
api.patch('/rooms/:number', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res) => {
  const db = await readDb(); const room = db.rooms.find(r => r.number === req.params.number); if (!room) return res.status(404).json({ error: 'Room not found' });
  Object.assign(room, req.body); await writeDb(db); await logAudit(req.user, 'UPDATE_ROOM', room.number, req.body); res.json(room);
});

api.get('/folios', async (_req, res) => res.json((await readDb()).folios.map(decorateFolio)));
api.get('/folios/:id', async (req, res) => { const folio = (await readDb()).folios.find(f => f.id === req.params.id); if (!folio) return res.status(404).json({ error: 'Folio not found' }); res.json(decorateFolio(folio)); });
api.post('/folios/:id/charge', allowRoles('ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res) => {
  const parsed = moneySchema.safeParse(normalizeMoneyInput(req.body)); const validationResponse = sendValidation(res, parsed); if (validationResponse) return validationResponse; const data = parsed.data; const db = await readDb(); const folio = db.folios.find(f => f.id === req.params.id); if (!folio) return res.status(404).json({ error: 'Folio not found' });
  addFolioItem(folio, { type: 'CHARGE', code: data.code, description: data.description, amount: data.amount, date: new Date().toISOString().slice(0, 10) });
  syncReservationBalance(db, folio.reservationId); await writeDb(db); await logAudit(req.user, 'POST_FOLIO_CHARGE', folio.id, data); res.json(decorateFolio(folio));
});
api.post('/folios/:id/payment', allowRoles('ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res) => {
  const parsed = moneySchema.safeParse(normalizeMoneyInput(req.body)); const validationResponse = sendValidation(res, parsed); if (validationResponse) return validationResponse; const data = parsed.data; const db = await readDb(); const folio = db.folios.find(f => f.id === req.params.id); if (!folio) return res.status(404).json({ error: 'Folio not found' });
  addFolioItem(folio, { type: 'PAYMENT', code: data.code, description: data.description, amount: -data.amount, date: new Date().toISOString().slice(0, 10) });
  syncReservationBalance(db, folio.reservationId); await writeDb(db); await logAudit(req.user, 'POST_FOLIO_PAYMENT', folio.id, data); res.json(decorateFolio(folio));
});

api.get('/house-accounts', async (_req, res) => { const db = await readDb(); res.json(db.houseAccounts.map(a => ({ ...a, balance: accountBalance(a) }))); });
api.post('/house-accounts', allowRoles('ADMIN', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res) => {
  const db = await readDb(); const account = { id: `HA-${nanoid(6).toUpperCase()}`, name: req.body.name, owner: req.body.owner || 'Accounting', status: 'OPEN', items: [] };
  db.houseAccounts.unshift(account); await writeDb(db); await logAudit(req.user, 'CREATE_HOUSE_ACCOUNT', account.id, account); res.status(201).json(account);
});
api.post('/house-accounts/:id/item', allowRoles('ADMIN', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res) => {
  const parsed = moneySchema.safeParse(normalizeMoneyInput(req.body)); const validationResponse = sendValidation(res, parsed); if (validationResponse) return validationResponse; const data = parsed.data; const db = await readDb(); const account = db.houseAccounts.find(a => a.id === req.params.id); if (!account) return res.status(404).json({ error: 'House account not found' });
  account.items.push({ id: `HAI-${nanoid(6)}`, type: req.body.type === 'PAYMENT' ? 'PAYMENT' : 'CHARGE', description: data.description, amount: req.body.type === 'PAYMENT' ? -data.amount : data.amount, date: new Date().toISOString().slice(0, 10) });
  await writeDb(db); await logAudit(req.user, 'POST_HOUSE_ACCOUNT_ITEM', account.id, data); res.json({ ...account, balance: accountBalance(account) });
});

api.get('/night-audit', async (_req, res) => res.json((await readDb()).nightAudits));
api.post('/night-audit/run', allowRoles('ADMIN', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res) => {
  const db = await readDb();
  const date = req.body.date || new Date().toISOString().slice(0, 10);
  if (db.nightAudits.some(a => a.date === date && a.status === 'LOCKED')) return res.status(409).json({ error: 'Audit date already locked' });
  const arrivalsForDate = db.reservations.filter(r => r.checkIn === date && ['ARRIVAL', 'UNASSIGNED'].includes(r.status));
  const departuresForDate = db.reservations.filter(r => r.checkOut === date && ['IN_HOUSE', 'BALANCE_REVIEW'].includes(r.status));
  const noShows = arrivalsForDate.filter(r => r.status === 'ARRIVAL');
  noShows.forEach(r => {
    r.status = 'NO_SHOW';
    const folio = db.folios.find(f => f.reservationId === r.id);
    if (folio) { addFolioItem(folio, { code: 'NO_SHOW', description: 'No-show fee', amount: 50, date }); syncReservationBalance(db, r.id); }
  });
  const datedItems = db.folios.flatMap(f => (f.items || []).map(i => ({ ...i, folioId: f.id, guestName: f.guestName }))).filter(i => i.date === date);
  const roomRevenue = datedItems.filter(i => i.code === 'ROOM').reduce((s, i) => s + Number(i.amount || 0), 0);
  const parkingRevenue = datedItems.filter(i => i.code === 'PARKING').reduce((s, i) => s + Number(i.amount || 0), 0);
  const taxes = datedItems.filter(i => ['TPS_ROOM', 'TVQ_ROOM', 'LODGING_TAX', 'TPS_PARKING', 'TVQ_PARKING'].includes(i.code)).reduce((s, i) => s + Number(i.amount || 0), 0);
  const payments = datedItems.filter(i => i.type === 'PAYMENT').reduce((s, i) => s + Math.abs(Number(i.amount || 0)), 0);
  const audit = { id: `NA-${date}`, date, status: 'LOCKED', noShows: noShows.length, arrivals: arrivalsForDate.length, departures: departuresForDate.length, inHouse: db.reservations.filter(r => r.status === 'IN_HOUSE').length, paymentBatchStatus: Number(req.body.paymentMismatch || 0) === 0 ? 'Balanced' : 'Mismatch Review', paymentMismatch: Number(req.body.paymentMismatch || 0), roomRevenue: Number(roomRevenue.toFixed(2)), parkingRevenue: Number(parkingRevenue.toFixed(2)), taxes: Number(taxes.toFixed(2)), payments: Number(payments.toFixed(2)), roomTaxPosted: true, lockedAt: new Date().toISOString(), notes: req.body.notes ? [String(req.body.notes)] : ['Audit posted and locked.'] };
  db.nightAudits.unshift(audit); await writeDb(db); await logAudit(req.user, 'RUN_NIGHT_AUDIT', audit.id, audit); res.status(201).json(audit);
});

api.get('/reports/revenue', async (_req, res) => {
  const db = await readDb();
  const items = db.folios.flatMap(f => f.items.map(i => ({ ...i, folioId: f.id, guestName: f.guestName })));
  const summary = items.reduce((acc, i) => { acc[i.code] = Number(((acc[i.code] || 0) + Number(i.amount || 0)).toFixed(2)); return acc; }, {});
  res.json({ metrics: computeMetrics(db), summary, items, nightAudits: db.nightAudits, openBalances: db.reservations.filter(r => r.balance > 0) });
});
api.get('/reports/downtime', async (req, res) => {
  const db = await readDb(); const date = String(req.query.date || new Date().toISOString().slice(0, 10));
  res.json({ date, arrivals: db.reservations.filter(r => r.checkIn === date && ['ARRIVAL', 'UNASSIGNED'].includes(r.status)), departures: db.reservations.filter(r => r.checkOut === date && !['CANCELLED', 'NO_SHOW'].includes(r.status)), inHouse: db.reservations.filter(r => r.status === 'IN_HOUSE'), highBalances: db.reservations.filter(r => Number(r.balance || 0) >= 100), generatedAt: new Date().toISOString() });
});
api.get('/reports/in-house', async (_req, res) => { const db = await readDb(); res.json(db.reservations.filter(r => r.status === 'IN_HOUSE')); });

api.get('/support-tickets', async (_req, res) => res.json((await readDb()).supportTickets));
api.post('/support-tickets', async (req, res) => { const db = await readDb(); const t = { id: `CS-${Math.floor(1000000 + Math.random() * 9000000)}`, title: req.body.title, priority: req.body.priority || 'MEDIUM', status: 'OPEN', owner: 'HOTELI Support', createdAt: new Date().toISOString() }; db.supportTickets.unshift(t); await writeDb(db); await logAudit(req.user, 'CREATE_SUPPORT_TICKET', t.id, t); res.status(201).json(t); });
api.get('/audit-logs', allowRoles('MANAGER', 'ADMIN'), async (_req, res) => res.json((await readDb()).auditLogs));
