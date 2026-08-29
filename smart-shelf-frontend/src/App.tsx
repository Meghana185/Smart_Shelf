import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { CustomerNavbar } from './components/CustomerNavbar';
import { ProtectedRoute } from './components/ProtectedRoute';

import { LandingPage } from './pages/LandingPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { StaffLoginPage } from './pages/StaffLoginPage';
import { CustomerLoginPage } from './pages/CustomerLoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { BillingDashboard } from './pages/BillingDashboard';
import { CustomerDashboard } from './pages/CustomerDashboard';

function NavigationHeader() {
  const location = useLocation();
  // Public & Customer routes (Landing Page, Customer Login, Customer Dashboard) use CustomerNavbar
  const isCustomerRoute = location.pathname === '/' || location.pathname.startsWith('/login/customer') || location.pathname.startsWith('/dashboard');

  if (isCustomerRoute) {
    return <CustomerNavbar />;
  }

  return <Navbar />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">

          <NavigationHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login/admin" element={<AdminLoginPage />} />
              <Route path="/login/staff" element={<StaffLoginPage />} />
              <Route path="/login/customer" element={<CustomerLoginPage />} />

              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/billing"
                element={
                  <ProtectedRoute allowedRoles={['staff']}>
                    <BillingDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
