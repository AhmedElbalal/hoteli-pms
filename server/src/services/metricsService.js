export function computeMetrics(db) {
  const rooms = db.rooms.length;
  const occupied = db.rooms.filter(r => r.status === 'Occupied').length;
  // Recognize room revenue only after a hotel business date has been audited and locked.
  // Booking values and advance payments are not earned room revenue.
  const roomRevenue = (db.nightAudits || [])
    .filter(a => a.status === 'LOCKED')
    .reduce((sum, a) => sum + Number(a.roomRevenue || 0), 0);
  const adr = occupied ? roomRevenue / occupied : 0;
  const occupancy = rooms ? (occupied / rooms) * 100 : 0;
  const revpar = rooms ? roomRevenue / rooms : 0;
  const openBalances = db.reservations.reduce((s, r) => s + Number(r.balance || 0), 0);
  return { rooms, occupied, arrivals: db.reservations.filter(r => r.status === 'ARRIVAL').length, inHouse: db.reservations.filter(r => r.status === 'IN_HOUSE').length, departures: db.reservations.filter(r => r.status === 'CHECKED_OUT').length, roomRevenue, adr, occupancy, revpar, openBalances };
}
export function accountBalance(account) { return account.items.reduce((s, i) => s + Number(i.amount || 0), 0); }
