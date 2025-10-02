import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './App.css';

import FeedbackForm from './features/feedback/FeedbackForm';
import Dashboard from './features/dashboard/Dashboard';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import CoordinatorPage from './features/coordinator/CoordinatorPage';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import ProtectedRoute from './ProtectedRoute'; // Importa da raiz de src

function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="main-nav">
      {isAuthenticated && user?.role === 'aluno' && <Link to="/">Enviar Feedback</Link>}
      {isAuthenticated && (user?.role === 'professor' || user?.role === 'coordenador') && <Link to="/dashboard">Dashboard</Link>}
      {isAuthenticated && user?.role === 'coordenador' && <Link to="/coordinator">Gestão</Link>}

      {!isAuthenticated && (
        <>
          <Link to="/login">Login</Link>
          <Link to="/register">Cadastro</Link>
        </>
      )}

      {isAuthenticated && <button onClick={handleLogout} className="logout-button">Sair</button>}
    </nav>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Navigation />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute allowedRoles={['aluno']}>
                  <FeedbackForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['professor', 'coordenador']}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/coordinator"
              element={
                <ProtectedRoute allowedRoles={['coordenador']}>
                  <CoordinatorPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;