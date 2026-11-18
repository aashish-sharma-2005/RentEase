import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, newKey } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useLoad, Pending, Modal, Field, ErrorBox, ReasonModal, Empty, rupees, fmtDate, todayStr, StatusBadge, PayBadge, useToast } from '../components/common/ui.jsx';

function ReturnModal({ data, onDone, onClose }) {
  const { rental, bill } = data;
  const key = useRef(newKey());
  const toast = useToast();
  const [f, setF] = useState({ returnDate: todayStr(), rajai: '', gadda: '', damagedRajai: '', damagedGadda: '', note: '' });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const n = (v) => Number(v) || 0;
  const body = { returnDate: f.returnDate, rajai: n(f.rajai), gadda: n(f.gadda), damagedRajai: n(f.damagedRajai), damagedGadda: n(f.damagedGadda), note: f.note };
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  useEffect(() => {
    if (body.rajai + body.gadda === 0) { setPreview(null); return undefined; }
    const t = setTimeout(() => {
      api.post(`/rentals/${rental._id}/returns/preview`, body).then((p) => { setPreview(p); setError(''); }).catch((e) => { setPreview(null); setError(e.message); });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.returnDate, f.rajai, f.gadda, f.damagedRajai, f.damagedGadda]);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post(`/rentals/${rental._id}/returns`, { ...body, idempotencyKey: key.current }); toast('Return saved'); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <Modal title="Record return" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <ErrorBox error={error} />
        <p className="muted small" style={{ margin: 0 }}>Still with customer: {bill.remaining.rajai} Rajai, {bill.remaining.gadda} Gadda.
          {' '}<button type="button" className="small" onClick={() => setF({ ...f, rajai: String(bill.remaining.rajai), gadda: String(bill.remaining.gadda) })}>Fill all remaining</button></p>
        <Field label="Return date"><input type="date" value={f.returnDate} min={rental.issueDate} max={todayStr()} onChange={set('returnDate')} required /></Field>
        <div className="grid2">
          <Field label="Rajai returned"><input type="number" min="0" max={bill.remaining.rajai} inputMode="numeric" value={f.rajai} onChange={set('rajai')} placeholder="0" /></Field>
          <Field label="Gadda returned"><input type="number" min="0" max={bill.remaining.gadda} inputMode="numeric" value={f.gadda} onChange={set('gadda')} placeholder="0" /></Field>
          <Field label="…of which damaged (Rajai)"><input type="number" min="0" inputMode="numeric" value={f.damagedRajai} onChange={set('damagedRajai')} placeholder="0" /></Field>
          <Field label="…of which damaged (Gadda)"><input type="number" min="0" inputMode="numeric" value={f.damagedGadda} onChange={set('damagedGadda')} placeholder="0" /></Field>
        </div>
        <Field label="Note (optional)"><input value={f.note} onChange={set('note')} /></Field>
        {preview && (
          <div className="notice">
            <strong>{preview.chargeableDays} day{preview.chargeableDays > 1 ? 's' : ''}</strong> of rent for these items: Rajai {rupees(preview.rajaiAmount)} + Gadda {rupees(preview.gaddaAmount)} = <strong>{rupees(preview.total)}</strong>
          </div>
        )}
        <button className="primary" disabled={busy || !preview}>Save return</button>
      </form>
    </Modal>
  );
}

function PaymentModal({ data, methods, onDone, onClose }) {
  const key = useRef(newKey());
  const toast = useToast();
  const due = Math.max(data.bill.balance, 0);
  const [f, setF] = useState({ amount: due ? String(due) : '', date: todayStr(), method: methods[0] || 'Cash', reference: '', notes: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post(`/rentals/${data.rental._id}/payments`, { ...f, amount: Number(f.amount), idempotencyKey: key.current }); toast('Payment saved'); onDone(); }
    catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title="Take payment" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <ErrorBox error={error} />
        <p className="muted" style={{ margin: 0 }}>Balance due now: <strong>{rupees(due)}</strong></p>
        <Field label="Amount (₹)"><input type="number" min="1" step="0.01" inputMode="decimal" value={f.amount} onChange={set('amount')} required autoFocus /></Field>
        <div className="grid2">
          <Field label="Date"><input type="date" value={f.date} max={todayStr()} onChange={set('date')} required /></Field>
          <Field label="Method"><select value={f.method} onChange={set('method')}>{methods.map((m) => <option key={m}>{m}</option>)}</select></Field>
        </div>
        <Field label="Reference (optional)" hint="UPI transaction ID, cheque number, etc."><input value={f.reference} onChange={set('reference')} /></Field>
        <Field label="Notes (optional)"><input value={f.notes} onChange={set('notes')} /></Field>
        <button className="primary" disabled={busy}>Save payment</button>
      </form>
    </Modal>
  );
}

export default function RentalDetails() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const nav = useNavigate();
  const { isOwner } = useAuth();
  const toast = useToast();
  const s = useLoad(() => api.get(`/rentals/${id}`), [id]);
  const settings = useLoad(() => api.get('/settings'), []);
  const [modal, setModal] = useState(null); // 'return' | 'pay' | 'cancel' | {void: payment}
  const d = s.data;

  useEffect(() => {
    if (d && params.get('return') === '1') { setModal('return'); setParams({}, { replace: true }); }
  }, [d, params, setParams]);

  const done = () => { setModal(null); s.reload(); };
  const methods = settings.data?.paymentMethods?.length ? settings.data.paymentMethods : ['Cash'];

  if (!d) return <div className="stack"><Pending state={s} /></div>;
  const { rental, returns, payments, bill, business } = d;
  const open = rental.status === 'active';
  const can = rental.status !== 'cancelled';

  return (
    <div className="stack">
      <div className="print-hide stack">
        <div className="page-head">
          <div>
            <h1>{rental.refNo}</h1>
            <span className="muted">Issued {fmtDate(rental.issueDate)}{rental.expectedReturnDate && ` · expected back ${fmtDate(rental.expectedReturnDate)}`}</span>
          </div>
          <div className="row"><StatusBadge status={rental.status} overdue={open && rental.expectedReturnDate && rental.expectedReturnDate < d.today} />{can && <PayBadge status={bill.paymentStatus} />}</div>
        </div>

        <div className="card">
          <div className="row between">
            <div><Link to={`/customers/${rental.customer._id}`}><strong>{rental.customer.name}</strong></Link><br /><span className="small muted">{[rental.customer.village, rental.customer.mobile].filter(Boolean).join(' · ')}</span></div>
            <span className="small muted">by {rental.createdBy?.name}</span>
          </div>
          {rental.notes && <p className="small" style={{ marginBottom: 0 }}>{rental.notes}</p>}
          {rental.status === 'cancelled' && <p className="error">Cancelled: {rental.cancelReason}</p>}
        </div>

        <div className="card scroll">
          <h2>Items</h2>
          <table>
            <thead><tr><th>Item</th><th className="right">Issued</th><th className="right">Returned</th><th className="right">Still out</th><th className="right">Rate/day</th></tr></thead>
            <tbody>
              {['rajai', 'gadda'].map((k) => (
                <tr key={k}><td>{k === 'rajai' ? 'Rajai' : 'Gadda'}</td><td className="right num">{rental.issued[k]}</td><td className="right num">{rental.returned[k]}</td><td className="right num"><strong>{rental.issued[k] - rental.returned[k]}</strong></td><td className="right num">{rupees(rental.rates[k])}</td></tr>
              ))}
            </tbody>
          </table>
        </div>

        {can && (
          <div className="card">
            <h2>Bill</h2>
            <div className="kv">
              <span>Rent for returned items</span><span className="num right">{rupees(bill.settledCharges)}</span>
              {bill.runningCharges > 0 && <><span>Items still out ({bill.runningDays} days so far)</span><span className="num right">{rupees(bill.runningCharges)}</span></>}
              <span>Total bill</span><span className="num right">{rupees(bill.totalBill)}</span>
              <span>Paid</span><span className="num right">{rupees(bill.totalPaid)}</span>
              <span className="total">Balance</span><span className="total num right">{rupees(bill.balance)}</span>
            </div>
            {bill.runningCharges > 0 && <p className="small muted" style={{ marginBottom: 0 }}>The running amount keeps growing until the items are returned.</p>}
          </div>
        )}

        <div className="row">
          {open && <button className="primary" onClick={() => setModal('return')}>Record return</button>}
          {can && <button className={open ? '' : 'primary'} onClick={() => setModal('pay')}>Take payment</button>}
          {can && <button onClick={() => window.print()}>Print receipt</button>}
          {isOwner && open && rental.returned.rajai + rental.returned.gadda === 0 && <button className="danger" onClick={() => setModal('cancel')}>Cancel rental</button>}
        </div>

        <div className="card scroll">
          <h2>Returns</h2>
          {returns.length === 0 ? <Empty>Nothing returned yet.</Empty> : (
            <table>
              <thead><tr><th>Date</th><th>Items</th><th className="right">Days</th><th className="right">Rent</th></tr></thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r._id}>
                    <td>{fmtDate(r.returnDate)}<br /><span className="small muted">{r.createdBy?.name}</span></td>
                    <td className="small">{r.rajai} Rajai, {r.gadda} Gadda{(r.damagedRajai || r.damagedGadda) ? <><br /><span className="badge bad">{r.damagedRajai + r.damagedGadda} damaged</span></> : null}{r.note && <><br /><span className="muted">{r.note}</span></>}</td>
                    <td className="right num">{r.chargeableDays}</td><td className="right num">{rupees(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card scroll">
          <h2>Payments</h2>
          {payments.length === 0 ? <Empty>No payments yet.</Empty> : (
            <table>
              <thead><tr><th>Date</th><th>Method</th><th className="right">Amount</th><th /></tr></thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} style={p.voided ? { opacity: 0.55 } : undefined}>
                    <td>{fmtDate(p.date)}<br /><span className="small muted">{p.createdBy?.name}</span></td>
                    <td>{p.method}{p.reference && <><br /><span className="small muted">{p.reference}</span></>}{p.voided && <><br /><span className="badge bad">Voided: {p.voidReason}</span></>}</td>
                    <td className="right num" style={p.voided ? { textDecoration: 'line-through' } : undefined}>{rupees(p.amount)}</td>
                    <td className="right">{isOwner && !p.voided && <button className="small danger" onClick={() => setModal({ void: p })}>Void</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Printed receipt (hidden on screen) */}
      <div className="receipt">
        <h1>{business.name}</h1>
        <div>{business.address}</div><div>{business.phone}</div>
        <hr />
        <h2>Receipt {rental.refNo}</h2>
        <p>Customer: {rental.customer.name}{rental.customer.village ? `, ${rental.customer.village}` : ''}<br />Issued: {fmtDate(rental.issueDate)}<br />Printed: {fmtDate(d.today)}</p>
        <table>
          <thead><tr><th>Item</th><th>Qty</th><th>Rate/day</th><th>Returned</th></tr></thead>
          <tbody>{['rajai', 'gadda'].filter((k) => rental.issued[k] > 0).map((k) => (
            <tr key={k}><td>{k === 'rajai' ? 'Rajai' : 'Gadda'}</td><td>{rental.issued[k]}</td><td>{rupees(rental.rates[k])}</td><td>{rental.returned[k]}</td></tr>
          ))}</tbody>
        </table>
        {returns.length > 0 && (
          <><h3 style={{ marginTop: 12 }}>Returned</h3>
            <table><thead><tr><th>Date</th><th>Items</th><th>Days</th><th>Rent</th></tr></thead>
              <tbody>{returns.map((r) => <tr key={r._id}><td>{fmtDate(r.returnDate)}</td><td>{r.rajai} Rajai, {r.gadda} Gadda</td><td>{r.chargeableDays}</td><td>{rupees(r.amount)}</td></tr>)}</tbody></table></>
        )}
        <h3 style={{ marginTop: 12 }}>Bill</h3>
        <div className="kv">
          <span>Rent for returned items</span><span className="right">{rupees(bill.settledCharges)}</span>
          {bill.runningCharges > 0 && <><span>Items still out ({bill.runningDays} days so far)</span><span className="right">{rupees(bill.runningCharges)}</span></>}
          <span>Total</span><span className="right">{rupees(bill.totalBill)}</span>
          <span>Paid</span><span className="right">{rupees(bill.totalPaid)}</span>
          <span className="total">Balance due</span><span className="total right">{rupees(bill.balance)}</span>
        </div>
        {payments.some((p) => !p.voided) && (
          <><h3 style={{ marginTop: 12 }}>Payments received</h3>
            <table><tbody>{payments.filter((p) => !p.voided).map((p) => <tr key={p._id}><td>{fmtDate(p.date)}</td><td>{p.method}</td><td>{rupees(p.amount)}</td></tr>)}</tbody></table></>
        )}
        <p style={{ marginTop: 20 }}>{business.footer}</p>
      </div>

      {modal === 'return' && <ReturnModal data={d} onDone={done} onClose={() => setModal(null)} />}
      {modal === 'pay' && <PaymentModal data={d} methods={methods} onDone={done} onClose={() => setModal(null)} />}
      {modal === 'cancel' && (
        <ReasonModal title="Cancel this rental?" confirmText="Cancel rental" danger onClose={() => setModal(null)}
          onConfirm={async (reason) => { await api.post(`/rentals/${id}/cancel`, { reason }); toast('Rental cancelled'); nav('/rentals'); }} />
      )}
      {modal?.void && (
        <ReasonModal title={`Void payment of ${rupees(modal.void.amount)}?`} confirmText="Void payment" danger onClose={() => setModal(null)}
          onConfirm={async (reason) => { await api.post(`/payments/${modal.void._id}/void`, { reason }); toast('Payment voided'); done(); }} />
      )}
    </div>
  );
}
