import { api } from '../services/api.js';
import { useLoad, Pending } from '../components/common/ui.jsx';

export default function Activity() {
  const s = useLoad(() => api.get('/activity?limit=200'), []);
  return <div className="stack"><div><h1>Activity History</h1><p className="muted">Recent changes and actions performed by each account.</p></div><Pending state={s}/><div className="card scroll"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Record</th><th>Details</th></tr></thead><tbody>{s.data?.map((a)=><tr key={a._id}><td>{new Date(a.createdAt).toLocaleString()}</td><td>{a.user?.name || 'System'}</td><td>{a.action}</td><td>{a.entity} {a.entityId ? `· ${String(a.entityId).slice(-6)}` : ''}</td><td><code>{JSON.stringify(a.detail || {})}</code></td></tr>)}</tbody></table>{s.data?.length===0&&<p className="muted">No activity recorded yet.</p>}</div></div>;
}
