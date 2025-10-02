import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import FeedbackForm from './FeedbackForm';
import Dashboard from './Dashboard';
import './App.css';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import { AuthProvider, useAuth } from './AuthContext';

function StudentRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando autenticação...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return user?.role === 'aluno' ? children : <Navigate to="/dashboard" replace />;
}

function DashboardAccessRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando autenticação...</div>; 
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (user?.role === 'professor' || user?.role === 'coordenador') 
    ? children 
    : <Navigate to="/" replace />;
}

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
                <StudentRoute>
                  <FeedbackForm />
                </StudentRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <DashboardAccessRoute>
                  <Dashboard />
                </DashboardAccessRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;