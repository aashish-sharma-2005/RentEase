import { useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { Field, ErrorBox } from '../components/common/ui.jsx';

export default function Login() {
  const { signIn } = useAuth();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((old) => ({ ...old, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { signIn(await api.post('/auth/login', form)); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  return (
    <div className="login">
      <form className="card form" onSubmit={submit}>
        <div><h1>Rajai-Gadda Rental</h1><p className="muted" style={{ margin: '4px 0 0' }}>Sign in with the account created by your administrator.</p></div>
        <ErrorBox error={error} />
        <Field label="Username"><input value={form.username} onChange={set('username')} required autoCapitalize="none" autoComplete="username" /></Field>
        <Field label="Password"><input type="password" value={form.password} onChange={set('password')} required autoComplete="current-password" /></Field>
        <button className="primary" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
        <p className="muted small">Accounts are created by the Admin. Public registration is disabled.</p>
      </form>
    </div>
  );
}
