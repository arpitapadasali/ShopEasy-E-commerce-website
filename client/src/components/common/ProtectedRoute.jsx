import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 'var(--space-16) 0' }}>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
          Verifying session...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Preserve current location to redirect back after successful login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children ? children : <Outlet />;
};

export default ProtectedRoute;
