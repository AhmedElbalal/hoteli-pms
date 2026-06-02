import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid
} from 'recharts';
import {
  Home, CalendarDays, BedDouble, ReceiptText, WalletCards, MoonStar,
  BarChart3, LifeBuoy, ScrollText, LogOut, RefreshCcw, Search
} from 'lucide-react';
import './styles/global.css';
import { api, auth, setSession, getUser, clearSession } from './lib/api';
import { dict } from './lib/i18n';

const money = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(Number(n || 0));
const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@hoteli.com');
  const [password, setPassword] = useState('demo123');
  const [err, setErr] = useState('');
  async function submit(e) {
    e.preventDefault();
    try { const data = await auth.login(email, password); setSession(data); onLogin(data.user); }
    catch (x) { setErr(x.message); }
  }
  return <div className="login"><form className="card" onSubmit={submit}>
    <h1>HOTELI</h1><p className="muted">Cloud Hotel PMS MVP</p>
    {err && <p className="pill red">{err}</p>}
    <label>Email</label><input className="input" value={email} onChange={e => setEmail(e.target.value)} />
    <label>Password</label><input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} />
    <button className="btn" style={{ width: '100%', marginTop: 10 }}>Login</button>
    <p className="muted">Demo: admin@hoteli.com / demo123</p>
  </form></div>;
}

function App() {
  const [user, setUser] = useState(getUser());
  const [lang, setLang] = useState(localStorage.getItem('hoteli_lang') || 'en');
  const [page, setPage] = useState('dashboard');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const t = dict[lang];
  useEffect(() => localStorage.setItem('hoteli_lang', lang), [lang]);
  async function load() {
    setRefreshing(true); setErr('');
    try { setData(await api('/dashboard')); }
    catch (e) { setErr(e.message); }
    finally { setRefreshing(false); }
  }
  useEffect(() => { if (user) load(); }, [user]);
  if (!user) return <Login onLogin={setUser} />;
  const nav = [
    ['dashboard', Home, t.dashboard], ['reservations', CalendarDays, t.reservations], ['rooms', BedDouble, t.rooms],
    ['folios', ReceiptText, t.folios], ['house', WalletCards, t.house], ['audit', MoonStar, t.audit],
    ['reports', BarChart3, t.reports], ['support', LifeBuoy, t.support], ['logs', ScrollText, t.logs]
  ];
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="logo">H</div><div><b>HOTELI</b><small>Cloud PMS</small></div></div>
      <div className="nav">{nav.map(([k, I, l]) => <button key={k} className={page === k ? 'active' : ''} onClick={() => setPage(k)}><I size={18} />{l}</button>)}</div>
      <button className="btn light" onClick={() => { clearSession(); setUser(null); }} style={{ marginTop: 'auto' }}><LogOut size={16} /> {t.logout}</button>
    </aside>
    <main className="main">
      <header className="top"><div><h1>HOTELI</h1><p className="muted">{user.name} · {user.role}</p></div>
        <div className="controls">
          <select className="select" value={lang} onChange={e => setLang(e.target.value)}><option value="en">English</option><option value="fr">Français</option><option value="es">Español</option></select>
          <button className="btn secondary" onClick={load} disabled={refreshing}><RefreshCcw size={16} /> {refreshing ? t.refreshing : t.refresh}</button>
        </div>
      </header>
      <div className="mobile-nav">{nav.map(([k,,l]) => <button key={k} className={page === k ? 'active' : ''} onClick={() => setPage(k)}>{l}</button>)}</div>
      {err && <div className="card"><span className="pill red">{err}</span></div>}
      {!data ? <div className="card">Loading...</div> : <Page page={page} t={t} data={data} reload={load} lang={lang} />}
    </main>
  </div>;
}

function Page(p) {
  return p.page === 'dashboard' ? <Dashboard {...p} /> :
    p.page === 'reservations' ? <Reservations {...p} /> :
    p.page === 'rooms' ? <Rooms {...p} /> :
    p.page === 'folios' ? <Folios {...p} /> :
    p.page === 'house' ? <House {...p} /> :
    p.page === 'audit' ? <NightAudit {...p} /> :
    p.page === 'reports' ? <Reports {...p} /> :
    p.page === 'support' ? <Support {...p} /> : <Logs {...p} />;
}

function Dashboard({ t, data }) {
  const m = data.metrics;
  const pie = [
    { name: t.occupied, value: data.rooms.filter(r => r.status === 'Occupied').length },
    { name: t.vacantReady, value: data.rooms.filter(r => r.status === 'Vacant Ready').length },
    { name: t.dirty, value: data.rooms.filter(r => r.status === 'Vacant Dirty').length },
    { name: t.maintenance, value: data.rooms.filter(r => r.status === 'Maintenance').length }
  ];
  return <>
    <div className="grid"><Metric title={t.revenue} val={money(m.roomRevenue)} /><Metric title={t.adr} val={money(m.adr)} /><Metric title={t.occupancy} val={`${m.occupancy.toFixed(1)}%`} /><Metric title={t.revpar} val={money(m.revpar)} /></div>
    <div className="grid2" style={{ marginTop: 16 }}><div className="card"><h2>{t.revenueOverview}</h2><ResponsiveContainer height={280}><BarChart data={[{ d: t.rooms, v: m.roomRevenue }, { d: t.balance, v: m.openBalances }, { d: t.adr, v: m.adr }, { d: t.revpar, v: m.revpar }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="d" /><YAxis /><Tooltip formatter={money} /><Bar dataKey="v" radius={[8,8,0,0]} /></BarChart></ResponsiveContainer></div><div className="card"><h2>{t.roomStatus}</h2><ResponsiveContainer height={280}><PieChart><Pie data={pie} dataKey="value" nameKey="name" label outerRadius={95}>{pie.map(x => <Cell key={x.name} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div></div>
    <div className="card" style={{ marginTop: 16 }}><h2>{t.liveReservations}</h2><ReservationTable rows={data.reservations} t={t} /></div>
  </>;
}
function Metric({ title, val }) { return <div className="card metric"><small>{title}</small><h2>{val}</h2><p className="muted">Updated from the HOTELI API</p></div>; }
function ReservationTable({ rows, t }) { return <table className="table"><thead><tr><th>ID</th><th>{t.guest}</th><th>{t.room}</th><th>{t.status}</th><th>{t.rate}</th><th>{t.balance}</th><th>{t.actions}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td><b>{r.id}</b></td><td>{r.guestName}<br/><small className="muted">{r.source}</small></td><td>{r.roomNumber || <span className="pill amber">{t.unassigned}</span>}</td><td><span className="pill">{r.status}</span></td><td>{money(r.rate)}</td><td>{money(r.balance)}</td><td><small>{r.checkIn} → {r.checkOut}</small></td></tr>)}</tbody></table>; }

function Reservations({ t, reload, data }) {
  const [f, setF] = useState({ guestName: '', email: '', roomNumber: '', source: 'Direct', checkIn: today, checkOut: tomorrow, adults: 1, rate: 159, parking: false, notes: '' });
  const [availability, setAvailability] = useState([]);
  const [msg, setMsg] = useState('');
  async function loadAvailability() {
    const av = await api(`/availability?checkIn=${f.checkIn}&checkOut=${f.checkOut}`);
    setAvailability(av.rooms);
  }
  useEffect(() => { loadAvailability().catch(() => {}); }, [f.checkIn, f.checkOut]);
  const canSave = f.guestName.trim().length >= 2 && f.checkIn && f.checkOut && Number(f.rate) > 0;
  async function save() {
    setMsg('');
    if (!canSave) { setMsg(t.guestRequired || 'Guest name, dates, and rate are required.'); return; }
    try {
      await api('/reservations', { method: 'POST', body: JSON.stringify({ ...f, guestName: f.guestName.trim(), adults: Number(f.adults), rate: Number(f.rate), parking: Boolean(f.parking) }) });
      setF({ guestName: '', email: '', roomNumber: '', source: 'Direct', checkIn: today, checkOut: tomorrow, adults: 1, rate: 159, parking: false, notes: '' });
      setMsg(t.saved); await reload(); await loadAvailability();
    }
    catch (e) { setMsg(e.message); }
  }
  async function status(id, s) { await api(`/reservations/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: s }) }); await reload(); }
  function chooseRoom(room) { setF({ ...f, roomNumber: room.number, rate: room.suggestedRate }); }
  return <div className="stack">
    <div className="card"><h2>{t.newReservation}</h2>{msg && <p className="pill amber">{msg}</p>}
      <div className="form">
        <div><input className="input" placeholder={t.guest} value={f.guestName} onChange={e => setF({ ...f, guestName: e.target.value })} />{f.guestName.trim().length > 0 && f.guestName.trim().length < 2 && <small className="error-text">{t.guestRequired || 'Guest name must be at least 2 characters.'}</small>}</div>
        <input className="input" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input className="input" placeholder={t.source} value={f.source} onChange={e => setF({ ...f, source: e.target.value })} />
        <input className="input" type="date" value={f.checkIn} onChange={e => setF({ ...f, checkIn: e.target.value })} />
        <input className="input" type="date" value={f.checkOut} onChange={e => setF({ ...f, checkOut: e.target.value })} />
        <input className="input" type="number" min="1" placeholder={t.adults} value={f.adults} onChange={e => setF({ ...f, adults: e.target.value })} />
        <select className="input" value={f.roomNumber} onChange={e => { const room = availability.find(x => x.number === e.target.value); setF({ ...f, roomNumber: e.target.value, rate: room?.suggestedRate || f.rate }); }}><option value="">{t.selectRoom}</option>{availability.filter(r => r.available).map(r => <option key={r.number} value={r.number}>{r.number} · {r.type} · {money(r.suggestedRate)}</option>)}</select>
        <input className="input" type="number" step="0.01" placeholder={t.rate} value={f.rate} onChange={e => setF({ ...f, rate: e.target.value })} />
        <label className="check"><input type="checkbox" checked={f.parking} onChange={e => setF({ ...f, parking: e.target.checked })} /> {t.parking}</label>
        <input className="input wide" placeholder={t.notes} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} />
      </div><button className="btn" disabled={!canSave} onClick={save}>{t.save}</button>
    </div>
    <div className="card"><h2>{t.availabilityRates}</h2><table className="table"><thead><tr><th>{t.room}</th><th>{t.status}</th><th>{t.rate}</th><th>{t.totalWithTaxes}</th><th>{t.actions}</th></tr></thead><tbody>{availability.map(r => <tr key={r.number}><td><b>{r.number}</b> · {r.type}</td><td><span className={r.available ? 'pill green' : 'pill red'}>{r.available ? t.available : t.notAvailable}</span></td><td>{money(r.suggestedRate)}</td><td>{money(r.taxesPreview?.total)}</td><td>{r.available && <button className="btn light" onClick={() => chooseRoom(r)}>{t.select}</button>}</td></tr>)}</tbody></table></div>
    <div className="card"><h2>{t.reservations}</h2><ReservationTable rows={data.reservations} t={t} /><div className="button-row">{data.reservations.map(r => <span key={r.id}><button className="btn light" onClick={() => status(r.id, 'IN_HOUSE')}>{t.checkIn} {r.roomNumber || r.id}</button><button className="btn light" onClick={() => status(r.id, 'CHECKED_OUT')}>{t.checkOut}</button></span>)}</div></div>
  </div>;
}

function Rooms({ t, data, reload }) {
  const [selected, setSelected] = useState('');
  const [reservationId, setReservationId] = useState('');
  const unassigned = data.reservations.filter(r => r.status === 'UNASSIGNED' || !r.roomNumber);
  const assigned = data.reservations.filter(r => r.roomNumber);
  async function assign() { if (!selected || !reservationId) return; await api(`/reservations/${reservationId}/assign-room`, { method: 'PATCH', body: JSON.stringify({ roomNumber: selected }) }); await reload(); }
  async function unassign(id) { await api(`/reservations/${id}/unassign-room`, { method: 'PATCH', body: JSON.stringify({}) }); await reload(); }
  return <div className="stack"><div className="card"><h2>{t.roomAssignment}</h2><div className="form"><select className="input" value={reservationId} onChange={e => setReservationId(e.target.value)}><option value="">{t.selectReservation}</option>{unassigned.map(r => <option key={r.id} value={r.id}>{r.id} · {r.guestName}</option>)}</select><select className="input" value={selected} onChange={e => setSelected(e.target.value)}><option value="">{t.selectRoom}</option>{data.rooms.filter(r => r.status !== 'Maintenance').map(r => <option key={r.number} value={r.number}>{r.number} · {r.type}</option>)}</select><button className="btn" onClick={assign}>{t.assignRoom}</button></div><h3>{t.assignedRooms}</h3>{assigned.map(r => <button key={r.id} className="btn light" onClick={() => unassign(r.id)}>{t.unassign} {r.roomNumber} · {r.guestName}</button>)}</div><div className="grid">{data.rooms.map(r => <div className="card" key={r.id}><h2>{t.room} {r.number}</h2><span className="pill">{r.status}</span><p>{r.type} · {money(r.rateBase)}</p><p className="muted">HK: {r.housekeeping}</p></div>)}</div></div>;
}

function Folios({ t }) {
  const [rows, setRows] = useState([]); const [selected, setSelected] = useState(null); const [payment, setPayment] = useState(0);
  async function load() { const r = await api('/folios'); setRows(r); if (!selected && r[0]) setSelected(await api(`/folios/${r[0].id}`)); }
  useEffect(() => { load(); }, []);
  async function open(id) { setSelected(await api(`/folios/${id}`)); }
  async function pay() { if (!selected || !payment) return; const f = await api(`/folios/${selected.id}/payment`, { method: 'POST', body: JSON.stringify({ amount: Number(payment), description: 'Guest payment', code: 'PAYMENT' }) }); setSelected(f); setPayment(0); load(); }
  const totals = selected ? {
    room: selected.items.filter(i => i.code === 'ROOM').reduce((s,i)=>s+Number(i.amount||0),0),
    lodging: selected.items.filter(i => i.code === 'LODGING_TAX').reduce((s,i)=>s+Number(i.amount||0),0),
    tps: selected.items.filter(i => i.code.includes('TPS')).reduce((s,i)=>s+Number(i.amount||0),0),
    tvq: selected.items.filter(i => i.code.includes('TVQ')).reduce((s,i)=>s+Number(i.amount||0),0),
    parking: selected.items.filter(i => i.code === 'PARKING').reduce((s,i)=>s+Number(i.amount||0),0),
    payments: selected.items.filter(i => i.type === 'PAYMENT').reduce((s,i)=>s+Number(i.amount||0),0)
  } : null;
  return <div className="grid2"><div className="card"><h2>{t.folios}</h2><table className="table"><tbody>{rows.map(f => <tr key={f.id} onClick={() => open(f.id)} className="clickable"><td><b>{f.id}</b><br/>{f.guestName}</td><td>{money(f.balance)}</td></tr>)}</tbody></table></div>{selected && <div className="card"><h2>{t.folioContent}: {selected.id}</h2><p><b>{selected.guestName}</b> · <span className="pill">{selected.status}</span></p><div className="grid"><Metric title="Room" val={money(totals.room)} /><Metric title="TPS" val={money(totals.tps)} /><Metric title="TVQ" val={money(totals.tvq)} /><Metric title="Taxe d’hébergement" val={money(totals.lodging)} /></div><div className="grid" style={{marginTop:12}}><Metric title="Parking" val={money(totals.parking)} /><Metric title="Payments" val={money(totals.payments)} /><Metric title={t.balance} val={money(selected.balance)} /></div><table className="table"><thead><tr><th>{t.date}</th><th>{t.code}</th><th>{t.description}</th><th>{t.amount}</th></tr></thead><tbody>{selected.items.map(i => <tr key={i.id}><td>{i.date}</td><td>{i.code}</td><td>{i.description}</td><td>{money(i.amount)}</td></tr>)}</tbody></table><div className="form"><input className="input" type="number" step="0.01" value={payment} onChange={e => setPayment(e.target.value)} placeholder={t.payment} /><button className="btn" onClick={pay}>{t.postPayment}</button></div></div>}</div>;
}

function House({ t }) { const [rows, setRows] = useState([]); useEffect(() => { api('/house-accounts').then(setRows); }, []); return <div className="card"><h2>{t.house}</h2><table className="table"><thead><tr><th>ID</th><th>Name</th><th>Owner</th><th>{t.balance}</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td><b>{a.id}</b></td><td>{a.name}</td><td>{a.owner}</td><td>{money(a.balance)}</td></tr>)}</tbody></table></div>; }

function NightAudit({ t, reload }) {
  const [date, setDate] = useState(today), [paymentMismatch, setMismatch] = useState(0), [notes, setNotes] = useState('Revenue reports saved online before processing.');
  const [rows, setRows] = useState([]), [msg, setMsg] = useState('');
  async function load() { setRows(await api('/night-audit')); }
  useEffect(() => { load(); }, []);
  async function run() { try { await api('/night-audit/run', { method: 'POST', body: JSON.stringify({ date, paymentMismatch: Number(paymentMismatch), notes }) }); setMsg(t.auditLocked); await load(); await reload(); } catch (e) { setMsg(e.message); } }
  return <div className="card"><h2>{t.audit}</h2>{msg && <p className="pill amber">{msg}</p>}<div className="form"><input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} /><input className="input" type="number" value={paymentMismatch} onChange={e => setMismatch(e.target.value)} placeholder="Payment mismatch" /><input className="input" value={notes} onChange={e => setNotes(e.target.value)} /></div><button className="btn" onClick={run}>{t.runAudit}</button><table className="table"><thead><tr><th>{t.date}</th><th>{t.status}</th><th>{t.noShows}</th><th>{t.revenue}</th><th>{t.taxes}</th><th>{t.paymentBatch}</th></tr></thead><tbody>{rows.map(a => <tr key={a.id}><td><b>{a.date}</b></td><td><span className="pill green">{a.status}</span></td><td>{a.noShows}</td><td>{money(a.roomRevenue)}</td><td>{money(a.taxes)}</td><td>{a.paymentBatchStatus}</td></tr>)}</tbody></table></div>;
}

function Reports({ t, data }) {
  const [revenue, setRevenue] = useState(null); const [downtime, setDowntime] = useState(null);
  useEffect(() => { api('/reports/revenue').then(setRevenue); api(`/reports/downtime?date=${today}`).then(setDowntime); }, []);
  const m = data.metrics;
  return <div className="stack"><div className="card"><h2>{t.revenueReport}</h2><ResponsiveContainer height={280}><LineChart data={[{ x: t.revenue, v: m.roomRevenue }, { x: t.adr, v: m.adr }, { x: t.revpar, v: m.revpar }, { x: t.balance, v: m.openBalances }]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="x" /><YAxis /><Tooltip formatter={money} /><Line dataKey="v" strokeWidth={3} /></LineChart></ResponsiveContainer>{revenue && <table className="table"><thead><tr><th>{t.code}</th><th>{t.amount}</th></tr></thead><tbody>{Object.entries(revenue.summary).map(([k,v]) => <tr key={k}><td>{k}</td><td>{money(v)}</td></tr>)}</tbody></table>}</div><ReportList title={t.inHouseGuests} rows={downtime?.inHouse || []} t={t} /><ReportList title={`${t.downtimeReport} - ${t.arrivals}`} rows={downtime?.arrivals || []} t={t} /><ReportList title={`${t.downtimeReport} - ${t.departures}`} rows={downtime?.departures || []} t={t} /><ReportList title={`${t.downtimeReport} - ${t.highBalances}`} rows={downtime?.highBalances || []} t={t} /></div>;
}
function ReportList({ title, rows, t }) { return <div className="card"><h2>{title}</h2><table className="table"><thead><tr><th>{t.guest}</th><th>{t.room}</th><th>{t.status}</th><th>{t.balance}</th></tr></thead><tbody>{rows.map((r,i) => <tr key={`${r.id}-${i}`}><td>{r.guestName}</td><td>{r.roomNumber || '-'}</td><td>{r.status}</td><td>{money(r.balance)}</td></tr>)}</tbody></table></div>; }

function Support() { const [title, setTitle] = useState(''), [rows, setRows] = useState([]); async function load() { setRows(await api('/support-tickets')); } useEffect(() => { load(); }, []); async function save() { await api('/support-tickets', { method: 'POST', body: JSON.stringify({ title, priority: 'MEDIUM' }) }); setTitle(''); load(); } return <div className="card"><h2>Tech Support</h2><input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Ticket title" /><button className="btn" onClick={save}>Open Ticket</button><table className="table"><tbody>{rows.map(x => <tr key={x.id}><td><b>{x.id}</b></td><td>{x.title}</td><td><span className="pill amber">{x.status}</span></td></tr>)}</tbody></table></div>; }
function Logs() { const [rows, setRows] = useState([]); useEffect(() => { api('/audit-logs').then(setRows).catch(e => setRows([{ id: 'error', action: e.message, entity: 'Permission', at: '' }])); }, []); return <div className="card"><h2>Audit Logs</h2><table className="table"><tbody>{rows.map(l => <tr key={l.id}><td>{l.at}</td><td><b>{l.action}</b></td><td>{l.entity}</td><td>{l.user}</td></tr>)}</tbody></table></div>; }
createRoot(document.getElementById('root')).render(<App />);
