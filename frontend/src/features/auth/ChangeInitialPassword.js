import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { changeInitialPassword } from '../../services/api';
import AuthLeftPanel from './AuthLeftPanel';
import PasswordChecklist from '../../components/PasswordChecklist';
import { validatePassword } from '../../utils/passwordPolicy';
import Spinner from '../../components/Spinner';

// Bloqueio de 1º acesso: o aluno pré-cadastrado precisa definir a própria senha
// antes de usar o sistema. Só aparece enquanto user.must_change_password for true.
function ChangeInitialPassword() {
  const { accessToken, user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                     = useState(null);
  const [isLoading, setIsLoading]             = useState(false);

  const passwordValid     = validatePassword(newPassword);
  const passwordWeak      = newPassword.length > 0 && !passwordValid;
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!passwordValid) {
      setError('A senha não atende a todos os requisitos de segurança.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      await changeInitialPassword(newPassword, accessToken);
      updateUser({ must_change_password: false });
      navigate(user?.role === 'aluno' ? '/' : '/dashboard');
    } catch (err) {
      setError(err.message || 'Não foi possível definir a senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const firstName = user?.first_name || user?.display_name || user?.username || '';

  const inputClass = (invalid) =>
    `w-full px-4 py-2.5 rounded-xl border text-[#1e293b] text-sm
     placeholder:text-[#64748b] focus:outline-none focus:ring-2 transition
     ${invalid
       ? 'border-amber-300 focus:ring-amber-200 focus:border-amber-400'
       : 'border-slate-200 focus:ring-primary/30 focus:border-primary'}`;

  return (
    <div className="min-h-screen flex">
      <AuthLeftPanel />

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#cde0d9] overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="mb-7">
            <div className="inline-flex items-center gap-2 mb-3 text-primary">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className="text-sm font-semibold uppercase tracking-wide">Primeiro acesso</span>
            </div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Crie a sua senha</h1>
            <p className="text-[#475569] text-sm mt-1">
              Olá, {firstName}! Por segurança, defina uma senha só sua antes de continuar.
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_14px_30px_rgba(13,98,92,0.12)] border border-[#cfe0da] p-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-[#1e293b] mb-1.5">
                  Nova senha
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className={inputClass(passwordWeak)}
                  placeholder="Crie uma senha forte"
                />
                {newPassword.length > 0 && <PasswordChecklist password={newPassword} />}
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
                  className={inputClass(passwordsMismatch)}
                  placeholder="Repita a senha"
                />
                {passwordsMismatch && (
                  <p className="text-sm text-amber-600 mt-1">As senhas não coincidem.</p>
                )}
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
                disabled={isLoading || !passwordValid || passwordsMismatch}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2"><Spinner /> Salvando...</span>
                ) : 'Definir senha e entrar'}
              </button>
            </form>
          </div>

          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="w-full text-center text-sm text-[#64748b] hover:text-primary mt-6 transition"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChangeInitialPassword;
