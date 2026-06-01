import bcrypt from 'bcryptjs';
const hash = bcrypt.hashSync('demo123', 10);
export const seedData = {
  property: { id: 'P-001', name: 'HOTELI Demo Hotel', rooms: 24, currency: 'CAD', roomTaxRate: 0.05 },
  users: [
    { id: 'U-1', name: 'Admin User', email: 'admin@hoteli.com', passwordHash: hash, role: 'ADMIN' },
    { id: 'U-2', name: 'Front Desk Agent', email: 'frontdesk@hoteli.com', passwordHash: hash, role: 'FRONT_DESK' },
    { id: 'U-3', name: 'Night Auditor', email: 'auditor@hoteli.com', passwordHash: hash, role: 'NIGHT_AUDITOR' },
    { id: 'U-4', name: 'General Manager', email: 'manager@hoteli.com', passwordHash: hash, role: 'MANAGER' }
  ],
  rooms: Array.from({ length: 24 }, (_, i) => {
    const n = 201 + i;
    return { id: `RM-${n}`, number: String(n), type: i % 5 === 0 ? 'Suite' : i % 3 === 0 ? 'King' : 'Queen', status: i % 7 === 0 ? 'Maintenance' : i % 6 === 0 ? 'Vacant Dirty' : i % 4 === 0 ? 'Green Stay' : 'Vacant Ready', housekeeping: i % 6 === 0 ? 'Dirty' : 'Clean', rateBase: i % 5 === 0 ? 229 : i % 3 === 0 ? 189 : 159, notes: '' };
  }),
  reservations: [
    { id: 'R-3471241782', guestName: 'Aranshi Kumar', email: 'aranshi@example.com', roomNumber: '205', status: 'IN_HOUSE', source: 'Prepaid', checkIn: '2026-05-29', checkOut: '2026-05-31', adults: 1, rate: 189, balance: 0, notes: 'Prepaid reservation date follow-up.' },
    { id: 'R-423313925', guestName: 'Jennifer Tessier Blust', email: 'jennifer@example.com', roomNumber: '207', status: 'ARRIVAL', source: 'Corporate Coca-Cola', checkIn: '2026-05-30', checkOut: '2026-05-31', adults: 1, rate: 165, balance: 165, notes: 'Corporate weekday rate review.' },
    { id: 'R-3465975079', guestName: 'Tianxi Pu', email: 'tianxi@example.com', roomNumber: '209', status: 'BALANCE_REVIEW', source: 'CTrip VCC', checkIn: '2026-05-30', checkOut: '2026-05-31', adults: 2, rate: 211.33, balance: 21.33, notes: 'VCC one-time transaction difference.' },
    { id: 'R-3443094066', guestName: 'Gurpreet Singh', email: 'gurpreet@example.com', roomNumber: '210', status: 'CHECKED_OUT', source: 'OTA', checkIn: '2026-05-29', checkOut: '2026-05-30', adults: 1, rate: 149, balance: 0, notes: 'Early checkout note.' }
  ],
  folios: [
    { id: 'F-R-3471241782', reservationId: 'R-3471241782', guestName: 'Aranshi Kumar', status: 'OPEN', items: [{ id: 'FI-1', type: 'CHARGE', code: 'ROOM', description: 'Room charge', amount: 189, date: '2026-05-29' }, { id: 'FI-2', type: 'PAYMENT', code: 'PREPAID', description: 'Prepaid OTA payment', amount: -189, date: '2026-05-29' }] },
    { id: 'F-R-3465975079', reservationId: 'R-3465975079', guestName: 'Tianxi Pu', status: 'OPEN', items: [{ id: 'FI-3', type: 'CHARGE', code: 'ROOM', description: 'Room charge', amount: 211.33, date: '2026-05-30' }, { id: 'FI-4', type: 'PAYMENT', code: 'VCC', description: 'Virtual card partial payment', amount: -190, date: '2026-05-30' }] }
  ],
  houseAccounts: [
    { id: 'HA-1001', name: 'Prepaid OTA Clearing', status: 'OPEN', owner: 'Accounting', items: [{ id: 'HAI-1', type: 'CHARGE', description: 'VCC short payment', amount: 21.33, date: '2026-05-30' }] },
    { id: 'HA-1002', name: 'Adjustment Log', status: 'OPEN', owner: 'Night Audit', items: [] },
    { id: 'HA-1003', name: 'Banquet Revenue', status: 'OPEN', owner: 'Sales', items: [{ id: 'HAI-2', type: 'CHARGE', description: 'Banquet revenue', amount: 2600, date: '2026-05-30' }, { id: 'HAI-3', type: 'PAYMENT', description: 'Banquet payment', amount: -2600, date: '2026-05-30' }] }
  ],
  nightAudits: [{ id: 'NA-2026-05-29', date: '2026-05-29', status: 'LOCKED', noShows: 1, paymentBatchStatus: 'Balanced', roomTaxPosted: true, lockedAt: '2026-05-30T07:00:00.000Z', notes: ['Audit completed.'] }],
  supportTickets: [
    { id: 'CS-6240319', title: 'Payment batch mismatch', priority: 'HIGH', status: 'OPEN', owner: 'HOTELI Support', createdAt: '2026-05-30T05:00:00.000Z' },
    { id: 'CS-6220559', title: 'Reassigned mismatch follow-up', priority: 'MEDIUM', status: 'IN_PROGRESS', owner: 'HOTELI Support', createdAt: '2026-05-29T05:00:00.000Z' }
  ],
  auditLogs: []
};
