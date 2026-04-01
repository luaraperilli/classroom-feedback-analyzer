import React, { useState, useEffect, useRef } from 'react';
import { useDashboardData } from './useDashboardData';
import SentimentSummary from '../../components/SentimentSummary';
import SentimentTrendChart from '../../components/SentimentTrendChart';
import RiskAnalysis from './RiskAnalysis';
import GlobalShapAnalysis from './GlobalShapAnalysis';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects } from '../../services/api';
import { getSentimentColor } from '../../utils/sentiment';

const getFeedbackBorderColor = (compound) => {
  if (compound >= 0.05) return '#16a34a';
  if (compound <= -0.05) return '#dc2626';
  return '#6b7280';
};

function FilterSelect({ id, label, value, onChange, children }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="text-sm text-slate-500 whitespace-nowrap">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0f766e]/30 focus:border-[#0f766e] text-[#1e293b]"
      >
        {children}
      </select>
    </div>
  );
}

function DateRangeModal({ onApply, onCancel, initialStart = '', initialEnd = '' }) {
  const [start, setStart] = useState(initialStart);
  const [end, setEnd]     = useState(initialEnd);
  const ref = useRef();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onCancel(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center px-4">
      <div ref={ref} className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-5">
        <div>
          <h3 className="text-base font-semibold text-[#1e293b]">Período Personalizado</h3>
          <p className="text-xs text-slate-400 mt-0.5">Selecione o intervalo de datas desejado.</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">Data Inicial</label>
            <input
              type="date"
              value={start}
              max={end || today}
              onChange={(e) => setStart(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1e293b] bg-white
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-slate-500">Data Final</label>
            <input
              type="date"
              value={end}
              min={start || undefined}
              max={today}
              onChange={(e) => setEnd(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1e293b] bg-white
                         focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500
                       hover:bg-slate-50 transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => onApply(start, end)}
            disabled={!start || !end || start > end}
            className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold
                       hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}

function SkeletonFeedbackCards() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-5 animate-pulse"
        >
          <div className="flex justify-between mb-3">
            <div className="h-4 bg-slate-200 rounded w-1/4" />
            <div className="h-3 bg-slate-100 rounded w-1/5" />
          </div>
          <div className="h-3 bg-slate-100 rounded w-2/5 mt-2" />
        </div>
      ))}
    </div>
  );
}

function MetricPill({ label, value }) {
  return (
    <span className="px-2 py-1 rounded-lg bg-[#f8fafc] text-xs text-[#64748b]">
      {label}: {value}/5
    </span>
  );
}

function FeedbackCard({ fb }) {
  const [expanded, setExpanded] = useState(false);
  const compound     = fb.compound ?? null;
  const borderColor  = getFeedbackBorderColor(compound ?? 0);
  const overallScore = (fb.overall_score * 4 + 1).toFixed(1);
  const sentimentColor = compound !== null ? getSentimentColor(compound) : '#6b7280';

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.07)] border-l-4 overflow-hidden"
      style={{ borderLeftColor: borderColor }}
    >
      <button
        className="w-full text-left px-5 py-4 flex items-start justify-between gap-4 hover:bg-slate-50/50 transition"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-[#1e293b] leading-tight">{fb.student_username}</p>
              <p className="text-xs text-slate-500 mt-0.5">{translateSubject(fb.subject)}</p>
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap shrink-0">
              {new Date(fb.created_at).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
              })}
            </span>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <span className="text-sm text-slate-600">
              Nota:{' '}
              <span className="font-semibold text-[#1e293b]">{overallScore}/5</span>
            </span>
            {compound !== null && (
              <span className="text-sm text-slate-600">
                Sentimento:{' '}
                <span className="font-semibold" style={{ color: sentimentColor }}>
                  {compound > 0 ? '+' : ''}{compound.toFixed(2)}
                </span>
              </span>
            )}
          </div>
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 mt-1 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-slate-100 pt-4 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <MetricPill label="Participação" value={fb.active_participation} />
            <MetricPill label="Tarefas"      value={fb.task_completion} />
            <MetricPill label="Motivação"    value={fb.motivation_interest} />
            <MetricPill label="Ambiente"     value={fb.welcoming_environment} />
            <MetricPill label="Esforço"      value={fb.comprehension_effort} />
            <MetricPill label="Conexão"      value={fb.content_connection} />
          </div>

          {fb.additional_comment && (
            <blockquote className="border-l-4 border-slate-200 pl-3">
              <p className="text-sm italic text-slate-600">"{fb.additional_comment}"</p>
            </blockquote>
          )}
        </div>
      )}
    </div>
  );
}

function Dashboard() {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects]               = useState([]);
  const [period, setPeriod]                   = useState('all');
  const [dateRange, setDateRange]             = useState({ startDate: null, endDate: null });
  const [customStart, setCustomStart]         = useState('');
  const [customEnd, setCustomEnd]             = useState('');
  const [showDateModal, setShowDateModal]     = useState(false);
  const [activeTab, setActiveTab]             = useState('feedbacks');
  const [visibleCount, setVisibleCount]       = useState(10);

  const [riskSubject, setRiskSubject]       = useState('');
  const [minRiskLevel, setMinRiskLevel]   = useState('medio');
  const [shapSubject, setShapSubject]     = useState('');

  const { feedbacks, isLoading, error } = useDashboardData(selectedSubject, dateRange);
  const { accessToken, user } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const fetchSubjects = async () => {
      try {
        const data = await getSubjects(accessToken);
        if (!cancelled) setSubjects(data);
      } catch {}
    };
    if (user?.role === 'professor' || user?.role === 'coordenador') fetchSubjects();
    return () => { cancelled = true; };
  }, [accessToken, user?.role]);

  useEffect(() => { setVisibleCount(10); }, [feedbacks]);

  useEffect(() => {
    if (period === 'custom') return;
    const now = new Date();
    let startDate = null;
    const endDate = new Date();

    switch (period) {
      case '7days':
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        break;
    }

    if (startDate) startDate.setHours(0, 0, 0, 0);
    setDateRange({ startDate, endDate: period === 'all' ? null : endDate });
  }, [period]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value === 'custom') setShowDateModal(true);
  };

  const handleApplyCustomRange = (start, end) => {
    const startDate = new Date(start);
    const endDate   = new Date(end);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    setCustomStart(start);
    setCustomEnd(end);
    setDateRange({ startDate, endDate });
    setShowDateModal(false);
  };

  const handleCancelDateModal = () => {
    if (!customStart && !customEnd) setPeriod('all');
    setShowDateModal(false);
  };

  const displayName = user?.display_name || user?.first_name || user?.username || '';

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {showDateModal && (
        <DateRangeModal
          initialStart={customStart}
          initialEnd={customEnd}
          onApply={handleApplyCustomRange}
          onCancel={handleCancelDateModal}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1e293b]">Dashboard</h1>
            {displayName && <p className="text-sm text-[#64748b] mt-0.5">{displayName}</p>}
          </div>

          {/* Filters — switch based on active tab */}
          <div className="flex flex-wrap items-center gap-3">
            {activeTab === 'feedbacks' ? (
              <>
                <FilterSelect
                  id="period-filter"
                  label="Período"
                  value={period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                >
                  <option value="all">Desde o início</option>
                  <option value="7days">Últimos 7 dias</option>
                  <option value="30days">Últimos 30 dias</option>
                  <option value="this_month">Este mês</option>
                  <option value="custom">Personalizado</option>
                </FilterSelect>

                {period === 'custom' && (customStart || customEnd) && (
                  <button
                    onClick={() => setShowDateModal(true)}
                    className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-primary/50 hover:text-primary transition"
                  >
                    {customStart && new Date(customStart + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    {' → '}
                    {customEnd && new Date(customEnd + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </button>
                )}

                <FilterSelect
                  id="subject-filter"
                  label="Matéria"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">Todas</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
                  ))}
                </FilterSelect>
              </>
            ) : activeTab === 'risk' ? (
              <>
                <FilterSelect
                  id="risk-subject-filter"
                  label="Matéria"
                  value={riskSubject}
                  onChange={(e) => setRiskSubject(e.target.value)}
                >
                  <option value="">Todas as matérias</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
                  ))}
                </FilterSelect>

                <FilterSelect
                  id="risk-level-filter"
                  label="Nível mínimo"
                  value={minRiskLevel}
                  onChange={(e) => setMinRiskLevel(e.target.value)}
                >
                  <option value="baixo">Baixo e acima</option>
                  <option value="medio">Moderado e acima</option>
                  <option value="alto">Apenas alto risco</option>
                </FilterSelect>
              </>
            ) : (
              <FilterSelect
                id="shap-subject-filter"
                label="Matéria"
                value={shapSubject}
                onChange={(e) => setShapSubject(e.target.value)}
              >
                <option value="">Todas as matérias</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>
                ))}
              </FilterSelect>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white rounded-2xl border border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-1 w-fit">
          {[
            { id: 'feedbacks', label: 'Feedbacks' },
            { id: 'risk',      label: 'Análise de Risco' },
            { id: 'shap',      label: 'Explicabilidade' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={
                activeTab === tab.id
                  ? 'bg-[#0f766e] text-white rounded-xl px-4 py-2 text-sm font-semibold transition-colors'
                  : 'text-[#64748b] px-4 py-2 text-sm hover:text-[#0f766e] transition-colors rounded-xl'
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Feedbacks tab */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-6">
            <SentimentSummary feedbacks={feedbacks} />

            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
              <h2 className="text-base font-semibold text-[#1e293b]">Tendência de Sentimento</h2>
              <p className="text-xs text-slate-400 mt-0.5 mb-5">
                Média diária do sentimento dos feedbacks recebidos (-1 negativo, +1 positivo)
              </p>
              <SentimentTrendChart feedbacks={feedbacks} groupBy="day" />
            </div>

            <div className="space-y-4">
              <h2 className="text-base font-semibold text-[#1e293b]">Feedbacks Recentes</h2>

              {isLoading && <SkeletonFeedbackCards />}

              {!isLoading && error && (
                <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
                  Erro ao carregar dados: {error}
                </div>
              )}

              {!isLoading && !error && feedbacks.length === 0 && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-6 py-12 flex flex-col items-center gap-3 text-center">
                  <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <p className="text-sm text-slate-500">
                    Nenhum feedback recebido para os filtros selecionados.
                  </p>
                </div>
              )}

              {!isLoading && !error && feedbacks.length > 0 && (
                <div className="space-y-3">
                  {feedbacks.slice(0, visibleCount).map((fb) => (
                    <FeedbackCard key={fb.id} fb={fb} />
                  ))}
                  {visibleCount < feedbacks.length && (
                    <button
                      onClick={() => setVisibleCount((v) => v + 10)}
                      className="w-full py-2.5 rounded-xl border border-slate-200 text-sm text-slate-500
                                 hover:border-primary/40 hover:text-primary transition"
                    >
                      Ver mais ({feedbacks.length - visibleCount} restantes)
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Risk tab */}
        {activeTab === 'risk' && (
          <RiskAnalysis selectedSubject={riskSubject} minRiskLevel={minRiskLevel} />
        )}

        {/* Explainability tab */}
        {activeTab === 'shap' && (
          <GlobalShapAnalysis selectedSubject={shapSubject} />
        )}

      </div>
    </div>
  );
}

export default Dashboard;
