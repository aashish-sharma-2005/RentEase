import { useState } from 'react';
import { useAuth } from '../store/AuthContext.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';
import { useLoad, Pending, Modal, Empty, useToast } from '../components/common/ui.jsx';
import CustomerForm from '../components/customers/CustomerForm.jsx';

export default function Customers() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const toast = useToast();
  const nav = useNavigate();
  const s = useLoad(() => api.get('/customers?q=' + encodeURIComponent(q)), [q]);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Customers</h1>
        <button className="primary" onClick={() => setAdding(true)}>Add customer</button>
      </div>
      <input type="search" placeholder="Search by name, mobile or village" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
      <Pending state={s} />
      {s.data && (
        <div className="card scroll">
          {s.data.length === 0 ? <Empty>{q ? 'No customer matches your search.' : 'No customers yet. Add your first customer.'}</Empty> : (
            <table>
              <thead><tr><th>Name</th><th>Village</th><th>Mobile</th>{isAdmin && <th className="right">Rentals</th>}</tr></thead>
              <tbody>
                {s.data.map((c) => (
                  <tr key={c._id} className="click" onClick={() => nav(`/customers/${c._id}`)}>
                    <td><Link to={`/customers/${c._id}`}>{c.name}</Link></td>
                    <td>{c.village}</td>
                    <td className="num">{c.mobile}</td>
                    {isAdmin && <td className="right num">{c.rentalCount}{c.rentalCount > 1 && <span className="badge ok" style={{ marginLeft: 6 }}>Repeat</span>}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {adding && (
        <Modal title="Add customer" onClose={() => setAdding(false)}>
          <CustomerForm onCancel={() => setAdding(false)} onSaved={(c) => { setAdding(false); toast('Customer saved'); nav(`/customers/${c._id}`); }} />
        </Modal>
      )}
    </div>
  );
}
