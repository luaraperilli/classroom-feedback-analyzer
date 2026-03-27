import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getProfile, updateProfile } from '../../services/api';

function ProfilePage() {
  const { accessToken, user, updateUser } = useAuth();

  const [firstName, setFirstName]           = useState('');
  const [lastName, setLastName]             = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword]       = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSaving, setIsSaving]     = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    if (!accessToken) return;
    getProfile(accessToken).then((data) => {
      setFirstName(data.first_name || '');
      setLastName(data.last_name || '');
    }).catch(() => {});
  }, [accessToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (newPassword && newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = { first_name: firstName, last_name: lastName };
      if (newPassword) {
        payload.current_password = currentPassword;
        payload.new_password = newPassword;
      }
      const data = await updateProfile(payload, accessToken);
      updateUser({
        first_name:   data.first_name,
        last_name:    data.last_name,
        display_name: data.display_name,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccessMsg('Perfil atualizado com sucesso.');
    } catch (err) {
      setError(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const initials = (() => {
    const f = firstName || user?.first_name || '';
    const l = lastName  || user?.last_name  || '';
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f[0].toUpperCase();
    return (user?.username?.[0] || '?').toUpperCase();
  })();

  const displayName = firstName
    ? `${firstName} ${lastName}`.trim()
    : user?.display_name || user?.username || '';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <div className="max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* ── Profile header card ─────────────────────────────────────────── */}
        <div className="bg-primary rounded-2xl p-8 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -left-8  w-28 h-28 rounded-full bg-white/5" />

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-5">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-2xl font-bold">{initials}</span>
            </div>

            {/* Info */}
            <div className="text-center sm:text-left">
              <p className="text-xl font-bold text-white leading-tight">{displayName}</p>
              <p className="text-sm text-white/70 mt-0.5">@{user?.username}</p>
              <span className="mt-2 inline-block text-xs font-medium px-3 py-1 rounded-full bg-white/20 text-white capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* ── Edit form ───────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Personal info */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 space-y-4">
            <h2 className="text-base font-semibold text-[#1e293b]">Informações Pessoais</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-1.5">Nome</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="Seu nome"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-1.5">Sobrenome</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">
                Usuário <span className="text-[#94a3b8] font-normal">(não pode ser alterado)</span>
              </label>
              <input
                type="text"
                value={user?.username || ''}
                disabled
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#94a3b8] text-sm bg-slate-50 cursor-not-allowed"
              />
            </div>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 space-y-4">
            <div>
              <h2 className="text-base font-semibold text-[#1e293b]">Alterar Senha</h2>
              <p className="text-xs text-[#94a3b8] mt-0.5">Deixe em branco para manter a senha atual.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-1.5">Senha Atual</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                           placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                           focus:border-primary transition"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-1.5">Nova Senha</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#1e293b] mb-1.5">Confirmar</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-[#1e293b] text-sm
                             placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                             focus:border-primary transition"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-negative bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-positive bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                       hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default ProfilePage;
