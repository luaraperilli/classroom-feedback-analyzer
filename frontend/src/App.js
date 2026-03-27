import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary';
import NotFoundPage from './pages/NotFoundPage';

import FeedbackForm from './features/feedback/FeedbackForm';
import StudentHistory from './features/student/StudentHistory';
import ProfilePage from './features/student/ProfilePage';
import Dashboard from './features/dashboard/Dashboard';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import CoordinatorPage from './features/coordinator/CoordinatorPage';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;
  return (
    <Link
      to={to}
      className={`text-sm font-medium px-3 py-1.5 rounded-lg transition
        ${isActive
          ? 'bg-white/20 text-white'
          : 'text-white/70 hover:text-white hover:bg-white/10'
        }`}
    >
      {children}
    </Link>
  );
}

function Navigation() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const isStudent = user?.role === 'aluno';
  const isStaff   = user?.role === 'professor' || user?.role === 'coordenador';

  const handleLogout = () => { logout(); navigate('/login'); };

  if (!isAuthenticated) return null;

  const displayName = user?.display_name
    || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username);

  return (
    <nav className="bg-primary shadow-[0_2px_12px_rgba(15,118,110,0.25)]">
      <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">

        <div className="flex items-center gap-1 min-w-0">
          <div className="flex items-center gap-2 mr-3 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <span className="text-sm font-bold text-white hidden sm:block">FeedbackClass</span>
          </div>

          <div className="h-4 w-px bg-white/20 mr-2 hidden sm:block" />

          {isStudent && (
            <>
              <NavLink to="/">Feedback</NavLink>
              <NavLink to="/historico">Meu Progresso</NavLink>
            </>
          )}
          {isStaff && (
            <NavLink to="/dashboard">Dashboard</NavLink>
          )}
          {user?.role === 'coordenador' && (
            <NavLink to="/coordinator">Gestão</NavLink>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isStudent && (
            <Link
              to="/perfil"
              className="flex items-center gap-2 text-sm text-white/80 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10"
            >
              <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                {(user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase()}
              </div>
              <span className="hidden sm:block text-xs">{displayName}</span>
            </Link>
          )}
          {!isStudent && (
            <span className="text-xs text-white/60 hidden sm:block">{displayName}</span>
          )}
          <div className="h-4 w-px bg-white/20" />
          <button
            onClick={handleLogout}
            className="text-sm text-white/70 hover:text-white transition px-2 py-1 rounded-lg hover:bg-white/10"
          >
            Sair
          </button>
        </div>

      </div>
    </nav>
  );
}

function AppContent() {
  const location = useLocation();
  return (
    <div className="App">
      <Navigation />
      <div key={location.pathname} className="page-transition">
        <Routes>
          <Route path="/login"    element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/" element={
            <ProtectedRoute allowedRoles={['aluno']}>
              <FeedbackForm />
            </ProtectedRoute>
          } />
          <Route path="/historico" element={
            <ProtectedRoute allowedRoles={['aluno']}>
              <StudentHistory />
            </ProtectedRoute>
          } />
          <Route path="/perfil" element={
            <ProtectedRoute allowedRoles={['aluno']}>
              <ProfilePage />
            </ProtectedRoute>
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute allowedRoles={['professor', 'coordenador']}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/coordinator" element={
            <ProtectedRoute allowedRoles={['coordenador']}>
              <CoordinatorPage />
            </ProtectedRoute>
          } />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
