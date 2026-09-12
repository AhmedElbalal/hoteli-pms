import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, allowRoles, signUser } from '../middleware/auth.js';

export const prismaCoreRouter = Router();

const QC_TAX = { tps: 0.05, tvq: 0.09975, lodging: 0.035 };

const reservationSchema = z.object({
  guestName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  roomNumber: z.string().optional().or(z.literal('')),
  source: z.string().default('Direct'),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  adults: z.number().min(1).default(1),
  rate: z.number().nonnegative(),
  parking: z.boolean().optional().default(false),
  notes: z.string().optional().default('')
});

const roomStatusToApi = {
  VACANT_READY: 'Vacant Ready',
  VACANT_DIRTY: 'Vacant Dirty',
  OCCUPIED: 'Occupied',
  GREEN_STAY: 'Green Stay',
  MAINTENANCE: 'Maintenance',
  OUT_OF_ORDER: 'Out of Order'
};

const roomStatusToDb = Object.fromEntries(Object.entries(roomStatusToApi).map(([key, value]) => [value, key]));

const housekeepingToApi = {
  CLEAN: 'Clean',
  DIRTY: 'Dirty',
  INSPECTED: 'Inspected',
  STAYOVER: 'Stayover',
  ECO: 'Eco'
};

const housekeepingToDb = Object.fromEntries(Object.entries(housekeepingToApi).map(([key, value]) => [value, key]));

function money(value) {
  return Number(value || 0);
}

function roomToApi(room) {
  return {
    ...room,
    status: roomStatusToApi[room.status] || room.status,
    housekeeping: housekeepingToApi[room.housekeeping] || room.housekeeping,
    rateBase: money(room.rateBase)
  };
}

function reservationToApi(reservation) {
  return {
    ...reservation,
    roomNumber: reservation.roomNumber || '',
    email: reservation.email || '',
    rate: money(reservation.rate),
    balance: money(reservation.balance)
  };
}

function normalizeReservationInput(input) {
  return {
    ...input,
    guestName: String(input.guestName || '').trim(),
    email: String(input.email || '').trim(),
    roomNumber: String(input.roomNumber || '').trim(),
    source: String(input.source || 'Direct').trim() || 'Direct',
    adults: Number(input.adults || 1),
    rate: Number(input.rate || 0),
    parking: Boolean(input.parking),
    notes: String(input.notes || '').trim()
  };
}

async function writeAudit(user, action, entity, details = {}) {
  await prisma.auditLog.create({
    data: {
      id: `LOG-${Date.now()}-${nanoid(4)}`,
      userEmail: user?.email || 'system',
      role: user?.role || 'system',
      action,
      entity,
      details
    }
  });
}

async function roomAvailable(roomNumber, checkIn, checkOut, ignoreReservationId = null, tx = prisma) {
  const room = await tx.room.findUnique({ where: { number: roomNumber } });
  if (!room || ['MAINTENANCE', 'OUT_OF_ORDER'].includes(room.status)) return false;

  const conflict = await tx.reservation.findFirst({
    where: {
      roomNumber,
      ...(ignoreReservationId ? { id: { not: ignoreReservationId } } : {}),
      status: { notIn: ['CANCELLED', 'NO_SHOW', 'CHECKED_OUT'] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn }
    },
    select: { id: true }
  });

  return !conflict;
}

function folioItemsForStay({ rate, parking, date }) {
  const items = [
    ['ROOM', 'Room charge', rate],
    ['TPS_ROOM', 'TPS / GST on room', rate * QC_TAX.tps],
    ['TVQ_ROOM', 'TVQ / QST on room', rate * QC_TAX.tvq],
    ['LODGING_TAX', "Taxe d'hébergement / Lodging tax", rate * QC_TAX.lodging]
  ];

  if (parking) {
    const parkingBase = 30;
    items.push(
      ['PARKING', 'Parking', parkingBase],
      ['TPS_PARKING', 'TPS / GST on parking', parkingBase * QC_TAX.tps],
      ['TVQ_PARKING', 'TVQ / QST on parking', parkingBase * QC_TAX.tvq]
    );
  }

  return items.map(([code, description, amount]) => ({
    id: `FI-${nanoid(8)}`,
    type: 'CHARGE',
    code,
    description,
    amount: Number(Number(amount).toFixed(2)),
    date
  }));
}

prismaCoreRouter.use((req, _res, next) => {
  if (!process.env.DATABASE_URL) return next('router');
  next();
});

prismaCoreRouter.post('/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.active || !bcrypt.compareSync(req.body.password || '', user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const { passwordHash, active, createdAt, updatedAt, ...safeUser } = user;
    res.json({ token: signUser(user), user: safeUser });
  } catch (error) {
    next(error);
  }
});

prismaCoreRouter.use(requireAuth);

prismaCoreRouter.get('/availability', async (req, res, next) => {
  try {
    const checkIn = String(req.query.checkIn || '');
    const checkOut = String(req.query.checkOut || '');
    if (!checkIn || !checkOut) return res.status(400).json({ error: 'checkIn and checkOut are required' });
    if (checkIn >= checkOut) return res.status(400).json({ error: 'checkOut must be after checkIn' });

    const rooms = await prisma.room.findMany({ orderBy: { number: 'asc' } });
    const output = await Promise.all(rooms.map(async (room) => {
      const rate = money(room.rateBase);
      return {
        ...roomToApi(room),
        available: await roomAvailable(room.number, checkIn, checkOut),
        suggestedRate: rate,
        taxesPreview: {
          roomCharge: rate,
          tps: Number((rate * QC_TAX.tps).toFixed(2)),
          tvq: Number((rate * QC_TAX.tvq).toFixed(2)),
          lodgingTax: Number((rate * QC_TAX.lodging).toFixed(2)),
          total: Number((rate * (1 + QC_TAX.tps + QC_TAX.tvq + QC_TAX.lodging)).toFixed(2))
        }
      };
    }));

    res.json({ checkIn, checkOut, rooms: output });
  } catch (error) {
    next(error);
  }
});

prismaCoreRouter.get('/rooms', async (_req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({ orderBy: { number: 'asc' } });
    res.json(rooms.map(roomToApi));
  } catch (error) {
    next(error);
  }
});

prismaCoreRouter.patch('/rooms/:number', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res, next) => {
  try {
    const existing = await prisma.room.findUnique({ where: { number: req.params.number } });
    if (!existing) return res.status(404).json({ error: 'Room not found' });

    const data = {};
    if (req.body.type !== undefined) data.type = String(req.body.type);
    if (req.body.notes !== undefined) data.notes = String(req.body.notes);
    if (req.body.rateBase !== undefined) data.rateBase = Number(req.body.rateBase);
    if (req.body.status !== undefined) {
      const status = roomStatusToDb[req.body.status] || req.body.status;
      if (!Object.keys(roomStatusToApi).includes(status)) return res.status(400).json({ error: 'Invalid room status' });
      data.status = status;
    }
    if (req.body.housekeeping !== undefined) {
      const housekeeping = housekeepingToDb[req.body.housekeeping] || req.body.housekeeping;
      if (!Object.keys(housekeepingToApi).includes(housekeeping)) return res.status(400).json({ error: 'Invalid housekeeping status' });
      data.housekeeping = housekeeping;
    }

    const room = await prisma.room.update({ where: { number: req.params.number }, data });
    await writeAudit(req.user, 'UPDATE_ROOM', room.number, req.body);
    res.json(roomToApi(room));
  } catch (error) {
    next(error);
  }
});

prismaCoreRouter.get('/reservations', async (_req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(reservations.map(reservationToApi));
  } catch (error) {
    next(error);
  }
});

prismaCoreRouter.post('/reservations', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = reservationSchema.safeParse(normalizeReservationInput(req.body));
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues?.[0]?.message || 'Invalid request data',
        validation: parsed.error.flatten()
      });
    }

    const data = parsed.data;
    if (data.checkIn >= data.checkOut) return res.status(400).json({ error: 'checkOut must be after checkIn' });

    const reservation = await prisma.$transaction(async (tx) => {
      if (data.roomNumber) {
        const exists = await tx.room.findUnique({ where: { number: data.roomNumber } });
        if (!exists) {
          const error = new Error('Room does not exist');
          error.statusCode = 400;
          throw error;
        }
        if (!(await roomAvailable(data.roomNumber, data.checkIn, data.checkOut, null, tx))) {
          const error = new Error('Room is not available for these dates');
          error.statusCode = 409;
          throw error;
        }
      }

      const id = `R-${nanoid(8).toUpperCase()}`;
      const items = folioItemsForStay({ rate: data.rate, parking: data.parking, date: data.checkIn });
      const balance = items.reduce((sum, item) => sum + item.amount, 0);

      return tx.reservation.create({
        data: {
          id,
          guestName: data.guestName,
          email: data.email || null,
          roomNumber: data.roomNumber || null,
          status: data.roomNumber ? 'ARRIVAL' : 'UNASSIGNED',
          source: data.source,
          checkIn: data.checkIn,
          checkOut: data.checkOut,
          adults: data.adults,
          rate: data.rate,
          balance: Number(balance.toFixed(2)),
          parking: data.parking,
          notes: data.notes,
          folio: {
            create: {
              id: `F-${id}`,
              guestName: data.guestName,
              status: 'OPEN',
              items: { create: items }
            }
          }
        }
      });
    });

    await writeAudit(req.user, 'CREATE_RESERVATION', reservation.id, reservationToApi(reservation));
    res.status(201).json(reservationToApi(reservation));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

prismaCoreRouter.patch('/reservations/:id/assign-room', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res, next) => {
  try {
    const roomNumber = String(req.body.roomNumber || '').trim();
    if (!roomNumber) return res.status(400).json({ error: 'Room number is required' });

    const reservation = await prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findUnique({ where: { id: req.params.id } });
      if (!current) {
        const error = new Error('Reservation not found');
        error.statusCode = 404;
        throw error;
      }
      if (!(await roomAvailable(roomNumber, current.checkIn, current.checkOut, current.id, tx))) {
        const error = new Error('Room is not available for this reservation date range');
        error.statusCode = 409;
        throw error;
      }
      return tx.reservation.update({
        where: { id: current.id },
        data: { roomNumber, ...(current.status === 'UNASSIGNED' ? { status: 'ARRIVAL' } : {}) }
      });
    });

    await writeAudit(req.user, 'ASSIGN_ROOM', reservation.id, { roomNumber });
    res.json(reservationToApi(reservation));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

prismaCoreRouter.patch('/reservations/:id/unassign-room', allowRoles('ADMIN', 'FRONT_DESK', 'MANAGER'), async (req, res, next) => {
  try {
    const current = await prisma.reservation.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Reservation not found' });

    const reservation = await prisma.reservation.update({
      where: { id: current.id },
      data: { roomNumber: null, status: 'UNASSIGNED' }
    });

    await writeAudit(req.user, 'UNASSIGN_ROOM', reservation.id, { oldRoom: current.roomNumber || '' });
    res.json(reservationToApi(reservation));
  } catch (error) {
    next(error);
  }
});
