import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMyFeedbacks, getSubjects } from '../../services/api';
import { getSentimentLabel, getWeekLabel } from '../../utils/sentiment';
import { translateSubject } from '../../utils/translations';
import { tokenizeAndScore } from '../../utils/wordHighlight';
import SentimentTrendChart from '../../components/SentimentTrendChart';

const SENTIMENT_META = {
  positivo: { label: 'Positivo', color: '#16a34a', bg: 'bg-green-50', ring: 'ring-green-200', text: 'text-[#16a34a]', dot: 'bg-[#16a34a]' },
  neutro:   { label: 'Neutro',   color: '#6b7280', bg: 'bg-slate-50', ring: 'ring-slate-200', text: 'text-[#6b7280]', dot: 'bg-[#6b7280]' },
  negativo: { label: 'Negativo', color: '#dc2626', bg: 'bg-red-50',   ring: 'ring-red-200',   text: 'text-[#dc2626]', dot: 'bg-[#dc2626]' },
};


function HighlightedText({ text }) {
  const tokens = tokenizeAndScore(text);
  return (
    <span className="leading-relaxed">
      {tokens.map(({ token, style }, i) =>
        style
          ? <mark key={i} style={{ ...style, backgroundColor: style.backgroundColor }} className="bg-transparent rounded-sm">{token}</mark>
          : <span key={i}>{token}</span>
      )}
    </span>
  );
}

function ExplainabilityModal({ onClose }) {
  const ref = useRef();
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div ref={ref} className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-[#1e293b]">Como funciona o destaque?</h3>
        </div>
        <p className="text-sm text-[#64748b] leading-relaxed">
          O sistema analisa cada palavra do seu comentário e identifica quais mais influenciaram a classificação do sentimento.
        </p>
        <div className="bg-bg rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: 'rgba(22,163,74,0.35)' }} />
            <span className="text-[#64748b]"><span className="font-medium text-[#16a34a]">Verde</span> — palavra com impacto positivo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: 'rgba(220,38,38,0.35)' }} />
            <span className="text-[#64748b]"><span className="font-medium text-[#dc2626]">Vermelho</span> — palavra com impacto negativo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#64748b]">A <span className="font-medium text-[#1e293b]">intensidade da cor</span> indica o peso da palavra — cores mais fortes = maior influência.</span>
          </div>
        </div>
        <p className="text-xs text-[#94a3b8]">
          Essa explicação é uma aproximação visual das técnicas SHAP e LIME, usadas para tornar a análise de sentimentos mais transparente.
        </p>
        <button
          onClick={onClose}
          className="w-full py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}

function ExplainabilityLegend({ onInfo }) {
  return (
    <div className="flex items-center gap-6 flex-wrap mt-2">
      <span className="text-xs font-medium text-[#64748b]">Influência na Classificação:</span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-xs text-[#64748b]">
          <span className="w-14 h-3 rounded-sm inline-block" style={{
            background: 'linear-gradient(to right, rgba(22,163,74,0.08), rgba(22,163,74,0.5))'
          }} />
          Positiva
        </span>
        <span className="flex items-center gap-1.5 text-xs text-[#64748b]">
          <span className="w-14 h-3 rounded-sm inline-block" style={{
            background: 'linear-gradient(to right, rgba(220,38,38,0.08), rgba(220,38,38,0.5))'
          }} />
          Negativa
        </span>
      </div>
      <button
        onClick={onInfo}
        className="ml-auto flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition"
        title="Entender como funciona"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
        Como Funciona?
      </button>
    </div>
  );
}

function SentimentBadge({ compound, showScore }) {
  const label = getSentimentLabel(compound);
  const meta = SENTIMENT_META[label];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${meta.bg} ${meta.ring} ${meta.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {showScore && compound !== null && compound !== undefined && (
        <span className="text-xs font-mono text-[#94a3b8]">
          {compound > 0 ? '+' : ''}{compound.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function ScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.6 ? '#16a34a' : score >= 0.4 ? '#f59e0b' : '#dc2626';
  const display = (score * 4 + 1).toFixed(1);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-semibold min-w-[3rem] text-right" style={{ color }}>{display}/5</span>
    </div>
  );
}

function SummaryCard({ feedbacks }) {
  if (!feedbacks.length) return null;

  const withSentiment = feedbacks.filter((f) => f.compound !== null && f.compound !== undefined);
  const avgCompound = withSentiment.length
    ? withSentiment.reduce((a, b) => a + b.compound, 0) / withSentiment.length
    : null;
  const avgLabel = avgCompound !== null ? getSentimentLabel(avgCompound) : null;
  const avgMeta  = avgLabel ? SENTIMENT_META[avgLabel] : null;

  const lastDate = new Date(feedbacks[feedbacks.length - 1].created_at)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const avgScore = feedbacks.reduce((a, b) => a + b.overall_score, 0) / feedbacks.length;

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4">
      <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 text-center">
        <p className="text-2xl font-bold text-primary">{feedbacks.length}</p>
        <p className="text-xs text-[#64748b] mt-1">Feedbacks enviados</p>
      </div>
      <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 text-center">
        {avgMeta ? (
          <>
            <p className={`text-lg font-bold ${avgMeta.text}`}>{avgMeta.label}</p>
            <p className="text-xs font-mono text-[#94a3b8]">
              {avgCompound > 0 ? '+' : ''}{avgCompound.toFixed(2)}
            </p>
          </>
        ) : (
          <p className="text-lg font-bold text-[#94a3b8]">--</p>
        )}
        <p className="text-xs text-[#64748b] mt-1">Sentimento médio</p>
      </div>
      <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] p-4 text-center">
        <p className="text-lg font-bold text-[#1e293b]">{(avgScore * 4 + 1).toFixed(1)}</p>
        <p className="text-xs text-[#94a3b8]">Último: {lastDate}</p>
        <p className="text-xs text-[#64748b] mt-1">Nota média</p>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl border border-slate-100 p-4 animate-pulse">
            <div className="h-7 bg-slate-100 rounded-lg w-12 mx-auto mb-2" />
            <div className="h-3 bg-slate-100 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-2xl border border-slate-100 p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/4" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-slate-100 p-4 animate-pulse flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-4 bg-slate-100 rounded w-32" />
            <div className="h-3 bg-slate-100 rounded w-20" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-16" />
        </div>
      ))}
    </div>
  );
}

// Count unique weeks with sentiment data (used to decide whether to show chart)
function countWeeksWithData(feedbacks) {
  const weeks = new Set(
    feedbacks
      .filter((fb) => fb.compound !== null && fb.compound !== undefined)
      .map((fb) => getWeekLabel(fb.created_at))
  );
  return weeks.size;
}

function FeedbackCard({ fb, defaultOpen, onInfo }) {
  const [expanded, setExpanded] = useState(defaultOpen);
  const label = getSentimentLabel(fb.compound);
  const meta  = SENTIMENT_META[label];
  const date  = new Date(fb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div
      className="bg-surface rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.11)]"
      style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
    >
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-semibold text-[#1e293b]">{translateSubject(fb.subject)}</span>
          <SentimentBadge compound={fb.compound} showScore />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-[#94a3b8]">{date}</span>
          <svg
            className={`w-4 h-4 text-[#94a3b8] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '600px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div className="px-5 pb-5 space-y-4 border-t border-slate-50 pt-4">
          {fb.additional_comment && (
            <div>
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">O que você escreveu</p>
              <blockquote className="text-sm text-[#1e293b] leading-relaxed bg-bg rounded-xl px-4 py-3 border-l-4 border-primary/30">
                <HighlightedText text={fb.additional_comment} />
              </blockquote>
              <ExplainabilityLegend onInfo={onInfo} />
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">Avaliação Geral da Aula</p>
            <ScoreBar score={fb.overall_score} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentHistory() {
  const { state } = useLocation();
  const navigate  = useNavigate();
  const { accessToken, user } = useAuth();

  const [feedbacks, setFeedbacks]             = useState([]);
  const [subjects, setSubjects]               = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isLoading, setIsLoading]             = useState(true);
  const [error, setError]                     = useState(null);
  const [showModal, setShowModal]             = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    getSubjects(accessToken)
      .then((data) => { if (!cancelled) setSubjects(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [accessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!accessToken) return;
    setIsLoading(true);
    getMyFeedbacks(selectedSubject || null, accessToken)
      .then((data) => { if (!cancelled) setFeedbacks(Array.isArray(data) ? data : []); })
      .catch((err) => { if (!cancelled) setError(err.message || 'Erro ao carregar histórico.'); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, selectedSubject]);

  const latestFeedback  = state?.latest ?? (feedbacks.length > 0 ? feedbacks[feedbacks.length - 1] : null);
  const weeksWithData   = countWeeksWithData(feedbacks);

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user?.display_name || user?.username;

  return (
    <div className="min-h-screen bg-bg">
      {showModal && <ExplainabilityModal onClose={() => setShowModal(false)} />}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Meu Progresso</h1>
            <p className="text-[#64748b] text-sm mt-0.5">{displayName}</p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="subject-filter" className="text-sm text-[#64748b]">Matéria:</label>
            <select
              id="subject-filter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-[#1e293b] bg-white
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="">Todas</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading && <Skeleton />}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && feedbacks.length === 0 && (
          <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-[#64748b] mb-4 font-medium">Você ainda não enviou nenhum feedback.</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-dark transition"
            >
              Enviar o Primeiro
            </button>
          </div>
        )}

        {!isLoading && !error && feedbacks.length > 0 && (
          <SummaryCard feedbacks={feedbacks} />
        )}

        {/* Just-submitted result */}
        {!isLoading && !error && state?.latest && (
          <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-[#1e293b]">Resultado do Feedback</h2>
              <SentimentBadge compound={latestFeedback.compound} showScore />
            </div>
            <div>
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">O que você escreveu</p>
              <blockquote className="text-sm text-[#1e293b] leading-relaxed bg-bg rounded-xl px-4 py-3 border-l-4 border-primary/30">
                <HighlightedText text={latestFeedback.additional_comment} />
              </blockquote>
              <ExplainabilityLegend onInfo={() => setShowModal(true)} />
            </div>
            <div>
              <p className="text-xs font-medium text-[#94a3b8] uppercase tracking-wide mb-2">Avaliação Geral da Aula</p>
              <ScoreBar score={latestFeedback.overall_score} />
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-[#64748b]
                         hover:bg-bg transition font-medium"
            >
              Enviar Outro Feedback
            </button>
          </div>
        )}

        {/* Chart */}
        {!isLoading && !error && (
          <div className="bg-surface rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
            <h2 className="text-base font-semibold text-[#1e293b] mb-0.5">Evolução do Sentimento</h2>
            <p className="text-xs text-[#94a3b8] mb-6">
              Média semanal do sentimento dos seus comentários (-1 negativo, +1 positivo)
            </p>
            {weeksWithData < 2 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <p className="text-sm text-[#64748b] font-medium">Continue enviando feedbacks para ver sua evolução</p>
                <p className="text-xs text-[#94a3b8]">São necessários registros em pelo menos 2 semanas diferentes.</p>
              </div>
            ) : (
              <SentimentTrendChart feedbacks={feedbacks} groupBy="week" />
            )}
          </div>
        )}

        {/* History list */}
        {!isLoading && !error && feedbacks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1e293b]">Histórico de Feedbacks</h2>
              <span className="text-xs text-[#94a3b8]">{feedbacks.length} registro{feedbacks.length !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-xs text-[#94a3b8]">
              Clique em qualquer feedback para ver as palavras que mais influenciaram sua classificação.
            </p>
            {[...feedbacks].reverse().map((fb, idx) => (
              <FeedbackCard
                key={fb.id}
                fb={fb}
                defaultOpen={idx === 0 && !state?.latest}
                onInfo={() => setShowModal(true)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

export default StudentHistory;
