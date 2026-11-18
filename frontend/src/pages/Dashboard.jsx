import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLoad, Pending, rupees, fmtDate, label, StatusBadge, Empty } from '../components/common/ui.jsx';

export default function Dashboard() {
  const s = useLoad(() => api.get('/dashboard'), []);
  const d = s.data;
  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Today</h1>{d && <span className="muted">{fmtDate(d.today)}</span>}</div>
        <Link to="/rentals/new" className="btn primary">New rental</Link>
      </div>
      <Pending state={s} />
      {d && (
        <>
          <div className="grid2">
            {d.inventory.map((i) => (
              <div key={i.itemType} className="card item-card stat">
                <span className="label">{label[i.itemType]} available</span>
                <span className="big num">{i.available}</span>
                <span className="small muted num">{i.rented} rented · {i.damaged} damaged · {i.missing} missing · {i.total} total</span>
              </div>
            ))}
          </div>
          <div className="grid3">
            <div className="card stat"><span className="big num">{d.activeRentals}</span><span className="label">Rentals with customers</span></div>
            <div className="card stat"><span className="big num">{d.todayRentals}</span><span className="label">Rentals issued today</span></div>
            <div className="card stat"><span className="big num">{rupees(d.todayCollected)}</span><span className="label">Collected today ({d.todayPayments} payments)</span></div>
          </div>
          <Link to="/payments" style={{ textDecoration: 'none' }}>
            <div className="card stat"><span className="label">Total customers still owe (so far)</span><span className="big num">{rupees(d.outstanding)}</span><span className="small muted">across {d.outstandingCount} rentals</span></div>
          </Link>

          <div className="card">
            <h2>Overdue returns</h2>
            {d.overdue.length === 0 ? <Empty>Nothing overdue.</Empty> : (
              <table><tbody>
                {d.overdue.map((r) => (
                  <tr key={r._id}>
                    <td><Link to={`/rentals/${r._id}`}>{r.refNo}</Link><br /><span className="small muted">{r.customer?.name}{r.customer?.village ? `, ${r.customer.village}` : ''}</span></td>
                    <td className="right small">Due {fmtDate(r.expectedReturnDate)}<br />{r.remaining.rajai} Rajai, {r.remaining.gadda} Gadda</td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>

          <div className="card">
            <div className="row between"><h2>Recent rentals</h2><Link to="/rentals">See all</Link></div>
            {d.recentRentals.length === 0 ? <Empty>No rentals yet. Create the first one.</Empty> : (
              <table><tbody>
                {d.recentRentals.map((r) => (
                  <tr key={r._id}>
                    <td><Link to={`/rentals/${r._id}`}>{r.refNo}</Link><br /><span className="small muted">{r.customer?.name}</span></td>
                    <td className="small">{r.issued.rajai} Rajai, {r.issued.gadda} Gadda<br />{fmtDate(r.issueDate)}</td>
                    <td className="right"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody></table>
            )}
          </div>

          <div className="card">
            <h2>New customers</h2>
            {d.recentCustomers.length === 0 ? <Empty>No customers yet.</Empty> : (
              <table><tbody>
                {d.recentCustomers.map((c) => (
                  <tr key={c._id}><td><Link to={`/customers/${c._id}`}>{c.name}</Link></td><td className="muted">{c.village}</td><td className="right muted">{c.mobile}</td></tr>
                ))}
              </tbody></table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
