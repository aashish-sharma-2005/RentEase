import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLoad, Pending, Empty, rupees, fmtDate, StatusBadge, PayBadge } from '../components/common/ui.jsx';

const TABS = [['active', 'With customers'], ['', 'All'], ['completed', 'Returned'], ['cancelled', 'Cancelled']];

export default function Rentals() {
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const nav = useNavigate();
  const s = useLoad(() => api.get(`/rentals?status=${status}&q=${encodeURIComponent(q)}`), [status, q]);
  return (
    <div className="stack">
      <div className="page-head"><h1>Rentals</h1><Link to="/rentals/new" className="btn primary">New rental</Link></div>
      <div className="tabs" role="tablist">
        {TABS.map(([v, t]) => <button key={t} role="tab" aria-selected={status === v} className={status === v ? 'on' : ''} onClick={() => setStatus(v)}>{t}</button>)}
      </div>
      <input type="search" placeholder="Search by rental number, customer or village" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search rentals" />
      <Pending state={s} />
      {s.data && (
        <div className="card scroll">
          {s.data.length === 0 ? <Empty>No rentals found.</Empty> : (
            <table>
              <thead><tr><th>Rental</th><th>Customer</th><th>Items</th><th>Status</th><th className="right">Balance</th></tr></thead>
              <tbody>
                {s.data.map((r) => (
                  <tr key={r._id} className="click" onClick={() => nav(`/rentals/${r._id}`)}>
                    <td><Link to={`/rentals/${r._id}`}>{r.refNo}</Link><br /><span className="small muted">{fmtDate(r.issueDate)}</span></td>
                    <td>{r.customer?.name}<br /><span className="small muted">{r.customer?.village}</span></td>
                    <td className="small num">{r.issued.rajai - r.returned.rajai}/{r.issued.rajai} Rajai<br />{r.issued.gadda - r.returned.gadda}/{r.issued.gadda} Gadda <span className="muted">(out/issued)</span></td>
                    <td><StatusBadge status={r.status} overdue={r.overdue} />{r.status !== 'cancelled' && <><br /><PayBadge status={r.bill.paymentStatus} /></>}</td>
                    <td className="right num">{r.status === 'cancelled' ? '–' : rupees(r.bill.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
