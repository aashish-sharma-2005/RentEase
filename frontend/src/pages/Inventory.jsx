import { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useLoad, Pending, Modal, Field, ErrorBox, Empty, label, fmtDate, useToast } from '../components/common/ui.jsx';

const ACTIONS = [
  ['add', 'Add new stock'],
  ['remove', 'Remove stock (sold / discarded)'],
  ['damaged', 'Mark as damaged'],
  ['repaired', 'Damaged item repaired'],
  ['missing', 'Mark as missing'],
  ['found', 'Missing item found'],
];
const KIND = { opening: 'Opening', add: 'Added', remove: 'Removed', damaged: 'Damaged', missing: 'Missing', repaired: 'Repaired', found: 'Found', rental: 'Rented out', return: 'Returned' };

function Adjust({ item, onDone, onClose }) {
  const [f, setF] = useState({ action: 'add', quantity: '', reason: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.put(`/inventory/${item.itemType}`, { ...f, quantity: Number(f.quantity) }); toast('Stock updated'); onDone(); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Change ${label[item.itemType]} stock`} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <ErrorBox error={error} />
        <Field label="What happened?"><select value={f.action} onChange={(e) => setF({ ...f, action: e.target.value })}>{ACTIONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field>
        <Field label="How many?"><input type="number" min="1" step="1" inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} required /></Field>
        <Field label="Reason" hint="Saved in the stock history."><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} required placeholder="e.g. Bought 10 new from market" /></Field>
        <button className="primary" disabled={busy}>Save change</button>
      </form>
    </Modal>
  );
}

export default function Inventory() {
  const { isOwner } = useAuth();
  const toast = useToast();
  const [adj, setAdj] = useState(null);
  const inv = useLoad(() => api.get('/inventory'), []);
  const hist = useLoad(() => api.get('/inventory/history'), []);
  const done = () => { setAdj(null); inv.reload(); hist.reload(); };
  return (
    <div className="stack">
      <h1>Stock</h1>
      <Pending state={inv} />
      <div className="grid2">
        {inv.data?.map((i) => (
          <div key={i._id} className="card item-card stack" style={{ gap: 10 }}>
            <div className="stat"><span className="label">{label[i.itemType]} available</span><span className="big num">{i.available}</span></div>
            {i.lowStock && <span className="badge warn">Low stock</span>}
            <div className="kv small"><span>Total owned</span><span className="num">{i.total}</span><span>Rented out</span><span className="num">{i.rented}</span><span>Damaged</span><span className="num">{i.damaged}</span><span>Missing</span><span className="num">{i.missing}</span><span>Low-stock alert at</span><span className="num">{i.lowStockThreshold}</span></div>
            {isOwner && <div className="row"><button onClick={() => setAdj(i)}>Change stock</button><button className="small" onClick={async()=>{const v=window.prompt(`Alert when available ${label[i.itemType]} stock is at or below:`,String(i.lowStockThreshold));if(v===null)return;const n=Number(v);if(!Number.isInteger(n)||n<0){toast('Enter a whole number zero or greater.','err');return;}try{await api.put(`/inventory/${i.itemType}/threshold`,{lowStockThreshold:n});toast('Low-stock alert updated');inv.reload();}catch(e){toast(e.message,'err');}}}>Set alert</button></div>}
          </div>
        ))}
      </div>
      {!isOwner && <p className="muted small">Only Admin can change stock counts.</p>}
      <div className="card scroll">
        <h2>Stock history</h2>
        {hist.data?.length === 0 ? <Empty>No stock changes yet. Add your opening stock to start.</Empty> : (
          <table>
            <thead><tr><th>When</th><th>Item</th><th>What</th><th className="right">Qty</th><th>Reason</th></tr></thead>
            <tbody>
              {hist.data?.map((h) => (
                <tr key={h._id}>
                  <td className="small">{fmtDate(h.createdAt.slice(0, 10))}<br /><span className="muted">{h.createdBy?.name}</span></td>
                  <td>{label[h.itemType]}</td><td>{KIND[h.kind]}</td><td className="right num">{h.quantity}</td>
                  <td className="small">{h.reason}<br /><span className="muted">{h.snapshot?.available} available after</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {adj && <Adjust item={adj} onDone={done} onClose={() => setAdj(null)} />}
    </div>
  );
}
