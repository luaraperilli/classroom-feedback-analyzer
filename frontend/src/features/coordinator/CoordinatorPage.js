import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, getProfessors, createSubject, assignSubjectToProfessor } from '../../services/api';

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-8 space-y-5">
      <div>
        <h2 className="text-base font-semibold text-[#1e293b]">{title}</h2>
        {subtitle && <p className="text-xs text-[#94a3b8] mt-0.5">{subtitle}</p>}
      </div>
      <div className="border-t border-slate-100" />
      {children}
    </div>
  );
}

function StatusMessage({ message, error }) {
  if (error) return (
    <p className="text-sm text-negative bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">{error}</p>
  );
  if (message) return (
    <p className="text-sm text-positive bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">{message}</p>
  );
  return null;
}

function SelectInput({ value, onChange, required, children, placeholder }) {
  return (
    <select
      value={value}
      onChange={onChange}
      required={required}
      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1e293b]
                 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary
                 transition cursor-pointer"
    >
      <option value="" disabled>{placeholder}</option>
      {children}
    </select>
  );
}

function CoordinatorPage() {
  const [subjectName, setSubjectName]           = useState('');
  const [subjects, setSubjects]                 = useState([]);
  const [professors, setProfessors]             = useState([]);
  const [selectedProfessor, setSelectedProfessor] = useState('');
  const [selectedSubject, setSelectedSubject]   = useState('');
  const [message, setMessage]                   = useState('');
  const [error, setError]                       = useState('');
  const [isCreating, setIsCreating]             = useState(false);
  const [isAssigning, setIsAssigning]           = useState(false);

  const { accessToken } = useAuth();

  const fetchInitialData = useCallback(async (cancelled = { current: false }) => {
    try {
      const [subjectsData, professorsData] = await Promise.all([
        getSubjects(accessToken),
        getProfessors(accessToken),
      ]);
      if (!cancelled.current) {
        setSubjects(subjectsData);
        setProfessors(professorsData);
      }
    } catch {
      if (!cancelled.current) setError('Falha ao carregar dados iniciais.');
    }
  }, [accessToken]);

  useEffect(() => {
    const cancelled = { current: false };
    fetchInitialData(cancelled);
    return () => { cancelled.current = true; };
  }, [fetchInitialData]);

  const showFeedback = (msg, isError = false) => {
    setMessage('');
    setError('');
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 4000);
  };

  const handleCreateSubject = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const data = await createSubject(subjectName, accessToken);
      showFeedback(`Matéria "${data.name}" criada com sucesso.`);
      setSubjectName('');
      fetchInitialData();
    } catch (err) {
      showFeedback(err.message, true);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAssignSubject = async (e) => {
    e.preventDefault();
    setIsAssigning(true);
    try {
      const data = await assignSubjectToProfessor(selectedSubject, selectedProfessor, accessToken);
      showFeedback(data.message);
      setSelectedProfessor('');
      setSelectedSubject('');
    } catch (err) {
      showFeedback(err.message, true);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[#1e293b]">Gestão</h1>
          <p className="text-sm text-[#64748b] mt-0.5">Área do Coordenador</p>
        </div>

        {/* Global status */}
        <StatusMessage message={message} error={error} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* ── Create subject ─────────────────────────────────────────────── */}
          <SectionCard
            title="Cadastrar Matéria"
            subtitle="Adicione uma nova disciplina ao sistema."
          >
            <form onSubmit={handleCreateSubject} className="space-y-4">
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Nome da matéria"
                required
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1e293b]
                           placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                           focus:border-primary transition"
              />
              <button
                type="submit"
                disabled={isCreating || !subjectName.trim()}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Criando...' : 'Criar Matéria'}
              </button>
            </form>

            {/* Subjects list */}
            {subjects.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">
                  Matérias cadastradas ({subjects.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {subjects.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-sm text-[#1e293b]"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
                      {translateSubject(s.name)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

          {/* ── Assign professor ───────────────────────────────────────────── */}
          <SectionCard
            title="Vincular Professor à Matéria"
            subtitle="Atribua um professor a uma disciplina específica."
          >
            <form onSubmit={handleAssignSubject} className="space-y-4">
              <SelectInput
                value={selectedProfessor}
                onChange={(e) => setSelectedProfessor(e.target.value)}
                required
                placeholder="Selecione um professor"
              >
                {professors.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.display_name || p.username}
                  </option>
                ))}
              </SelectInput>

              <SelectInput
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
                placeholder="Selecione uma matéria"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {translateSubject(s.name)}
                  </option>
                ))}
              </SelectInput>

              <button
                type="submit"
                disabled={isAssigning || !selectedProfessor || !selectedSubject}
                className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? 'Vinculando...' : 'Vincular Matéria'}
              </button>
            </form>

            {/* Professors list */}
            {professors.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide">
                  Professores ({professors.length})
                </p>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {professors.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg text-sm text-[#1e293b]"
                    >
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] font-bold text-primary">
                          {(p.display_name || p.username)?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <span className="flex-1 min-w-0 truncate">{p.display_name || p.username}</span>
                      {p.subject_count === 0 && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 flex-shrink-0">
                          Sem matéria
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>

        </div>
      </div>
    </div>
  );
}

export default CoordinatorPage;
