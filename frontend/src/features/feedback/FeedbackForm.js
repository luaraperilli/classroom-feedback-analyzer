import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, analyzeFeedback } from '../../services/api';

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
                ${done   ? 'bg-positive text-white' :
                  active ? 'bg-primary text-white ring-4 ring-primary/20' :
                           'bg-slate-100 text-[#64748b]'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className={`text-xs font-medium ${done || active ? 'text-[#1e293b]' : 'text-[#94a3b8]'}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`h-0.5 w-16 mb-4 mx-1 transition-colors ${done ? 'bg-positive' : 'bg-slate-100'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}


function LikertQuestion({ question, value, onChange }) {
  return (
    <div className="bg-bg rounded-xl p-4">
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
                ? 'bg-primary border-primary text-white shadow-md scale-105'
                : 'border-slate-200 text-[#64748b] hover:border-primary/50 hover:text-primary bg-white'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={`text-xs text-center mt-2 transition-opacity ${value ? 'text-[#64748b] opacity-100' : 'opacity-0'}`}>
        {RATING_LABELS[value] || '—'}
      </p>
    </div>
  );
}


function RatingProgress({ answered, total }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${(answered / total) * 100}%` }}
        />
      </div>
      <span className="text-xs text-[#94a3b8] flex-shrink-0">{answered}/{total} respondidas</span>
    </div>
  );
}


function CommentField({ value, onChange, disabled }) {
  const remaining = MAX_COMMENT - value.length;
  const isNearLimit = remaining < 60;

  return (
    <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
      <label htmlFor="comment" className="block text-sm font-semibold text-[#1e293b] mb-1">
        Como foi a aula pra você hoje?
      </label>
      <p className="text-xs text-[#94a3b8] mb-3">
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
                   placeholder:text-[#94a3b8] focus:outline-none focus:ring-2 focus:ring-primary/30
                   focus:border-primary resize-none transition"
      />
      <div className="flex justify-end mt-1.5">
        <span className={`text-xs transition-colors ${isNearLimit ? 'text-amber-500 font-medium' : 'text-[#94a3b8]'}`}>
          {remaining} caracteres restantes
        </span>
      </div>
    </div>
  );
}


function FeedbackForm() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects]   = useState([]);
  const [ratings, setRatings]     = useState({});
  const [comment, setComment]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const { accessToken, user, logout, refreshAccessToken } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    getSubjects(accessToken)
      .then((data) => { if (!cancelled) setSubjects(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken]);

  const answeredCount = QUESTIONS.filter((q) => ratings[q.id]).length;
  const allAnswered   = answeredCount === QUESTIONS.length;
  const isValid       = !!subjectId && allAnswered && comment.trim() !== '';
  const currentStep   = !subjectId ? 0 : !allAnswered ? 1 : 2;

  const displayName = user?.first_name || user?.username;

  const handleSubmit = async (e, retry = false) => {
    if (e) e.preventDefault();
    if (!isValid || !accessToken) return;

    setIsLoading(true);
    setError(null);

    const payload = {
      subject_id:            parseInt(subjectId),
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
    <div className="min-h-screen bg-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1e293b]">Olá, {displayName}!</h1>
          <p className="text-[#64748b] mt-1">Como foi a aula de hoje? Sua opinião importa.</p>
        </div>

        <StepIndicator current={currentStep} />

        {error && (
          <div className="mb-6 text-sm text-negative bg-red-50 border border-red-100 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Step 1 — Subject chips */}
          <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
            <p className="text-sm font-semibold text-[#1e293b] mb-3">
              Qual matéria você quer avaliar?
            </p>
            {subjects.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">Nenhuma matéria disponível.</p>
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
                          ? 'bg-primary border-primary text-white shadow-sm'
                          : 'border-slate-200 text-[#64748b] hover:border-primary/50 hover:text-primary bg-white'}`}
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
              {/* Step 2 — Likert */}
              <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
                <h2 className="text-sm font-semibold text-[#1e293b] mb-1">Como você se sentiu nesta aula?</h2>
                <p className="text-xs text-[#64748b] mb-4">1 = discordo totalmente &nbsp;·&nbsp; 5 = concordo totalmente</p>
                <RatingProgress answered={answeredCount} total={QUESTIONS.length} />
                <div className="space-y-3">
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

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !isValid}
                className="w-full py-3 rounded-xl bg-primary text-white text-sm font-semibold
                           hover:bg-primary-dark transition disabled:opacity-50 disabled:cursor-not-allowed
                           shadow-[0_4px_24px_rgba(0,0,0,0.08)]"
              >
                {isLoading ? 'Enviando...' : 'Enviar Feedback'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

export default FeedbackForm;
