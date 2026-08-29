import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'staff' | 'customer')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated || !user) {
    if (allowedRoles.includes('customer') && !allowedRoles.includes('admin') && !allowedRoles.includes('staff')) {
      return <Navigate to="/login/customer" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'staff') return <Navigate to="/billing" replace />;
    if (user.role === 'customer') return <Navigate to="/dashboard" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
