import { useState } from 'react';
import { api } from '../services/api.js';
import { useLoad, Pending, Modal, Field, ErrorBox, useToast } from '../components/common/ui.jsx';

export default function UserManagement() {
  const s = useLoad(() => api.get('/users'), []);
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', password: '' });
  const [error, setError] = useState('');
  async function create(e) {
    e.preventDefault(); setError('');
    try { await api.post('/users', form); toast('User account created'); setAdding(false); setForm({ name: '', username: '', password: '' }); s.reload(); }
    catch (err) { setError(err.message); }
  }
  async function update(user, body, message) {
    try { await api.put(`/users/${user._id || user.id}`, body); toast(message); s.reload(); }
    catch (err) { toast(err.message, 'err'); }
  }
  return <div className="stack">
    <div className="page-head"><div><h1>User Management</h1><p className="muted">Create individual accounts for family members. Users can manage customers only.</p></div><button className="primary" onClick={() => setAdding(true)}>Add user</button></div>
    <Pending state={s} />
    <div className="card scroll"><table><thead><tr><th>Name</th><th>Username</th><th>Status</th><th>Last login</th><th className="right">Actions</th></tr></thead><tbody>
      {s.data?.map((u) => <tr key={u._id || u.id}><td>{u.name}</td><td>{u.username}</td><td><span className={`badge ${u.active ? 'ok' : 'mute'}`}>{u.active ? 'Active' : 'Disabled'}</span></td><td>{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : 'Never'}</td><td className="right"><button className="small" onClick={() => { const password = window.prompt(`Set a new password for ${u.name} (minimum 10 characters)`); if (password) update(u, { password }, 'Password reset'); }}>Reset password</button>{' '}<button className="small" onClick={() => update(u, { active: !u.active }, u.active ? 'User disabled' : 'User enabled')}>{u.active ? 'Disable' : 'Enable'}</button></td></tr>)}
    </tbody></table>{s.data?.length === 0 && <p className="muted">No user accounts have been created.</p>}</div>
    {adding && <Modal title="Create user account" onClose={() => setAdding(false)}><form className="form" onSubmit={create}><ErrorBox error={error}/><Field label="Full name"><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/></Field><Field label="Username"><input value={form.username} onChange={e=>setForm({...form,username:e.target.value})} required autoCapitalize="none"/></Field><Field label="Temporary password" hint="At least 10 characters."><input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required minLength={10}/></Field><button className="primary">Create account</button></form></Modal>}
  </div>;
}
