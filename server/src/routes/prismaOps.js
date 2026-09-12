import { Router } from 'express';
import { nanoid } from 'nanoid';
import { prisma } from '../lib/prisma.js';
import { requireAuth, allowRoles } from '../middleware/auth.js';

export const prismaOpsRouter = Router();

const roomStatusToApi = {
  VACANT_READY: 'Vacant Ready',
  VACANT_DIRTY: 'Vacant Dirty',
  OCCUPIED: 'Occupied',
  GREEN_STAY: 'Green Stay',
  MAINTENANCE: 'Maintenance',
  OUT_OF_ORDER: 'Out of Order'
};

const housekeepingToApi = {
  CLEAN: 'Clean',
  DIRTY: 'Dirty',
  INSPECTED: 'Inspected',
  STAYOVER: 'Stayover',
  ECO: 'Eco'
};

const ticketPriorities = new Set(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const TAX_CODES = new Set(['TPS_ROOM', 'TVQ_ROOM', 'LODGING_TAX', 'TPS_PARKING', 'TVQ_PARKING']);

function money(value) {
  return Number(value || 0);
}

function safeJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
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

function ticketToApi(ticket) {
  return {
    id: ticket.id,
    title: ticket.subject,
    priority: ticket.priority,
    status: ticket.status,
    owner: ticket.owner || 'HOTELI Support',
    createdAt: ticket.createdAt
  };
}

function nightAuditToApi(audit) {
  const summary = audit.summary && typeof audit.summary === 'object' && !Array.isArray(audit.summary)
    ? audit.summary
    : {};
  return {
    id: audit.id,
    date: audit.businessDate,
    status: audit.status,
    ...summary,
    lockedAt: audit.completedAt || summary.lockedAt || null
  };
}

function computeMetrics({ rooms, reservations }) {
  const roomCount = rooms.length;
  const occupied = reservations.filter(r => ['IN_HOUSE', 'ARRIVAL', 'BALANCE_REVIEW'].includes(r.status)).length;
  const roomRevenue = reservations.reduce((sum, r) => sum + money(r.rate), 0);
  const openBalances = reservations.reduce((sum, r) => sum + money(r.balance), 0);

  return {
    rooms: roomCount,
    occupied,
    arrivals: reservations.filter(r => r.status === 'ARRIVAL').length,
    inHouse: reservations.filter(r => r.status === 'IN_HOUSE').length,
    departures: reservations.filter(r => r.status === 'CHECKED_OUT').length,
    roomRevenue,
    adr: occupied ? roomRevenue / occupied : 0,
    occupancy: roomCount ? (occupied / roomCount) * 100 : 0,
    revpar: roomCount ? roomRevenue / roomCount : 0,
    openBalances
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
      details: safeJson(details)
    }
  });
}

prismaOpsRouter.use((req, _res, next) => {
  if (!process.env.DATABASE_URL) return next('router');
  next();
});

prismaOpsRouter.use(requireAuth);

prismaOpsRouter.get('/me', (req, res) => res.json({ user: req.user }));

prismaOpsRouter.get('/dashboard', async (_req, res, next) => {
  try {
    const [rooms, reservations, supportTickets, nightAudits] = await Promise.all([
      prisma.room.findMany({ orderBy: { number: 'asc' } }),
      prisma.reservation.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.nightAudit.findMany({ orderBy: { businessDate: 'desc' } })
    ]);

    res.json({
      metrics: computeMetrics({ rooms, reservations }),
      rooms: rooms.map(roomToApi),
      reservations: reservations.map(reservationToApi),
      supportTickets: supportTickets.map(ticketToApi),
      nightAudits: nightAudits.map(nightAuditToApi)
    });
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.get('/support-tickets', async (_req, res, next) => {
  try {
    const tickets = await prisma.supportTicket.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(tickets.map(ticketToApi));
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.post('/support-tickets', async (req, res, next) => {
  try {
    const title = String(req.body.title || '').trim();
    const description = String(req.body.description || title).trim();
    const priority = String(req.body.priority || 'MEDIUM').trim().toUpperCase();

    if (title.length < 2) return res.status(400).json({ error: 'Ticket title is required' });
    if (!ticketPriorities.has(priority)) return res.status(400).json({ error: 'Invalid ticket priority' });

    const ticket = await prisma.supportTicket.create({
      data: {
        id: `CS-${Math.floor(1000000 + Math.random() * 9000000)}`,
        subject: title,
        description,
        priority,
        status: 'OPEN',
        owner: 'HOTELI Support',
        createdBy: req.user?.email || null
      }
    });

    await writeAudit(req.user, 'CREATE_SUPPORT_TICKET', ticket.id, ticketToApi(ticket));
    res.status(201).json(ticketToApi(ticket));
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.get('/night-audit', async (_req, res, next) => {
  try {
    const audits = await prisma.nightAudit.findMany({ orderBy: { businessDate: 'desc' } });
    res.json(audits.map(nightAuditToApi));
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.post('/night-audit/run', allowRoles('ADMIN', 'NIGHT_AUDITOR', 'MANAGER'), async (req, res, next) => {
  try {
    const date = String(req.body.date || new Date().toISOString().slice(0, 10));
    const paymentMismatch = Number(req.body.paymentMismatch || 0);
    const notes = req.body.notes ? [String(req.body.notes)] : ['Audit posted and locked.'];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'date must use YYYY-MM-DD' });
    if (!Number.isFinite(paymentMismatch)) return res.status(400).json({ error: 'paymentMismatch must be a number' });

    const existing = await prisma.nightAudit.findUnique({ where: { businessDate: date } });
    if (existing?.status === 'LOCKED') return res.status(409).json({ error: 'Audit date already locked' });

    const completedAt = new Date();

    const audit = await prisma.$transaction(async tx => {
      const reservations = await tx.reservation.findMany({ orderBy: { createdAt: 'desc' } });
      const arrivalsForDate = reservations.filter(r => r.checkIn === date && ['ARRIVAL', 'UNASSIGNED'].includes(r.status));
      const departuresForDate = reservations.filter(r => r.checkOut === date && ['IN_HOUSE', 'BALANCE_REVIEW'].includes(r.status));
      const noShows = arrivalsForDate.filter(r => r.status === 'ARRIVAL');

      for (const reservation of noShows) {
        const folio = await tx.folio.findUnique({ where: { reservationId: reservation.id }, include: { items: true } });
        let newBalance = money(reservation.balance);

        if (folio) {
          await tx.folioItem.create({
            data: {
              id: `FI-${nanoid(8)}`,
              folioId: folio.id,
              type: 'CHARGE',
              code: 'NO_SHOW',
              description: 'No-show fee',
              amount: 50,
              date
            }
          });
          newBalance = Number((folio.items.reduce((sum, item) => sum + money(item.amount), 0) + 50).toFixed(2));
        }

        await tx.reservation.update({
          where: { id: reservation.id },
          data: { status: 'NO_SHOW', balance: newBalance }
        });
      }

      const datedItems = await tx.folioItem.findMany({ where: { date } });
      const roomRevenue = datedItems.filter(i => i.code === 'ROOM').reduce((sum, i) => sum + money(i.amount), 0);
      const parkingRevenue = datedItems.filter(i => i.code === 'PARKING').reduce((sum, i) => sum + money(i.amount), 0);
      const taxes = datedItems.filter(i => TAX_CODES.has(i.code)).reduce((sum, i) => sum + money(i.amount), 0);
      const payments = datedItems.filter(i => i.type === 'PAYMENT').reduce((sum, i) => sum + Math.abs(money(i.amount)), 0);
      const inHouse = await tx.reservation.count({ where: { status: 'IN_HOUSE' } });

      const summary = {
        noShows: noShows.length,
        arrivals: arrivalsForDate.length,
        departures: departuresForDate.length,
        inHouse,
        paymentBatchStatus: paymentMismatch === 0 ? 'Balanced' : 'Mismatch Review',
        paymentMismatch,
        roomRevenue: Number(roomRevenue.toFixed(2)),
        parkingRevenue: Number(parkingRevenue.toFixed(2)),
        taxes: Number(taxes.toFixed(2)),
        payments: Number(payments.toFixed(2)),
        roomTaxPosted: true,
        lockedAt: completedAt.toISOString(),
        notes
      };

      return tx.nightAudit.upsert({
        where: { businessDate: date },
        update: {
          status: 'LOCKED',
          completedAt,
          completedById: req.user?.id || null,
          summary: safeJson(summary)
        },
        create: {
          id: `NA-${date}`,
          businessDate: date,
          status: 'LOCKED',
          completedAt,
          completedById: req.user?.id || null,
          summary: safeJson(summary)
        }
      });
    });

    const response = nightAuditToApi(audit);
    await writeAudit(req.user, 'RUN_NIGHT_AUDIT', audit.id, response);
    res.status(201).json(response);
  } catch (error) {
    if (error?.code === 'P2002') return res.status(409).json({ error: 'Audit date already locked' });
    next(error);
  }
});

prismaOpsRouter.get('/reports/revenue', async (_req, res, next) => {
  try {
    const [rooms, reservations, folios, nightAudits] = await Promise.all([
      prisma.room.findMany(),
      prisma.reservation.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.folio.findMany({
        include: { items: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.nightAudit.findMany({ orderBy: { businessDate: 'desc' } })
    ]);

    const items = folios.flatMap(folio => folio.items.map(item => ({
      ...item,
      amount: money(item.amount),
      folioId: folio.id,
      guestName: folio.guestName
    })));

    const summary = items.reduce((acc, item) => {
      acc[item.code] = Number(((acc[item.code] || 0) + money(item.amount)).toFixed(2));
      return acc;
    }, {});

    res.json({
      metrics: computeMetrics({ rooms, reservations }),
      summary,
      items,
      nightAudits: nightAudits.map(nightAuditToApi),
      openBalances: reservations.filter(r => money(r.balance) > 0).map(reservationToApi)
    });
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.get('/reports/downtime', async (req, res, next) => {
  try {
    const date = String(req.query.date || new Date().toISOString().slice(0, 10));
    const reservations = await prisma.reservation.findMany({ orderBy: { createdAt: 'desc' } });

    res.json({
      date,
      arrivals: reservations.filter(r => r.checkIn === date && ['ARRIVAL', 'UNASSIGNED'].includes(r.status)).map(reservationToApi),
      departures: reservations.filter(r => r.checkOut === date && !['CANCELLED', 'NO_SHOW'].includes(r.status)).map(reservationToApi),
      inHouse: reservations.filter(r => r.status === 'IN_HOUSE').map(reservationToApi),
      highBalances: reservations.filter(r => money(r.balance) >= 100).map(reservationToApi),
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.get('/reports/in-house', async (_req, res, next) => {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { status: 'IN_HOUSE' },
      orderBy: { roomNumber: 'asc' }
    });
    res.json(reservations.map(reservationToApi));
  } catch (error) {
    next(error);
  }
});

prismaOpsRouter.get('/audit-logs', allowRoles('MANAGER', 'ADMIN'), async (_req, res, next) => {
  try {
    const logs = await prisma.auditLog.findMany({
      orderBy: { at: 'desc' },
      take: 500
    });

    res.json(logs.map(log => ({
      id: log.id,
      at: log.at,
      user: log.userEmail,
      role: log.role,
      action: log.action,
      entity: log.entity,
      details: log.details || {}
    })));
  } catch (error) {
    next(error);
  }
});
