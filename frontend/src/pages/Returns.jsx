import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLoad, Pending, Empty, rupees, fmtDate, StatusBadge } from '../components/common/ui.jsx';

export default function Returns() {
  const s = useLoad(() => api.get('/rentals?status=active'), []);
  const rows = (s.data || []).slice().sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.issueDate < b.issueDate ? -1 : 1));
  return (
    <div className="stack">
      <h1>Pending returns</h1>
      <p className="muted" style={{ margin: 0 }}>Items still with customers. Open a rental to record what came back.</p>
      <Pending state={s} />
      {s.data && (
        <div className="card scroll">
          {rows.length === 0 ? <Empty>Everything has been returned.</Empty> : (
            <table>
              <thead><tr><th>Customer</th><th>Still out</th><th>Rent so far</th><th /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r._id}>
                    <td>{r.customer?.name}<br /><span className="small muted">{r.customer?.village} · {r.refNo} · since {fmtDate(r.issueDate)}</span><br /><StatusBadge status={r.status} overdue={r.overdue} /></td>
                    <td className="num">{r.bill.remaining.rajai} Rajai<br />{r.bill.remaining.gadda} Gadda</td>
                    <td className="num">{rupees(r.bill.runningCharges)}<br /><span className="small muted">{r.bill.runningDays} days</span></td>
                    <td className="right"><Link className="btn small primary" to={`/rentals/${r._id}?return=1`}>Record return</Link></td>
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
