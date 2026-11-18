import { createContext, useContext, useState, useCallback, useEffect } from 'react';

export const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function fmtDate(s) {
  if (!s) return '–';
  const [y, m, d] = s.split('-');
  return `${+d} ${MONTHS[+m - 1]} ${y}`;
}
export function todayStr() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
}
export const label = { rajai: 'Rajai', gadda: 'Gadda' };

/* Toasts */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, message, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((i) => <div key={i.id} className={'toast ' + (i.kind === 'err' ? 'err' : '')}>{i.message}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

export function Modal({ title, onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2>{title}</h2>
          <button className="small" onClick={onClose} aria-label="Close">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label: text, hint, children }) {
  return (
    <label className="field">
      <span>{text}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

export const ErrorBox = ({ error }) => (error ? <div className="error" role="alert">{error}</div> : null);
export const Empty = ({ children }) => <p className="muted" style={{ padding: '18px 0', textAlign: 'center' }}>{children}</p>;
export const Loading = () => <p className="muted">Loading…</p>;

export function StatusBadge({ status, overdue }) {
  if (overdue) return <span className="badge bad">Overdue</span>;
  const map = { active: ['warn', 'With customer'], completed: ['ok', 'Returned'], cancelled: ['mute', 'Cancelled'] };
  const [cls, text] = map[status] || ['mute', status];
  return <span className={'badge ' + cls}>{text}</span>;
}
export function PayBadge({ status }) {
  const map = { paid: ['ok', 'Paid'], partial: ['warn', 'Partly paid'], unpaid: ['bad', 'Unpaid'] };
  const [cls, text] = map[status] || ['mute', status];
  return <span className={'badge ' + cls}>{text}</span>;
}

/* Tiny data-loading hook */
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => live && setState({ data, error: null, loading: false }))
      .catch((e) => live && setState({ data: null, error: e.message, loading: false }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, reload: () => setTick((t) => t + 1) };
}

export function Pending({ state }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error) return <ErrorBox error={state.error} />;
  return null;
}

export function ReasonModal({ title, confirmText, onConfirm, onClose, danger }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function go(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await onConfirm(reason.trim()); } catch (err) { setError(err.message); setBusy(false); }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form className="form" onSubmit={go}>
        <ErrorBox error={error} />
        <Field label="Reason" hint="Kept in the records for checking later."><input value={reason} onChange={(e) => setReason(e.target.value)} required autoFocus /></Field>
        <button className={danger ? 'danger' : 'primary'} disabled={busy}>{confirmText}</button>
      </form>
    </Modal>
  );
}
