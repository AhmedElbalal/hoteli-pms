export function computeMetrics(db) {
  const rooms = db.rooms.length;
  const occupied = db.rooms.filter(r => r.status === 'Occupied').length;
  // Recognize room revenue only after a hotel business date has been audited and locked.
  // Booking values and advance payments are not earned room revenue.
  const roomRevenue = (db.nightAudits || [])
    .filter(a => a.status === 'LOCKED')
    .reduce((sum, a) => sum + Number(a.roomRevenue || 0), 0);
  // Daily KPIs use the latest locked business date, never cumulative revenue.\n  const latestAudit = [...(db.nightAudits || [])].filter(a => a.status === 'LOCKED').sort((a, b) => b.date.localeCompare(a.date))[0];\n  const dailyRoomRevenue = Number(latestAudit?.roomRevenue || 0);\n  const roomNightsSold = Number(latestAudit?.roomNightsSold || 0);\n  const roomsAvailable = Number(latestAudit?.roomsAvailable ?? rooms);\n  const adr = roomNightsSold > 0 ? dailyRoomRevenue / roomNightsSold : 0;
  const occupancy = rooms ? (occupied / rooms) * 100 : 0;
  const revpar = roomsAvailable > 0 ? dailyRoomRevenue / roomsAvailable : 0;
  const openBalances = db.reservations.reduce((s, r) => s + Number(r.balance || 0), 0);
  return { rooms, occupied, arrivals: db.reservations.filter(r => r.status === 'ARRIVAL').length, inHouse: db.reservations.filter(r => r.status === 'IN_HOUSE').length, departures: db.reservations.filter(r => r.status === 'CHECKED_OUT').length, roomRevenue, adr, occupancy, revpar, openBalances };
}
export function accountBalance(account) { return account.items.reduce((s, i) => s + Number(i.amount || 0), 0); }
