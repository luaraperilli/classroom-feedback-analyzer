import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './features/auth/AuthContext';
import PageLoader from './components/PageLoader';

function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader label="Carregando..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    const homePath = user?.role === 'aluno' ? '/' : '/dashboard';
    return <Navigate to={homePath} replace />;
  }

  return children;
}

export default ProtectedRoute;