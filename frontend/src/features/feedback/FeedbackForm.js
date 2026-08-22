import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, analyzeFeedback, getMyFeedbacks } from '../../services/api';
import { mesmoEnvio } from '../../utils/mesmoEnvio';
import Spinner from '../../components/Spinner';
import AnalyzingModal from '../../components/AnalyzingModal';

const MAX_COMMENT = 400;

// Texto literal da Tabela 1 do artigo, baseada no modelo de engajamento de
// Fredricks et al. (2004): duas afirmações por dimensão, na ordem
// comportamental, emocional e cognitiva.
const QUESTIONS = [
  { id: 'active_participation',  label: 'Participo ativamente das aulas e das atividades propostas pelo professor.' },
  { id: 'task_completion',       label: 'Cumpro as tarefas e os prazos estabelecidos na disciplina com regularidade.' },
  { id: 'motivation_interest',   label: 'Sinto-me motivado(a) e interessado(a) nos conteúdos abordados nesta disciplina.' },
  { id: 'welcoming_environment', label: 'Sinto que o ambiente de aula é acolhedor e me estimula a continuar participando.' },
  { id: 'comprehension_effort',  label: 'Dedico tempo e esforço para compreender os conceitos apresentados em aula.' },
  { id: 'content_connection',    label: 'Consigo relacionar os conteúdos desta disciplina a situações práticas ou a outras matérias.' },
];

const RATING_LABELS = ['', 'Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];

const STEP_LABELS = ['Disciplina', 'Avaliação', 'Comentário'];


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
                ${done   ? 'bg-[#0f766e] text-white' :
                  active ? 'bg-primary text-white ring-4 ring-primary/20' :
                           'bg-slate-100 text-[#334155]'}`}>
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
              <div className={`h-0.5 w-16 mb-4 mx-1 transition-colors ${done ? 'bg-[#0f766e]' : 'bg-slate-100'}`} />
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
                : 'border-slate-200 text-[#334155] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.10),0_1px_2px_rgba(16,24,40,0.06)] hover:border-primary/60 hover:text-primary hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12),0_2px_4px_-2px_rgba(16,24,40,0.06)]'}`}
          >
            {n}
          </button>
        ))}
      </div>
      <p className={`text-sm text-center mt-2 transition-opacity ${value ? 'text-[#334155] opacity-100' : 'opacity-0'}`}>
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
  const [ratings, setRatings]     = useState({});
  const [comment, setComment]     = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  const { accessToken, user } = useAuth();
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

  const answeredCount = QUESTIONS.filter((q) => ratings[q.id]).length;
  const allAnswered   = answeredCount === QUESTIONS.length;
  const isValid       = !!subjectId && allAnswered && comment.trim() !== '';
  const currentStep   = !subjectId ? 0 : !allAnswered ? 1 : 2;

  const displayName = user?.first_name || user?.username;

  const handleSubmit = async (e) => {
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
      return;
    } catch (err) {
      // 409 significa que já existe feedback desta disciplina hoje — e o caso mais
      // provável é que o envio anterior tenha sido gravado e a resposta se
      // perdido no caminho. Mostrar o resultado que existe é mais verdadeiro do
      // que acusar erro por algo que deu certo.
      //
      // O mesmo raciocínio vale para o tempo limite e para a queda de conexão,
      // que chegam como status 0. O servidor grava o feedback antes de
      // responder, então perder a resposta não significa perder o envio.
      // Mandar o aluno tentar de novo sem antes conferir é o pior desfecho:
      // ou ele desiste achando que falhou, ou reenvia algo que já está salvo.
      if (err.status === 409 || err.status === 0) {
        const recuperado = await buscarEnvioDeHoje(payload.subject_id);

        // Só é o mesmo envio se o conteúdo bater. Batendo, a resposta se perdeu
        // e o trabalho da pessoa está salvo: mostrar o resultado é o certo.
        if (mesmoEnvio(recuperado, payload)) {
          navigate('/historico', { state: { latest: recuperado } });
          return;
        }

        // Não batendo, existe um feedback de hoje com outro conteúdo, e o texto
        // que ela acabou de escrever foi recusado. Levá-la para a tela de
        // confirmação aqui seria agradecer por um texto descartado, e ela sairia
        // acreditando que enviou. Diz-se a verdade, e diz-se o que fazer.
        if (recuperado) {
          setError(
            'Você já enviou um feedback para esta disciplina hoje, e o texto que você '
            + 'acabou de escrever não foi salvo. Ele continua aqui embaixo: copie antes '
            + 'de sair. Se quiser substituir o envio anterior, retire-o em Minhas '
            + 'Avaliações e envie este de novo.'
          );
          window.scrollTo({ top: 0, behavior: 'smooth' });
          return;
        }
      }

      // Chegando aqui, a verificação confirmou que nada foi gravado. Só neste
      // caso faz sentido pedir que tente de novo, e vale dizer que as respostas
      // continuam na tela, senão o aluno supõe que perdeu o que escreveu.
      setError(
        err.status === 0
          ? 'O envio não foi concluído e nada foi perdido. Suas respostas continuam preenchidas abaixo, é só tocar em Enviar Feedback de novo.'
          : err.message || 'Não foi possível enviar.'
      );
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsLoading(false);
    }
  };

  // Procura o feedback desta disciplina enviado hoje. Se a busca falhar, devolve
  // null e o fluxo cai no aviso de erro comum.
  const buscarEnvioDeHoje = async (subjectId) => {
    try {
      const meus = await getMyFeedbacks(subjectId, accessToken);
      const hoje = new Date().toDateString();
      return [...meus]
        .reverse()
        .find((fb) => new Date(fb.created_at).toDateString() === hoje) || null;
    } catch {
      return null;
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

            <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-white/15 px-4 py-3">
              <svg className="w-5 h-5 text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <p className="text-white text-sm leading-relaxed">
                <strong className="font-semibold">Sua resposta é anônima.</strong> O professor vê os comentários
                da turma sem saber quem escreveu cada um. Seu login serve apenas para o acesso à disciplina e
                para você acompanhar seu próprio histórico.
              </p>
            </div>
          </div>
        </div>

        <StepIndicator current={currentStep} />

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Step 1 — Subject chips */}
          <div className="bg-surface rounded-2xl border border-[#bcd5cd] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6">
            <p className="text-sm font-semibold text-[#1e293b] mb-3">
              Qual disciplina você quer avaliar?
            </p>
            {subjectsLoading ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-[42px] rounded-xl bg-slate-100 animate-pulse" />
                ))}
              </div>
            ) : subjects.length === 0 ? (
              <p className="text-sm text-[#64748b]">Nenhuma disciplina disponível.</p>
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
                          : 'border-slate-200 text-[#334155] bg-white shadow-[0_1px_3px_rgba(16,24,40,0.10),0_1px_2px_rgba(16,24,40,0.06)] hover:border-primary/50 hover:text-primary hover:shadow-[0_4px_8px_-2px_rgba(16,24,40,0.12),0_2px_4px_-2px_rgba(16,24,40,0.06)]'}`}
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
              {/* Step 2 — Likert (card único com todas as perguntas) */}
              <div className="bg-surface rounded-2xl border border-[#bcd5cd] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-6">
                <h2 className="text-base font-semibold text-[#1e293b] mb-1">Como você se sentiu nesta aula?</h2>
                <p className="text-sm text-[#334155] mb-4">1 = discordo totalmente &nbsp;·&nbsp; 5 = concordo totalmente</p>
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
