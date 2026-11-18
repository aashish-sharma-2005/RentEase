import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../store/AuthContext.jsx';
import { useLoad, Pending, Modal, Empty, rupees, fmtDate, StatusBadge, PayBadge, useToast } from '../components/common/ui.jsx';
import CustomerForm from '../components/customers/CustomerForm.jsx';

export default function CustomerDetails() {
  const { id } = useParams();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const toast = useToast();
  const s = useLoad(() => api.get(`/customers/${id}`), [id]);
  const d = s.data;
  return <div className="stack"><Pending state={s}/>{d && <>
    <div className="page-head"><div><h1>{d.customer.name}</h1><span className="muted">{[d.customer.village,d.customer.mobile].filter(Boolean).join(' · ')}</span></div><div className="row"><button onClick={()=>setEditing(true)}>Edit</button>{isAdmin&&<Link className="btn primary" to={`/rentals/new?customer=${d.customer._id}`}>New rental</Link>}</div></div>
    {(d.customer.address||d.customer.notes)&&<div className="card small">{d.customer.address&&<div>{d.customer.address}</div>}{d.customer.notes&&<div className="muted">{d.customer.notes}</div>}</div>}
    {isAdmin ? <>
      <div className="grid3"><div className="card stat"><span className="label">Total rental charges</span><span className="big num">{rupees(d.ledger.totalCharges)}</span></div><div className="card stat"><span className="label">Total payments</span><span className="big num">{rupees(d.ledger.totalPaid)}</span></div><div className="card stat"><span className="label">Outstanding balance</span><span className="big num">{rupees(d.ledger.outstanding)}</span></div></div>
      <div className="card scroll"><h2>Rentals</h2>{d.rentals.length===0?<Empty>No rentals yet.</Empty>:<table><thead><tr><th>Rental</th><th>Items</th><th>Status</th><th className="right">Balance</th></tr></thead><tbody>{d.rentals.map(r=><tr key={r._id}><td><Link to={`/rentals/${r._id}`}>{r.refNo}</Link><br/><span className="small muted">{fmtDate(r.issueDate)}</span></td><td className="small">{r.issued.rajai} Rajai, {r.issued.gadda} Gadda</td><td><StatusBadge status={r.status}/> {r.status!=='cancelled'&&<PayBadge status={r.bill.paymentStatus}/>}</td><td className="right num">{r.status==='cancelled'?'–':rupees(r.bill.balance)}</td></tr>)}</tbody></table>}</div>
      <div className="card scroll"><h2>Payment history</h2>{d.payments.length===0?<Empty>No payments yet.</Empty>:<table><tbody>{d.payments.map(p=><tr key={p._id} style={p.voided?{opacity:.5,textDecoration:'line-through'}:undefined}><td>{fmtDate(p.date)}</td><td>{p.rental?.refNo}</td><td>{p.method}</td><td className="right num">{rupees(p.amount)}</td></tr>)}</tbody></table>}</div>
    </>:<div className="notice">You can view and update this customer's contact details. Rental, payment and financial information is available only to Admin.</div>}
  </>}{editing&&d&&<Modal title="Edit customer" onClose={()=>setEditing(false)}><CustomerForm initial={d.customer} onCancel={()=>setEditing(false)} onSaved={()=>{setEditing(false);toast('Customer updated');s.reload();}}/></Modal>}</div>;
}
