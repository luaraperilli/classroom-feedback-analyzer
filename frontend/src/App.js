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
import ChangeInitialPassword from './features/auth/ChangeInitialPassword';
import CoordinatorPage from './features/coordinator/CoordinatorPage';
import { AuthProvider, useAuth } from './features/auth/AuthContext';
import ProtectedRoute from './ProtectedRoute';

const ICON = {
  feedback: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
    </svg>
  ),
  progress: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  profile: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  ),
  dashboard: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  gestao: (
    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  ),
};

function SidebarLink({ to, label, icon }) {
  const { pathname } = useLocation();
  const isActive = pathname === to;
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition mb-1
        ${isActive ? 'bg-white/20 text-white' : 'text-white/75 hover:text-white hover:bg-white/10'}`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Sidebar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const isStudent = user?.role === 'aluno';
  const isStaff   = user?.role === 'professor' || user?.role === 'coordenador';
  const handleLogout = () => { logout(); navigate('/login'); };

  const displayName = user?.display_name
    || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username);
  const initial = (user?.first_name?.[0] || user?.username?.[0] || '?').toUpperCase();

  return (
    <aside className="w-60 flex-shrink-0 bg-gradient-to-b from-primary to-primary-dark flex flex-col p-5 sticky top-0 h-screen">
      <div className="flex items-center gap-2.5 mb-9">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8.5 13v-1.5M12 13v-3.5M15.5 13v-5.5" />
          </svg>
        </div>
        <span className="text-white font-bold text-base">Voz Discente</span>
      </div>

      <nav className="flex-1">
        {isStudent && (
          <>
            <SidebarLink to="/" label="Feedback" icon={ICON.feedback} />
            <SidebarLink to="/historico" label="Minhas Avaliações" icon={ICON.progress} />
            <SidebarLink to="/perfil" label="Perfil" icon={ICON.profile} />
          </>
        )}
        {isStaff && <SidebarLink to="/dashboard" label="Dashboard" icon={ICON.dashboard} />}
        {user?.role === 'coordenador' && <SidebarLink to="/coordinator" label="Gestão" icon={ICON.gestao} />}
      </nav>

      <div className="pt-4 border-t border-white/15">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{displayName}</p>
            <p className="text-white/60 text-sm capitalize">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}

function AppContent() {
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();

  // 1º acesso: enquanto o aluno pré-cadastrado não definir a própria senha,
  // bloqueia todo o restante do app (sem menu lateral, sem rotas).
  if (isAuthenticated && user?.must_change_password) {
    return <ChangeInitialPassword />;
  }

  return (
    <div className="App flex min-h-screen">
      <Sidebar />
      <div className="flex-1 min-w-0">
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
