import { Router } from 'express';
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
