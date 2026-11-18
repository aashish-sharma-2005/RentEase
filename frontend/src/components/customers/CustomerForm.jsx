import { useState } from 'react';
import { api } from '../../services/api.js';
import { Field, ErrorBox } from '../common/ui.jsx';

export default function CustomerForm({ initial, onSaved, onCancel }) {
  const [f, setF] = useState({ name: '', mobile: '', village: '', address: '', notes: '', ...(initial || {}) });
  const [error, setError] = useState('');
  const [dup, setDup] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save(allowDuplicate = false) {
    setBusy(true); setError('');
    try {
      const body = { ...f, allowDuplicate };
      const saved = initial?._id ? await api.put(`/customers/${initial._id}`, body) : await api.post('/customers', body);
      onSaved(saved);
    } catch (e) {
      if (e.status === 409 && e.data?.duplicate) setDup(e.data.existing);
      else setError(e.message);
    } finally { setBusy(false); }
  }

  return (
    <form className="form" onSubmit={(e) => { e.preventDefault(); save(false); }}>
      <ErrorBox error={error} />
      {dup && (
        <div className="notice">
          <strong>{dup.name}</strong> ({dup.village || 'no village'}) already has this mobile number.
          <div className="row" style={{ marginTop: 8 }}>
            <button type="button" className="primary small" onClick={() => onSaved(dup)}>Use {dup.name}</button>
            <button type="button" className="small" onClick={() => save(true)}>Save as a new customer anyway</button>
          </div>
        </div>
      )}
      <Field label="Customer name"><input value={f.name} onChange={set('name')} required autoFocus /></Field>
      <div className="grid2">
        <Field label="Mobile number"><input value={f.mobile} onChange={set('mobile')} inputMode="tel" placeholder="10 digits" /></Field>
        <Field label="Village"><input value={f.village} onChange={set('village')} /></Field>
      </div>
      <Field label="Address (optional)"><input value={f.address} onChange={set('address')} /></Field>
      <Field label="Notes (optional)"><textarea value={f.notes} onChange={set('notes')} /></Field>
      <div className="row">
        <button className="primary" disabled={busy}>{initial?._id ? 'Save changes' : 'Add customer'}</button>
        {onCancel && <button type="button" onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}
