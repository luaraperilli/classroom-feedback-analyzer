import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, analyzeFeedback, getThemes } from '../../services/api';
import Spinner from '../../components/Spinner';
import AnalyzingModal from '../../components/AnalyzingModal';

const MAX_COMMENT = 400;

const QUESTIONS = [
  { id: 'active_participation',  label: 'Participo ativamente das aulas e atividades.'    },
  { id: 'task_completion',       label: 'Cumpro as tarefas e prazos com regularidade.'    },
  { id: 'motivation_interest',   label: 'Me sinto motivado pelos conteúdos da disciplina.' },
  { id: 'welcoming_environment', label: 'O ambiente de aula é acolhedor e me estimula.'   },
  { id: 'comprehension_effort',  label: 'Me dedico a entender os conceitos apresentados.' },
  { id: 'content_connection',    label: 'Consigo conectar o conteúdo com a prática.'      },
];

const RATING_LABELS = ['', 'Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

const STEP_LABELS = ['Matéria', 'Avaliação', 'Comentário'];


function StepIndicator({ current }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, i) => {
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all
                ${done   ? 'bg-[#059669] text-white' :
                  active ? 'bg-primary text-white ring-4 ring-primary/20' :
                           'bg-slate-100 text-[#475569]'}`}>
                {done ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : i + 1}
              </div>
              <span className={`text-sm font-medium ${done || active ? 'text-[#1e293b]' : 'text-[#64748b]'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 w-16 mb-4 mx-1 transition-colors ${done ? 'bg-[#059669]' : 'bg-slate-100'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}


function LikertQuestion({ question, value, onChange }) {
  return (
    <div className="py-4 first:pt-2 last:pb-1">
      <p className="text-sm text-[#1e293b] font-medium mb-3">{question.label}</p>
      <div className="flex gap-2 justify-between">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(question.id, n)}
            title={RATING_LABELS[n]}
            className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all
              ${value === n
                ? 'bg-primary border-primary text-white shadow-[0_4px_8px_-2px_rgba(15,118,110,0.30)] scale-105'
                : 'border-slate-200 text-[#475569] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.10),0_1px_2px_rgba(16,24,40,0.06)] hover:border-primary/60 hover:text-primary hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12),0_2px_4px_-2px_rgba(16,24,40,0.06)]'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={`text-sm text-center mt-2 transition-opacity ${value ? 'text-[#475569] opacity-100' : 'opacity-0'}`}>
        {RATING_LABELS[value] || '—'}
      </p>
    </div>
  );
}


function RatingProgress({ answered, total }) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-end mb-1.5">
        <span className="text-sm font-semibold text-primary">{answered} de {total} perguntas</span>
      </div>
      <div className="h-3 bg-primary/15 rounded-full overflow-hidden ring-1 ring-primary/10">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(answered / total) * 100}%` }}
        />
      </div>
      <p className="text-sm text-[#64748b] mt-1.5">Responda tocando em uma nota (1 a 5) em cada pergunta abaixo.</p>
    </div>
  );
}


function CommentField({ value, onChange, disabled }) {
  const remaining = MAX_COMMENT - value.length;
  const isNearLimit = remaining < 60;

  return (
    <div className="bg-surface rounded-2xl border border-[#bcd5cd] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6">
      <label htmlFor="comment" className="block text-sm font-semibold text-[#1e293b] mb-1">
        Como foi a aula pra você hoje?
      </label>
      <p className="text-sm text-[#64748b] mb-3">
        Escreva livremente — suas palavras serão analisadas e as mais relevantes serão destacadas no resultado.
      </p>
      <textarea
        id="comment"
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_COMMENT))}
        rows={4}
        required
        disabled={disabled}
        placeholder="Fique à vontade para compartilhar o que quiser: o ritmo, o conteúdo e/ou como você se sentiu."
        className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm text-[#1e293b]
                   placeholder:text-[#64748b] focus:outline-none focus:ring-2 focus:ring-primary/30
                   focus:border-primary resize-none transition"
      />
      <div className="flex justify-end mt-1.5">
        <span className={`text-sm transition-colors ${isNearLimit ? 'text-amber-500 font-medium' : 'text-[#64748b]'}`}>
          {remaining} caracteres restantes
        </span>
      </div>
    </div>
  );
}


function FeedbackForm() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects]   = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(true);
  const [themes, setThemes]       = useState([]);
  const [temaId, setTemaId]       = useState('');
  const [ratings, setRatings]     = useState({});
  const [comment, setComment]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const { accessToken, user, logout, refreshAccessToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    setSubjectsLoading(true);
    getSubjects(accessToken)
      .then((data) => { if (!cancelled) setSubjects(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSubjectsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken]);

  // ao trocar de matéria, carrega os temas daquela matéria (definidos pelo professor)
  useEffect(() => {
    setTemaId('');
    if (!accessToken || !subjectId) { setThemes([]); return; }
    let cancelled = false;
    getThemes(subjectId, accessToken)
      .then((data) => { if (!cancelled) setThemes(Array.isArray(data) ? data : []); })
      .catch(() => { if (!cancelled) setThemes([]); });
    return () => { cancelled = true; };
  }, [subjectId, accessToken]);

  const answeredCount = QUESTIONS.filter((q) => ratings[q.id]).length;
  const allAnswered   = answeredCount === QUESTIONS.length;
  const temaOk        = themes.length === 0 || !!temaId;   // se há temas, escolher um é obrigatório
  const isValid       = !!subjectId && temaOk && allAnswered && comment.trim() !== '';
  const currentStep   = !subjectId ? 0 : !allAnswered ? 1 : 2;

  const displayName = user?.first_name || user?.username;

  const handleSubmit = async (e, retry = false) => {
    if (e) e.preventDefault();
    if (!isValid || !accessToken) return;

    setIsLoading(true);
    setError(null);

    const payload = {
      subject_id:            parseInt(subjectId),
      tema_id:               temaId ? parseInt(temaId) : null,
      active_participation:  ratings.active_participation,
      task_completion:       ratings.task_completion,
      motivation_interest:   ratings.motivation_interest,
      welcoming_environment: ratings.welcoming_environment,
      comprehension_effort:  ratings.comprehension_effort,
      content_connection:    ratings.content_connection,
      additional_comment:    comment.trim(),
    };

    try {
      const data = await analyzeFeedback(payload, accessToken);
      navigate('/historico', { state: { latest: data } });
    } catch (err) {
      if (err.message.includes('401') && !retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return handleSubmit(null, true);
        logout();
        setError('Sessão expirada. Por favor, faça login novamente.');
      } else {
        setError(err.message || 'Não foi possível enviar. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#cde0d9]">
      {isLoading && <AnalyzingModal />}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-[0_20px_24px_-4px_rgba(16,24,40,0.14),0_8px_8px_-4px_rgba(16,24,40,0.04)] mb-6">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Olá, {displayName}!</h1>
            <p className="text-white/80 text-sm mt-1.5">Como foi a aula de hoje? Sua opinião ajuda a melhorar a disciplina.</p>
          </div>
        </div>

        <StepIndicator current={currentStep} />

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Step 1 — Subject chips */}
          <div className="bg-surface rounded-2xl border border-[#bcd5cd] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6">
            <p className="text-sm font-semibold text-[#1e293b] mb-3">
              Qual matéria você quer avaliar?
            </p>
            {subjectsLoading ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[42px] rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-[#64748b]">Nenhuma matéria disponível.</p>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {subjects.map((s) => {
                  const selected = String(subjectId) === String(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isLoading}
                      onClick={() => setSubjectId(String(s.id))}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                        ${selected
                          ? 'bg-primary border-primary text-white shadow-[0_4px_8px_-2px_rgba(15,118,110,0.30)]'
                          : 'border-slate-200 text-[#475569] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.10),0_1px_2px_rgba(16,24,40,0.06)] hover:border-primary/50 hover:text-primary hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12),0_2px_4px_-2px_rgba(16,24,40,0.06)]'}`}
                    >
                      {translateSubject(s.name)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {subjectId && (
            <>
              {/* Tema da aula (se o professor cadastrou temas para a matéria) */}
              {themes.length > 0 && (
                <div className="bg-surface rounded-2xl border border-[#bcd5cd] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6">
                  <p className="text-sm font-semibold text-[#1e293b] mb-1">Qual foi o tema desta aula?</p>
                  <p className="text-sm text-[#64748b] mb-3">Isso ajuda você, depois, a lembrar como se sentiu em cada assunto.</p>
                  <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                    {themes.map((t) => {
                      const selected = String(temaId) === String(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={isLoading}
                          onClick={() => setTemaId(String(t.id))}
                          className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all
                            ${selected
                              ? 'bg-primary border-primary text-white shadow-[0_4px_8px_-2px_rgba(15,118,110,0.30)]'
                              : 'border-slate-200 text-[#475569] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.10),0_1px_2px_rgba(16,24,40,0.06)] hover:border-primary/50 hover:text-primary hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12),0_2px_4px_-2px_rgba(16,24,40,0.06)]'}`}
                        >
                          {t.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2 — Likert (card único com todas as perguntas) */}
              <div className="bg-surface rounded-2xl border border-[#bcd5cd] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6">
                <h2 className="text-base font-semibold text-[#1e293b] mb-1">Como você se sentiu nesta aula?</h2>
                <p className="text-sm text-[#475569] mb-4">1 = discordo totalmente &nbsp;·&nbsp; 5 = concordo totalmente</p>
                <RatingProgress answered={answeredCount} total={QUESTIONS.length} />
                <div className="divide-y divide-slate-100">
                  {QUESTIONS.map((q) => (
                    <LikertQuestion
                      key={q.id}
                      question={q}
                      value={ratings[q.id]}
                      onChange={(id, val) => setRatings((prev) => ({ ...prev, [id]: val }))}
                    />
                  ))}
                </div>
              </div>

              {/* Step 3 — Comment */}
              <CommentField value={comment} onChange={setComment} disabled={isLoading} />

              {/* Retorno de erro — ao lado do botão, onde o usuário está olhando */}
              {error && (
                <div role="alert" className="flex items-start gap-3 text-sm text-[#dc2626] bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !isValid}
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)]"
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2"><Spinner /> Analisando seu comentário...</span>
                ) : 'Enviar Feedback'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default FeedbackForm;
