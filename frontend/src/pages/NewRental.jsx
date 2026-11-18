import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api, newKey } from '../services/api.js';
import { useLoad, Field, ErrorBox, Modal, rupees, todayStr, label, useToast } from '../components/common/ui.jsx';
import CustomerForm from '../components/customers/CustomerForm.jsx';

export default function NewRental() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const toast = useToast();
  const key = useRef(newKey());
  const inv = useLoad(() => api.get('/inventory'), []);
  const settings = useLoad(() => api.get('/settings'), []);
  const [customer, setCustomer] = useState(null);
  const [q, setQ] = useState('');
  const [matches, setMatches] = useState([]);
  const [addNew, setAddNew] = useState(false);
  const [f, setF] = useState({ rajai: '', gadda: '', issueDate: todayStr(), expectedReturnDate: '', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const id = params.get('customer');
    if (id) api.get(`/customers/${id}`).then((d) => setCustomer(d.customer)).catch(() => {});
  }, [params]);

  useEffect(() => {
    if (customer || q.trim().length < 1) { setMatches([]); return undefined; }
    const t = setTimeout(() => api.get('/customers?q=' + encodeURIComponent(q)).then((d) => setMatches(d.slice(0, 6))).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, customer]);

  const avail = Object.fromEntries((inv.data || []).map((i) => [i.itemType, i.available]));
  const rates = settings.data?.rates || { rajai: 0, gadda: 0 };
  const r = Number(f.rajai) || 0;
  const g = Number(f.gadda) || 0;
  const perDay = r * rates.rajai + g * rates.gadda;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (!customer) return setError('Choose a customer first.');
    setBusy(true); setError('');
    try {
      const rental = await api.post('/rentals', { customerId: customer._id, ...f, rajai: r, gadda: g, idempotencyKey: key.current });
      toast(`Rental ${rental.refNo} saved`);
      nav(`/rentals/${rental._id}`, { replace: true });
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>New rental</h1>
      <form className="card form" onSubmit={submit}>
        <ErrorBox error={error} />
        <div className="form">
          <strong>Customer</strong>
          {customer ? (
            <div className="row between card flat">
              <span><strong>{customer.name}</strong><br /><span className="small muted">{[customer.village, customer.mobile].filter(Boolean).join(' · ')}</span></span>
              <button type="button" className="small" onClick={() => { setCustomer(null); setQ(''); }}>Change</button>
            </div>
          ) : (
            <>
              <input type="search" placeholder="Type name, mobile or village" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find customer" />
              {matches.map((c) => (
                <button type="button" key={c._id} style={{ textAlign: 'left' }} onClick={() => setCustomer(c)}>{c.name} <span className="muted small">{c.village} {c.mobile}</span></button>
              ))}
              <button type="button" onClick={() => setAddNew(true)}>Add a new customer</button>
            </>
          )}
        </div>

        <div className="grid2">
          <Field label="Rajai (quilts)" hint={`${avail.rajai ?? '…'} available · ${rupees(rates.rajai)}/day each`}>
            <input type="number" min="0" step="1" inputMode="numeric" value={f.rajai} onChange={set('rajai')} placeholder="0" />
          </Field>
          <Field label="Gadda (mattresses)" hint={`${avail.gadda ?? '…'} available · ${rupees(rates.gadda)}/day each`}>
            <input type="number" min="0" step="1" inputMode="numeric" value={f.gadda} onChange={set('gadda')} placeholder="0" />
          </Field>
        </div>
        {(r > (avail.rajai ?? Infinity) || g > (avail.gadda ?? Infinity)) && (
          <div className="error">Not enough stock: {r > avail.rajai ? `only ${avail.rajai} ${label.rajai} available. ` : ''}{g > avail.gadda ? `only ${avail.gadda} ${label.gadda} available.` : ''}</div>
        )}
        <div className="grid2">
          <Field label="Issue date"><input type="date" value={f.issueDate} onChange={set('issueDate')} required /></Field>
          <Field label="Expected return (optional)" hint="Used for overdue alerts."><input type="date" min={f.issueDate} value={f.expectedReturnDate} onChange={set('expectedReturnDate')} /></Field>
        </div>
        <Field label="Notes (optional)"><textarea value={f.notes} onChange={set('notes')} /></Field>
        <div className="notice">Rent per day for these items: <strong>{rupees(perDay)}</strong>. The final bill is worked out when items come back.</div>
        <button className="primary" disabled={busy || r + g === 0}>Save rental</button>
      </form>
      {addNew && (
        <Modal title="Add customer" onClose={() => setAddNew(false)}>
          <CustomerForm onCancel={() => setAddNew(false)} onSaved={(c) => { setCustomer(c); setAddNew(false); }} />
        </Modal>
      )}
    </div>
  );
}
