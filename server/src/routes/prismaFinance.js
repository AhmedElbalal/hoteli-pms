import { Router } from 'express';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

export const prismaFinanceRouter = Router();

const QC_TAX = { tps: 0.05, tvq: 0.09975, lodging: 0.035 };
const moneySchema = z.object({
  amount: z.number().positive(),
  description: z.string().min(2),
  code: z.string().default('MISC')
});

function toNumber(value) {
  return Number(value || 0);
}

function reservationToApi(reservation) {
  return {
    ...reservation,
    roomNumber: reservation.roomNumber || '',
    email: reservation.email || '',
    rate: toNumber(reservation.rate),
    balance: toNumber(reservation.balance)
  };
}

function decorateFolio(folio) {
  const items = (folio.items || []).map((item) => ({ ...item, amount: toNumber(item.amount) }));
  const balance = items.reduce((sum, item) => sum + item.amount, 0);
  return { ...folio, items, balance: Number(balance.toFixed(2)), taxes: QC_TAX };
}

function decorateHouseAccount(account) {
  const items = (account.items || []).map((item) => ({ ...item, amount: toNumber(item.amount) }));
  const balance = items.reduce((sum, item) => sum + item.amount, 0);
  return { ...account, items, balance: Number(balance.toFixed(2)) };
}

function normalizeMoneyInput(input) {
  return {
    ...input,
    amount: Number(input.amount || 0),
    description: String(input.description || '').trim(),
    code: String(input.code || 'MISC').trim() || 'MISC'
  };
}

function jsonSafe(value) {
  return JSON.parse(JSON.stringify(value));
}

async function writeAudit(user, action, entity, details = {}) {
  await prisma.auditLog.create({
    data: {
      id: `LOG-${Date.now()}-${nanoid(4)}`,
      userEmail: user?.email || 'system',
      role: user?.role || 'system',
      action,
      entity,
      details: jsonSafe(details)
    }
  });
}

async function updateReservationBalance(tx, reservationId) {
  const folio = await tx.folio.findUnique({
    where: { reservationId },
    include: { items: true }
  });
  if (!folio) return 0;
  const balance = (folio.items || []).reduce((sum, item) => sum + toNumber(item.amount), 0);
  await tx.reservation.update({
    where: { id: reservationId },
    data: { balance: Number(balance.toFixed(2)) }
  });
  return Number(balance.toFixed(2));
}

prismaFinanceRouter.use((req, _res, next) => {
  if (!process.env.DATABASE_URL) return next('router');
  next();
});

prismaFinanceRouter.use(requireAuth);

prismaFinanceRouter.patch('/reservations/:id/status', allowRoles('ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res, next) => {
  try {
    const statusResult = z.enum(['UNASSIGNED', 'ARRIVAL', 'IN_HOUSE', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW', 'BALANCE_REVIEW']).safeParse(req.body.status);
    if (!statusResult.success) return res.status(400).json({ error: 'Invalid reservation status' });

    const status = statusResult.data;
    const reservation = await prisma.$transaction(async (tx) => {
      const current = await tx.reservation.findUnique({ where: { id: req.params.id } });
      if (!current) {
        const error = new Error('Reservation not found');
        error.statusCode = 404;
        throw error;
      }

      const updated = await tx.reservation.update({ where: { id: current.id }, data: { status } });

      if (current.roomNumber && status === 'IN_HOUSE') {
        await tx.room.update({ where: { number: current.roomNumber }, data: { status: 'OCCUPIED' } });
      }
      if (current.roomNumber && status === 'CHECKED_OUT') {
        await tx.room.update({
          where: { number: current.roomNumber },
          data: { status: 'VACANT_DIRTY', housekeeping: 'DIRTY' }
        });
      }

      return updated;
    });

    await writeAudit(req.user, 'UPDATE_RESERVATION_STATUS', reservation.id, { status });
    res.json(reservationToApi(reservation));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

prismaFinanceRouter.get('/folios', async (_req, res, next) => {
  try {
    const folios = await prisma.folio.findMany({
      include: { items: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(folios.map(decorateFolio));
  } catch (error) {
    next(error);
  }
});

prismaFinanceRouter.get('/folios/:id', async (req, res, next) => {
  try {
    const folio = await prisma.folio.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] } }
    });
    if (!folio) return res.status(404).json({ error: 'Folio not found' });
    res.json(decorateFolio(folio));
  } catch (error) {
    next(error);
  }
});

prismaFinanceRouter.post('/folios/:id/charge', allowRoles('ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = moneySchema.safeParse(normalizeMoneyInput(req.body));
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid request data' });
    const data = parsed.data;

    const folio = await prisma.$transaction(async (tx) => {
      const existing = await tx.folio.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        const error = new Error('Folio not found');
        error.statusCode = 404;
        throw error;
      }

      await tx.folioItem.create({
        data: {
          id: `FI-${nanoid(8)}`,
          folioId: existing.id,
          type: 'CHARGE',
          code: data.code,
          description: data.description,
          amount: data.amount,
          date: new Date().toISOString().slice(0, 10)
        }
      });

      await updateReservationBalance(tx, existing.reservationId);
      return tx.folio.findUnique({ where: { id: existing.id }, include: { items: true } });
    });

    await writeAudit(req.user, 'POST_FOLIO_CHARGE', folio.id, data);
    res.json(decorateFolio(folio));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

prismaFinanceRouter.post('/folios/:id/payment', allowRoles('ADMIN', 'FRONT_DESK', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = moneySchema.safeParse(normalizeMoneyInput(req.body));
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid request data' });
    const data = parsed.data;

    const folio = await prisma.$transaction(async (tx) => {
      const existing = await tx.folio.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        const error = new Error('Folio not found');
        error.statusCode = 404;
        throw error;
      }

      await tx.folioItem.create({
        data: {
          id: `FI-${nanoid(8)}`,
          folioId: existing.id,
          type: 'PAYMENT',
          code: data.code,
          description: data.description,
          amount: -data.amount,
          date: new Date().toISOString().slice(0, 10)
        }
      });

      await updateReservationBalance(tx, existing.reservationId);
      return tx.folio.findUnique({ where: { id: existing.id }, include: { items: true } });
    });

    await writeAudit(req.user, 'POST_FOLIO_PAYMENT', folio.id, data);
    res.json(decorateFolio(folio));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});

prismaFinanceRouter.get('/house-accounts', async (_req, res, next) => {
  try {
    const accounts = await prisma.houseAccount.findMany({
      include: { items: { orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(accounts.map(decorateHouseAccount));
  } catch (error) {
    next(error);
  }
});

prismaFinanceRouter.post('/house-accounts', allowRoles('ADMIN', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    if (name.length < 2) return res.status(400).json({ error: 'House account name is required' });

    const account = await prisma.houseAccount.create({
      data: {
        id: `HA-${nanoid(6).toUpperCase()}`,
        name,
        owner: String(req.body.owner || 'Accounting').trim() || 'Accounting',
        status: 'OPEN'
      },
      include: { items: true }
    });

    await writeAudit(req.user, 'CREATE_HOUSE_ACCOUNT', account.id, { name: account.name, owner: account.owner });
    res.status(201).json(decorateHouseAccount(account));
  } catch (error) {
    next(error);
  }
});

prismaFinanceRouter.post('/house-accounts/:id/item', allowRoles('ADMIN', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res, next) => {
  try {
    const parsed = moneySchema.safeParse(normalizeMoneyInput(req.body));
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues?.[0]?.message || 'Invalid request data' });
    const data = parsed.data;
    const type = req.body.type === 'PAYMENT' ? 'PAYMENT' : 'CHARGE';

    const account = await prisma.$transaction(async (tx) => {
      const existing = await tx.houseAccount.findUnique({ where: { id: req.params.id } });
      if (!existing) {
        const error = new Error('House account not found');
        error.statusCode = 404;
        throw error;
      }

      await tx.houseAccountItem.create({
        data: {
          id: `HAI-${nanoid(6)}`,
          houseAccountId: existing.id,
          type,
          description: data.description,
          amount: type === 'PAYMENT' ? -data.amount : data.amount,
          date: new Date().toISOString().slice(0, 10)
        }
      });

      return tx.houseAccount.findUnique({ where: { id: existing.id }, include: { items: true } });
    });

    await writeAudit(req.user, 'POST_HOUSE_ACCOUNT_ITEM', account.id, { ...data, type });
    res.json(decorateHouseAccount(account));
  } catch (error) {
    if (error.statusCode) return res.status(error.statusCode).json({ error: error.message });
    next(error);
  }
});
