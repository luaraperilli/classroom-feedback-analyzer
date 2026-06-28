import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getMyFeedbacks, getSubjects } from '../../services/api';
import { getSentimentLabel, getWeekLabel } from '../../utils/sentiment';
import { translateSubject } from '../../utils/translations';
import { tokenizeAndScore } from '../../utils/wordHighlight';
import SentimentTrendChart from '../../components/SentimentTrendChart';

const SENTIMENT_META = {
  positivo: { label: 'Positivo', color: '#059669', bg: 'bg-emerald-50', ring: 'ring-emerald-200', text: 'text-[#059669]', dot: 'bg-[#059669]' },
  neutro:   { label: 'Neutro',   color: '#64748b', bg: 'bg-slate-50', ring: 'ring-slate-200', text: 'text-[#64748b]', dot: 'bg-[#64748b]' },
  negativo: { label: 'Negativo', color: '#dc2626', bg: 'bg-red-50',   ring: 'ring-red-200',   text: 'text-[#dc2626]', dot: 'bg-[#dc2626]' },
};


function HighlightedText({ text, tokenAttributions }) {
  const tokens = tokenizeAndScore(text, tokenAttributions || null);
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
          <h3 className="text-base font-semibold text-[#1e293b]">Como lemos o seu comentário</h3>
        </div>
        <p className="text-sm text-[#475569] leading-relaxed">
          Para te ajudar a refletir, destacamos as palavras do seu comentário que mais pesaram na forma como ele foi percebido.
        </p>
        <div className="bg-bg rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: 'rgba(5,150,105,0.35)' }} />
            <span className="text-[#475569]"><span className="font-medium text-[#059669]">Verde</span> — puxou o resultado para o lado positivo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="w-4 h-4 rounded-sm flex-shrink-0" style={{ background: 'rgba(220,38,38,0.35)' }} />
            <span className="text-[#475569]"><span className="font-medium text-[#dc2626]">Vermelho</span> — puxou para o lado negativo</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#475569]">Quanto <span className="font-medium text-[#1e293b]">mais forte a cor</span>, mais aquela palavra influenciou o resultado.</span>
          </div>
        </div>
        <p className="text-sm text-[#64748b] leading-relaxed">
          O destaque é gerado automaticamente a partir do seu texto e serve para você enxergar como a sua escrita reflete a sua experiência com a disciplina.
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
      <span className="text-sm font-medium text-[#475569]">O que mais pesou no resultado:</span>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-sm text-[#475569]">
          <span className="w-14 h-3 rounded-sm inline-block" style={{
            background: 'linear-gradient(to right, rgba(5,150,105,0.08), rgba(5,150,105,0.5))'
          }} />
          Positivo
        </span>
        <span className="flex items-center gap-1.5 text-sm text-[#475569]">
          <span className="w-14 h-3 rounded-sm inline-block" style={{
            background: 'linear-gradient(to right, rgba(220,38,38,0.08), rgba(220,38,38,0.5))'
          }} />
          Negativo
        </span>
      </div>
      <button
        onClick={onInfo}
        className="ml-auto flex items-center gap-1 text-sm text-primary hover:text-primary-dark transition"
        title="Entender como funciona"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
        </svg>
        Como funciona?
      </button>
    </div>
  );
}

function SentimentBadge({ compound, showScore }) {
  const label = getSentimentLabel(compound);
  const meta = SENTIMENT_META[label];
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ring-1 ${meta.bg} ${meta.ring} ${meta.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {showScore && compound !== null && compound !== undefined && (
        <span className="text-sm font-mono text-[#64748b]">
          {compound > 0 ? '+' : ''}{compound.toFixed(2)}
        </span>
      )}
    </div>
  );
}

function ScoreBar({ score }) {
  const pct = Math.round(score * 100);
  const color = score >= 0.6 ? '#059669' : score >= 0.4 ? '#f59e0b' : '#dc2626';
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

function SentimentFace({ label, className }) {
  const mouth = {
    positivo: 'M8.5 14.5a4.5 4.5 0 0 0 7 0',
    neutro:   'M8.5 14.75h7',
    negativo: 'M15.5 15.5a4.5 4.5 0 0 0-7 0',
  }[label] || 'M8.5 14.75h7';
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9.25" />
      <path strokeLinecap="round" d="M9 10h.01M15 10h.01" />
      <path strokeLinecap="round" strokeLinejoin="round" d={mouth} />
    </svg>
  );
}

function StatCard({ icon, tint, value, valueClass, label }) {
  return (
    <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_12px_28px_rgba(13,98,92,0.10)] p-5 flex items-center gap-4 transition-transform hover:-translate-y-0.5">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${tint}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className={`text-2xl font-bold leading-none ${valueClass || 'text-[#0f172a]'}`}>{value}</p>
        <p className="text-sm text-[#475569] mt-1.5">{label}</p>
      </div>
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
  const avgScore = feedbacks.reduce((a, b) => a + b.overall_score, 0) / feedbacks.length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        tint="bg-primary/10"
        valueClass="text-primary"
        value={feedbacks.length}
        label="Feedbacks enviados"
        icon={
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        }
      />
      <StatCard
        tint={avgMeta ? avgMeta.bg : 'bg-slate-100'}
        valueClass={avgMeta ? avgMeta.text : 'text-[#64748b]'}
        value={avgMeta ? avgMeta.label : '--'}
        label="Sentimento médio"
        icon={<SentimentFace label={avgLabel || 'neutro'} className={`w-7 h-7 ${avgMeta ? avgMeta.text : 'text-[#64748b]'}`} />}
      />
      <StatCard
        tint="bg-amber-50"
        valueClass="text-[#0f172a]"
        value={(avgScore * 4 + 1).toFixed(1)}
        label="Nota média"
        icon={
          <svg className="w-6 h-6 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 9.771c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        }
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-surface rounded-2xl border border-[#cfe0da] p-4 animate-pulse">
            <div className="h-7 bg-slate-100 rounded-lg w-12 mx-auto mb-2" />
            <div className="h-3 bg-slate-100 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
      <div className="bg-surface rounded-2xl border border-[#cfe0da] p-6 animate-pulse space-y-3">
        <div className="h-4 bg-slate-100 rounded w-1/4" />
        <div className="h-40 bg-slate-100 rounded-xl" />
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-surface rounded-2xl border border-[#cfe0da] p-4 animate-pulse flex justify-between items-center">
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
  const attributions = fb.token_attributions || fb.shap_attributions;

  return (
    <div
      className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_12px_28px_rgba(13,98,92,0.11)] overflow-hidden transition-shadow hover:shadow-[0_4px_24px_rgba(0,0,0,0.11)]"
      style={{ borderLeftWidth: 4, borderLeftColor: meta.color }}
    >
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ${meta.bg} ${meta.ring}`}>
            <SentimentFace label={label} className={`w-5 h-5 ${meta.text}`} />
          </span>
          <span className="text-sm font-semibold text-[#1e293b]">{translateSubject(fb.subject)}</span>
          <SentimentBadge compound={fb.compound} />
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-[#64748b]">{date}</span>
          <svg
            className={`w-4 h-4 text-[#64748b] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: expanded ? '900px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div className="px-5 pb-5 space-y-4 border-t border-slate-50 pt-4">
          {fb.additional_comment && (
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.05] to-transparent border border-primary/10 p-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Como suas palavras foram percebidas</p>
              <blockquote className="text-sm text-[#1e293b] leading-relaxed bg-white rounded-xl px-4 py-3 border border-[#cfe0da]">
                <HighlightedText text={fb.additional_comment} tokenAttributions={attributions} />
              </blockquote>
              <ExplainabilityLegend onInfo={onInfo} />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-[#64748b] uppercase tracking-wide mb-2">Avaliação Geral da Aula</p>
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
    <div className="min-h-screen bg-[#cde0d9]">
      {showModal && <ExplainabilityModal onClose={() => setShowModal(false)} />}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-primary-dark rounded-2xl p-6 sm:p-7 relative overflow-hidden shadow-[0_14px_30px_rgba(13,98,92,0.18)]">
          <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full bg-white/5" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">Meu Progresso</h1>
              <p className="text-white/80 text-sm mt-1.5">Olá, {displayName} — acompanhe sua evolução nas disciplinas.</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="subject-filter" className="text-sm text-white/80">Matéria:</label>
              <select
                id="subject-filter"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-white/25 text-sm text-white bg-white/15
                           focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer [&>option]:text-[#1e293b]"
              >
                <option value="">Todas</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {isLoading && <Skeleton />}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && feedbacks.length === 0 && (
          <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <p className="text-[#475569] mb-4 font-medium">Você ainda não enviou nenhum feedback.</p>
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
          <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-6 space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-[#059669] bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Feedback enviado com sucesso!
            </div>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold text-[#1e293b]">Resultado do Feedback</h2>
              <SentimentBadge compound={latestFeedback.compound} />
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary/[0.05] to-transparent border border-primary/10 p-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide mb-2">Como suas palavras foram percebidas</p>
              <blockquote className="text-sm text-[#1e293b] leading-relaxed bg-white rounded-xl px-4 py-3 border border-[#cfe0da]">
                <HighlightedText
                  text={latestFeedback.additional_comment}
                  tokenAttributions={latestFeedback.token_attributions || latestFeedback.shap_attributions}
                />
              </blockquote>
              <ExplainabilityLegend onInfo={() => setShowModal(true)} />
            </div>
            <div>
              <p className="text-sm font-medium text-[#64748b] uppercase tracking-wide mb-2">Avaliação Geral da Aula</p>
              <ScoreBar score={latestFeedback.overall_score} />
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-[#475569]
                         hover:bg-bg transition font-medium"
            >
              Enviar Outro Feedback
            </button>
          </div>
        )}

        {/* Chart */}
        {!isLoading && !error && (
          <div className="bg-surface rounded-2xl border border-[#cfe0da] shadow-[0_14px_30px_rgba(13,98,92,0.12)] p-6">
            <h2 className="text-base font-semibold text-[#1e293b] mb-0.5">Evolução do Sentimento</h2>
            <p className="text-sm text-[#64748b] mb-6">
              Média semanal do sentimento dos seus comentários (-1 negativo, +1 positivo)
            </p>
            {weeksWithData < 2 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                  </svg>
                </div>
                <p className="text-sm text-[#475569] font-medium">Continue enviando feedbacks para ver sua evolução</p>
                <p className="text-sm text-[#64748b]">São necessários registros em pelo menos 2 semanas diferentes.</p>
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
              <span className="text-sm text-[#64748b]">{feedbacks.length} registro{feedbacks.length !== 1 ? 's' : ''}</span>
            </div>
            <p className="text-sm text-[#64748b]">
              Toque em um feedback para ver quais palavras do seu comentário mais pesaram no resultado.
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
