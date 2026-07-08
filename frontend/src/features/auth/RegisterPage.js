import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register as apiRegister } from '../../services/api';
import AuthLeftPanel from './AuthLeftPanel';
import Spinner from '../../components/Spinner';
import PasswordChecklist from '../../components/PasswordChecklist';
import { validatePassword, firstPasswordError } from '../../utils/passwordPolicy';

function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName]   = useState('');
  const [username, setUsername]   = useState('');
  const [password, setPassword]   = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]         = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (firstPasswordError(password)) {
      setError('A senha não atende a todos os requisitos de segurança.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRegister(username, password, 'aluno', firstName, lastName);
      navigate('/login');
    } catch (err) {
      setError(err.message || 'Não foi possível criar a conta. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordValid     = validatePassword(password);
  const passwordWeak      = password.length > 0 && !passwordValid;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />

      {/* Right: form (scrollable on small heights) */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#cde0d9] overflow-y-auto">

        {/* Mobile-only logo */}
        <div className="lg:hidden text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary mb-3">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8.5 13v-1.5M12 13v-3.5M15.5 13v-5.5" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[#1e293b]">Voz Discente</h1>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-[#1e293b]">Criar conta</h1>
            <p className="text-[#475569] text-sm mt-1">Preencha os dados para começar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_14px_30px_rgba(13,98,92,0.12)] border border-[#cfe0da] p-8">
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
                               placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-primary/30
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
                               placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-primary/30
                               focus:border-primary transition"
                    placeholder="Silva"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Usuário <span className="text-[#64748b] font-normal">(para login)</span>
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
                             placeholder:text-[#64748b] focus:outline-none focus:ring-2 transition
                             ${passwordWeak
                               ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400'
                               : 'border-slate-200 focus:ring-primary/30 focus:border-primary'}`}
                  placeholder="Crie uma senha forte"
                />
                {password.length > 0 && <PasswordChecklist password={password} />}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Confirmar senha
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={`w-full px-4 py-2.5 rounded-xl border text-[#1e293b] text-sm
                             placeholder:text-[#64748b] focus:outline-none focus:ring-2 transition
                             ${passwordsMismatch
                               ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400'
                               : 'border-slate-200 focus:ring-primary/30 focus:border-primary'}`}
                  placeholder="Repita a senha"
                />
                {passwordsMismatch && (
                  <p className="text-sm text-amber-600 mt-1">As senhas não coincidem.</p>
                )}
              </div>

              {error && (
                <p className="text-sm text-[#dc2626] bg-red-50 border border-red-100 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading || !passwordValid || passwordsMismatch}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2"><Spinner /> Criando conta...</span>
                ) : 'Criar Conta'}
              </button>
            </form>
          </div>

          <p className="text-center text-sm text-[#64748b] mt-6">
            Já tem conta?{' '}
            <a href="/login" className="text-primary hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
