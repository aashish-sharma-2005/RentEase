import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/AuthContext.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Customers from './pages/Customers.jsx';
import CustomerDetails from './pages/CustomerDetails.jsx';
import Inventory from './pages/Inventory.jsx';
import Rentals from './pages/Rentals.jsx';
import NewRental from './pages/NewRental.jsx';
import RentalDetails from './pages/RentalDetails.jsx';
import Returns from './pages/Returns.jsx';
import Payments from './pages/Payments.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Activity from './pages/Activity.jsx';
import { Loading } from './components/common/ui.jsx';

export default function App() {
  const { user, loading, isAdmin } = useAuth();
  if (loading) return <div className="login"><Loading /></div>;
  if (!user) return <Login />;
  return <Routes><Route element={<MainLayout/>}>
    <Route index element={<Navigate to={isAdmin ? '/dashboard' : '/customers'} replace/>}/>
    <Route path="customers" element={<Customers/>}/><Route path="customers/:id" element={<CustomerDetails/>}/>
    {isAdmin && <>
      <Route path="dashboard" element={<Dashboard/>}/><Route path="inventory" element={<Inventory/>}/>
      <Route path="rentals" element={<Rentals/>}/><Route path="rentals/new" element={<NewRental/>}/><Route path="rentals/:id" element={<RentalDetails/>}/>
      <Route path="returns" element={<Returns/>}/><Route path="payments" element={<Payments/>}/><Route path="reports" element={<Reports/>}/>
      <Route path="settings" element={<Settings/>}/><Route path="users" element={<UserManagement/>}/><Route path="activity" element={<Activity/>}/>
    </>}
    <Route path="*" element={<Navigate to={isAdmin ? '/dashboard' : '/customers'} replace/>}/>
  </Route></Routes>;
}
