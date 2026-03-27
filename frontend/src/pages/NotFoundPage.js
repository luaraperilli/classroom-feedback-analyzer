import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

function NotFoundPage() {
  const { user } = useAuth();
  const homeRoute = user?.role === 'aluno' ? '/' : '/dashboard';

  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-8xl font-bold text-primary/20 leading-none">404</p>
        <h1 className="text-2xl font-bold text-[#1e293b]">Página não encontrada</h1>
        <p className="text-sm text-[#64748b]">Esta página não existe ou foi removida.</p>
        <Link
          to={homeRoute}
          className="inline-block mt-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
