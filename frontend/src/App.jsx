import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Transparency from './pages/public/Transparency';

import Dashboard from './pages/admin/Dashboard';
import Residents from './pages/admin/Residents';
import ResidentDetail from './pages/admin/ResidentDetail';
import MaintenanceBills from './pages/admin/MaintenanceBills';
import Payments from './pages/admin/Payments';
import Dues from './pages/admin/Dues';
import Expenses from './pages/admin/Expenses';
import Staff from './pages/admin/Staff';
import Cashbook from './pages/admin/Cashbook';
import BankLedger from './pages/admin/BankLedger';
import Notices from './pages/admin/Notices';
import Complaints from './pages/admin/Complaints';
import Reports from './pages/admin/Reports';

import ResidentDashboard from './pages/resident/ResidentDashboard';
import ResidentNotices from './pages/resident/ResidentNotices';
import ResidentComplaints from './pages/resident/ResidentComplaints';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/transparency" element={<Transparency />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Admin */}
        <Route path="/admin/dashboard" element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
        <Route path="/admin/residents" element={<ProtectedRoute adminOnly><Residents /></ProtectedRoute>} />
        <Route path="/admin/residents/:id" element={<ProtectedRoute adminOnly><ResidentDetail /></ProtectedRoute>} />
        <Route path="/admin/maintenance" element={<ProtectedRoute adminOnly><MaintenanceBills /></ProtectedRoute>} />
        <Route path="/admin/payments" element={<ProtectedRoute adminOnly><Payments /></ProtectedRoute>} />
        <Route path="/admin/dues" element={<ProtectedRoute adminOnly><Dues /></ProtectedRoute>} />
        <Route path="/admin/expenses" element={<ProtectedRoute adminOnly><Expenses /></ProtectedRoute>} />
        <Route path="/admin/staff" element={<ProtectedRoute adminOnly><Staff /></ProtectedRoute>} />
        <Route path="/admin/cashbook" element={<ProtectedRoute adminOnly><Cashbook /></ProtectedRoute>} />
        <Route path="/admin/bank" element={<ProtectedRoute adminOnly><BankLedger /></ProtectedRoute>} />
        <Route path="/admin/notices" element={<ProtectedRoute adminOnly><Notices /></ProtectedRoute>} />
        <Route path="/admin/complaints" element={<ProtectedRoute adminOnly><Complaints /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute adminOnly><Reports /></ProtectedRoute>} />

        {/* Resident */}
        <Route path="/resident/dashboard" element={<ResidentDashboard />} />
        <Route path="/resident/notices" element={<ResidentNotices />} />
        <Route path="/resident/complaints" element={<ResidentComplaints />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
