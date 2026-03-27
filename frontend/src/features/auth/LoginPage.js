import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { login as apiLogin } from '../../services/api';
import AuthLeftPanel from './AuthLeftPanel';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const data = await apiLogin(username, password);
      login(data.access_token, data.refresh_token, data.user);
      navigate(data.user.role === 'aluno' ? '/' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Usuário ou senha incorretos.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />

      {/* Right: form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#f8fafc]">

        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b]">FeedbackClass</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#1e293b]">Bem-vindo de volta</h1>
            <p className="text-[#64748b] text-sm mt-1">Faça login para continuar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Usuário
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="Seu nome de usuário"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-sm text-negative bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-[#94a3b8] mt-6">
            Não tem conta?{' '}
            <a href="/register" className="text-primary hover:underline">Cadastre-se</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
