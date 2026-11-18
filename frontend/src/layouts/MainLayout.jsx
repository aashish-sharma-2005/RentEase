import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext.jsx';

const adminLinks = [
  ['/dashboard', 'Dashboard'], ['/rentals', 'Rentals'], ['/returns', 'Returns'], ['/customers', 'Customers'],
  ['/payments', 'Payments'], ['/inventory', 'Stock'], ['/reports', 'Reports'], ['/users', 'User Management'],
  ['/activity', 'Activity History'], ['/settings', 'Settings'],
];

export default function MainLayout() {
  const { user, logout, isAdmin } = useAuth();
  const links = isAdmin ? adminLinks : [['/customers', 'Customers', true]];
  return <div className="shell">
    <nav className="side" aria-label="Main"><div className="brand">Rajai-Gadda<small>Rental manager</small></div>
      {links.map(([to, text, end]) => <NavLink key={to} to={to} end={end}>{text}</NavLink>)}
      <div className="spacer"/><div className="who small" style={{padding:'0 12px',opacity:.8}}>{user?.name} ({isAdmin ? 'Admin' : 'User'})</div>
      <button className="link" onClick={logout}>Log out</button>
    </nav>
    <main className="main"><div className="topbar no-print"><strong>Rajai-Gadda Rental</strong><span className="small muted">{isAdmin ? 'Admin account' : 'Customer management access'}</span><button className="small" onClick={logout}>Log out</button></div><Outlet/></main>
  </div>;
}
