import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../../services/api';
import AuthLeftPanel from './AuthLeftPanel';

const MIN_PASSWORD_LENGTH = 6;

function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [role, setRole]           = useState('aluno');
  const [error, setError]         = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }

    setIsLoading(true);
    try {
      await apiRegister(username, password, role, firstName, lastName);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />

      {/* Right: form (scrollable on small heights) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#f8fafc] overflow-y-auto">

        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.966 8.966 0 00-6 2.292m0-14.25v14.25" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b]">FeedbackClass</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#1e293b]">Criar conta</h1>
            <p className="text-[#64748b] text-sm mt-1">Preencha os dados para começar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-slate-100 p-8">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                    Nome
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                               placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                               focus:border-primary transition"
                    placeholder="Maria"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                    Sobrenome
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                               placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                               focus:border-primary transition"
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Usuário <span className="text-[#94a3b8] font-normal">(para login)</span>
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
                  placeholder="maria.silva"
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
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 transition
                             ${passwordTooShort
                               ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400'
                               : 'border-slate-200 focus:ring-primary/30 focus:border-primary'}`}
                  placeholder="Mínimo 6 caracteres"
                />
                {passwordTooShort && (
                  <p className="text-xs text-amber-600 mt-1">
                    Mínimo {MIN_PASSWORD_LENGTH} caracteres ({MIN_PASSWORD_LENGTH - password.length} restantes)
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Perfil
                </label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             bg-white focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition cursor-pointer"
                >
                  <option value="aluno">Aluno</option>
                  <option value="professor">Professor</option>
                  <option value="coordenador">Coordenador</option>
                </select>
              </div>

              {error && (
                <p className="text-sm text-negative bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || passwordTooShort}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Criando conta...' : 'Criar Conta'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-[#94a3b8] mt-6">
            Já tem conta?{' '}
            <a href="/login" className="text-primary hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
