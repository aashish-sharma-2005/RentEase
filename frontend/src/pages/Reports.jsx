import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLoad, Pending, Empty, rupees, fmtDate, todayStr, label } from '../components/common/ui.jsx';

const periodLabel = (p) => (p.length === 10 ? fmtDate(p) : p.length === 7 ? new Date(p + '-01T00:00:00').toLocaleString('en-IN', { month: 'long', year: 'numeric' }) : p);

export default function Reports() {
  const t = todayStr();
  const [from, setFrom] = useState(t.slice(0, 7) + '-01');
  const [to, setTo] = useState(t);
  const [group, setGroup] = useState('day');
  const s = useLoad(() => api.get(`/reports?from=${from}&to=${to}&group=${group}`), [from, to, group]);
  const d = s.data;
  const preset = (g) => {
    setGroup(g);
    if (g === 'month') { setFrom(t.slice(0, 4) + '-01-01'); setTo(t); }
    if (g === 'day') { setFrom(t.slice(0, 7) + '-01'); setTo(t); }
    if (g === 'year') { setFrom(String(+t.slice(0, 4) - 2) + '-01-01'); setTo(t); }
  };
  return (
    <div className="stack">
      <div className="page-head"><h1>Reports</h1><button className="no-print" onClick={() => window.print()}>Print</button></div>
      <div className="card no-print form">
        <div className="tabs">
          {[['day', 'Daily'], ['month', 'Monthly'], ['year', 'Yearly']].map(([g, tx]) => <button key={g} className={group === g ? 'on' : ''} onClick={() => preset(g)}>{tx}</button>)}
        </div>
        <div className="grid2">
          <label className="field">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
          <label className="field">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        </div>
      </div>
      <Pending state={s} />
      {d && (
        <>
          <div className="grid2">
            <div className="card stat"><span className="label">Rent earned (items returned {fmtDate(d.from)} to {fmtDate(d.to)})</span><span className="big num">{rupees(d.totals.chargesEarned)}</span></div>
            <div className="card stat"><span className="label">Cash actually received in this period</span><span className="big num">{rupees(d.totals.paymentsReceived)}</span></div>
          </div>
          <p className="muted small" style={{ margin: 0 }}>These are different numbers: rent earned is what customers owe for returned items; cash received is money actually collected.</p>

          <div className="card scroll">
            <h2>By {group === 'day' ? 'day' : group === 'month' ? 'month' : 'year'}</h2>
            {d.rows.length === 0 ? <Empty>No activity in this period.</Empty> : (
              <table>
                <thead><tr><th>Period</th><th className="right">Rentals issued</th><th className="right">Rent earned</th><th className="right">Cash received</th></tr></thead>
                <tbody>
                  {d.rows.map((r) => <tr key={r.period}><td>{periodLabel(r.period)}</td><td className="right num">{r.rentals}</td><td className="right num">{rupees(r.chargesEarned)}</td><td className="right num">{rupees(r.paymentsReceived)}</td></tr>)}
                </tbody>
                <tfoot><tr><td><strong>Total</strong></td><td className="right num"><strong>{d.totals.rentals}</strong></td><td className="right num"><strong>{rupees(d.totals.chargesEarned)}</strong></td><td className="right num"><strong>{rupees(d.totals.paymentsReceived)}</strong></td></tr></tfoot>
              </table>
            )}
          </div>

          <div className="grid2">
            <div className="card stat"><span className="label">Rentals right now</span><span className="small num">{d.rentalCounts.active} with customers · {d.rentalCounts.overdue} overdue · {d.rentalCounts.completed} completed</span></div>
            <div className="card stat"><span className="label">Items issued in this period</span><span className="small num">{d.itemsIssued.rajai} Rajai · {d.itemsIssued.gadda} Gadda</span></div>
          </div>

          <div className="card scroll">
            <div className="row between"><h2>Customers who owe money</h2><strong className="num">{rupees(d.outstanding)}</strong></div>
            {d.owing.length === 0 ? <Empty>No pending balances.</Empty> : (
              <table><tbody>
                {d.owing.map((o) => (
                  <tr key={o.rentalId}><td>{o.customer?.name}<br /><span className="small muted">{o.customer?.village} {o.customer?.mobile}</span></td><td><Link to={`/rentals/${o.rentalId}`}>{o.refNo}</Link></td><td className="right num">{rupees(o.balance)}</td></tr>
                ))}
              </tbody></table>
            )}
          </div>

          <div className="card scroll">
            <h2>Most frequent customers</h2>
            {d.topCustomers.length === 0 ? <Empty>No rentals in this period.</Empty> : (
              <table><thead><tr><th>Customer</th><th className="right">Rentals</th><th className="right">Items</th></tr></thead><tbody>
                {d.topCustomers.map((c, i) => <tr key={i}><td>{c.customer?.name}<br /><span className="small muted">{c.customer?.village}</span></td><td className="right num">{c.rentals}</td><td className="right num">{c.items}</td></tr>)}
              </tbody></table>
            )}
          </div>

          <div className="card scroll">
            <h2>Stock condition</h2>
            <table><thead><tr><th>Item</th><th className="right">Total</th><th className="right">Rented</th><th className="right">Damaged</th><th className="right">Missing</th><th className="right">Available</th></tr></thead><tbody>
              {d.stock.map((i) => <tr key={i.itemType}><td>{label[i.itemType]}</td><td className="right num">{i.total}</td><td className="right num">{i.rented}</td><td className="right num">{i.damaged}</td><td className="right num">{i.missing}</td><td className="right num"><strong>{i.available}</strong></td></tr>)}
            </tbody></table>
          </div>
        </>
      )}
    </div>
  );
}
