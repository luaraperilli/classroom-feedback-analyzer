import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { login as apiLogin } from '../../services/api';
import AuthLeftPanel from './AuthLeftPanel';
import Spinner from '../../components/Spinner';

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
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#cde0d9]">

        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8.5 13v-1.5M12 13v-3.5M15.5 13v-5.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b]">Voz Discente</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#1e293b]">Bem-vindo de volta</h1>
            <p className="text-[#475569] text-sm mt-1">Faça login para continuar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_14px_30px_rgba(13,98,92,0.12)] border border-[#cfe0da] p-8">
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
                             placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-primary/30
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
                             placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div role="alert" className="flex items-start gap-2 text-sm text-[#dc2626] bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2"><Spinner /> Entrando...</span>
                ) : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#64748b] mt-6">
            Não tem conta?{' '}
            <a href="/register" className="text-primary hover:underline">Cadastre-se</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
