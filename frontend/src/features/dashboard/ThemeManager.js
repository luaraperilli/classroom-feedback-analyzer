import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getSubjects, getThemes, createTheme, deleteTheme } from '../../services/api';
import { translateSubject } from '../../utils/translations';
import Spinner from '../../components/Spinner';

// Gerenciamento de temas das aulas (professor/coordenador). O aluno escolhe o tema
// ao enviar o feedback; depois, reflete por tema em "Minhas Avaliações".
function ThemeManager() {
  const { accessToken } = useAuth();
  const [subjects, setSubjects]   = useState([]);
  const [subjectId, setSubjectId] = useState('');
  const [themes, setThemes]       = useState([]);
  const [novo, setNovo]           = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving]   = useState(false);
  const [error, setError]         = useState(null);

  useEffect(() => {
    if (!accessToken) return;
    getSubjects(accessToken)
      .then((data) => {
        setSubjects(data);
        if (data.length) setSubjectId((prev) => prev || String(data[0].id));
      })
      .catch(() => {});
  }, [accessToken]);

  useEffect(() => {
    if (!subjectId || !accessToken) { setThemes([]); return; }
    let cancelled = false;
    setIsLoading(true);
    getThemes(subjectId, accessToken)
      .then((d) => { if (!cancelled) setThemes(Array.isArray(d) ? d : []); })
      .catch(() => { if (!cancelled) setThemes([]); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [subjectId, accessToken]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setError(null);
    const nome = novo.trim();
    if (!nome || !subjectId) return;
    setIsSaving(true);
    try {
      const tema = await createTheme(parseInt(subjectId), nome, accessToken);
      setThemes((prev) => [...prev, tema]);
      setNovo('');
    } catch (err) {
      setError(err.message || 'Não foi possível adicionar o tema.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setError(null);
    try {
      await deleteTheme(id, accessToken);
      setThemes((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError(err.message || 'Não foi possível remover o tema.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#cfe0da] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6 space-y-5">
      <div>
        <h2 className="flex items-center gap-2.5 text-lg font-bold text-[#0f172a]">
          <span className="w-1 h-5 rounded-full bg-primary" />
          Temas das aulas
        </h2>
        <p className="text-sm text-[#64748b] mt-1">
          Cadastre os temas de cada matéria. O aluno escolhe o tema ao enviar o feedback e, depois, consegue refletir por assunto.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="tm-subject" className="text-sm text-[#475569]">Matéria:</label>
        <select
          id="tm-subject"
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white text-[#1e293b]
                     focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
          ))}
        </select>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Novo tema (ex.: Recursão)"
          maxLength={120}
          className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1e293b]
                     placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
        <button
          type="submit"
          disabled={isSaving || !novo.trim()}
          className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                     hover:bg-primary-dark transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? <Spinner /> : 'Adicionar'}
        </button>
      </form>

      {error && (
        <p className="text-sm text-[#dc2626] bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
      )}

      {isLoading ? (
        <p className="text-sm text-[#64748b]">Carregando…</p>
      ) : themes.length === 0 ? (
        <p className="text-sm text-[#64748b]">Nenhum tema cadastrado para esta matéria ainda.</p>
      ) : (
        <ul className="divide-y divide-slate-100 border border-[#cfe0da] rounded-xl overflow-hidden">
          {themes.map((t) => (
            <li key={t.id} className="flex items-center justify-between px-4 py-3 bg-white">
              <span className="text-sm text-[#1e293b]">{t.nome}</span>
              <button
                onClick={() => handleDelete(t.id)}
                title="Remover tema"
                aria-label={`Remover ${t.nome}`}
                className="p-1.5 rounded-lg text-[#94a3b8] hover:text-[#dc2626] hover:bg-red-50 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default ThemeManager;
