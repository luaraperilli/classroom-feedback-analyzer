import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import FeedbackForm from './FeedbackForm';
import Dashboard from './Dashboard';
import './App.css';
import LoginPage from './LoginPage'; // Certifique-se de que este componente existe
import RegisterPage from './RegisterPage';
import { AuthProvider, useAuth } from './AuthContext';

/**
 * Componente de rota protegida para alunos.
 * Redireciona para a página de login se não autenticado.
 * Redireciona para o dashboard se o usuário não for aluno.
 */
function StudentRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando autenticação...</div>; // Ou um spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return user?.role === 'aluno' ? children : <Navigate to="/dashboard" replace />;
}

function ProfessorRoute({ children }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Carregando autenticação...</div>; // Ou um spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return user?.role === 'professor' ? children : <Navigate to="/" replace />;
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
      {isAuthenticated && user?.role === 'professor' && <Link to="/dashboard">Dashboard</Link>}
      
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
                <ProfessorRoute>
                  <Dashboard />
                </ProfessorRoute>
              }
            />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;

