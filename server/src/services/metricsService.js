export function computeMetrics(db) {
  const rooms = db.rooms.length;
  const occupied = db.reservations.filter(r => ['IN_HOUSE','ARRIVAL','BALANCE_REVIEW'].includes(r.status)).length;
  const roomRevenue = db.reservations.reduce((s, r) => s + Number(r.rate || 0), 0);
  const adr = occupied ? roomRevenue / occupied : 0;
  const occupancy = rooms ? (occupied / rooms) * 100 : 0;
  const revpar = rooms ? roomRevenue / rooms : 0;
  const openBalances = db.reservations.reduce((s, r) => s + Number(r.balance || 0), 0);
  return { rooms, occupied, arrivals: db.reservations.filter(r => r.status === 'ARRIVAL').length, inHouse: db.reservations.filter(r => r.status === 'IN_HOUSE').length, departures: db.reservations.filter(r => r.status === 'CHECKED_OUT').length, roomRevenue, adr, occupancy, revpar, openBalances };
}
export function accountBalance(account) { return account.items.reduce((s, i) => s + Number(i.amount || 0), 0); }
