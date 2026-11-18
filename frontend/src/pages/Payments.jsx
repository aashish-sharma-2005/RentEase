import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useLoad, Pending, Empty, ReasonModal, rupees, fmtDate, PayBadge, useToast } from '../components/common/ui.jsx';

export default function Payments() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const [tab, setTab] = useState('owing');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [voiding, setVoiding] = useState(null);
  const owing = useLoad(() => api.get('/rentals?owing=true'), []);
  const pays = useLoad(() => api.get(`/payments?q=${encodeURIComponent(q)}&from=${from}&to=${to}`), [q, from, to]);
  const owed = (owing.data || []).slice().sort((a, b) => b.bill.balance - a.bill.balance);
  const total = owed.reduce((s, r) => s + r.bill.balance, 0);
  const received = (pays.data || []).filter((p) => !p.voided).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="stack">
      <h1>Payments</h1>
      <div className="tabs">
        <button className={tab === 'owing' ? 'on' : ''} onClick={() => setTab('owing')}>Who owes money</button>
        <button className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Payment history</button>
      </div>

      {tab === 'owing' && (
        <>
          <Pending state={owing} />
          <div className="card stat"><span className="label">Total outstanding</span><span className="big num">{rupees(total)}</span></div>
          <div className="card scroll">
            {owed.length === 0 ? <Empty>No pending balances.</Empty> : (
              <table>
                <thead><tr><th>Customer</th><th>Rental</th><th className="right">Balance</th></tr></thead>
                <tbody>
                  {owed.map((r) => (
                    <tr key={r._id}>
                      <td>{r.customer?.name}<br /><span className="small muted">{r.customer?.village} {r.customer?.mobile}</span></td>
                      <td><Link to={`/rentals/${r._id}`}>{r.refNo}</Link><br /><PayBadge status={r.bill.paymentStatus} /></td>
                      <td className="right num">{rupees(r.bill.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {tab === 'history' && (
        <>
          <input type="search" placeholder="Search by customer or rental number" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search payments" />
          <div className="grid2">
            <label className="field">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
            <label className="field">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
          </div>
          <Pending state={pays} />
          <div className="card stat"><span className="label">Received (shown below)</span><span className="big num">{rupees(received)}</span></div>
          <div className="card scroll">
            {pays.data?.length === 0 ? <Empty>No payments found.</Empty> : (
              <table>
                <thead><tr><th>Date</th><th>Customer</th><th>Rental</th><th className="right">Amount</th><th /></tr></thead>
                <tbody>
                  {pays.data?.map((p) => (
                    <tr key={p._id} style={p.voided ? { opacity: 0.55 } : undefined}>
                      <td>{fmtDate(p.date)}<br /><span className="small muted">{p.method}</span></td>
                      <td>{p.customer?.name}</td>
                      <td><Link to={`/rentals/${p.rental?._id}`}>{p.rental?.refNo}</Link>{p.voided && <><br /><span className="badge bad">Voided</span></>}</td>
                      <td className="right num" style={p.voided ? { textDecoration: 'line-through' } : undefined}>{rupees(p.amount)}</td>
                      <td className="right">{isOwner && !p.voided && <button className="small danger" onClick={() => setVoiding(p)}>Void</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
      {voiding && (
        <ReasonModal title={`Void payment of ${rupees(voiding.amount)}?`} confirmText="Void payment" danger onClose={() => setVoiding(null)}
          onConfirm={async (reason) => { await api.post(`/payments/${voiding._id}/void`, { reason }); toast('Payment voided'); setVoiding(null); pays.reload(); owing.reload(); }} />
      )}
    </div>
  );
}
