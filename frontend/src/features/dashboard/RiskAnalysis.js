import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getStudentsAtRisk } from '../../services/api';
import { translateSubject } from '../../utils/translations';


const RISK_CONFIG = {
  alto:  { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', label: 'Alto Risco' },
  medio: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', label: 'Risco Moderado' },
  baixo: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', label: 'Baixo Risco' },
};

const getRiskLabel  = (level) => RISK_CONFIG[level]?.label  || 'Desconhecido';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SkeletonCards() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-5 animate-pulse"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/3 mb-1" />
              <div className="h-3 bg-slate-100 rounded w-1/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[1, 2, 3, 4].map((j) => (
              <div key={j} className="h-12 bg-slate-100 rounded-lg" />
            ))}
          </div>
          <div className="h-2 bg-slate-100 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function SummaryCard({ label, count, level }) {
  const { color, bg, border } = RISK_CONFIG[level];

  return (
    <div
      className="rounded-2xl border p-5 flex flex-col gap-2"
      style={{ backgroundColor: bg, borderColor: border }}
    >
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
        {label}
      </span>
      <span className="text-3xl font-bold" style={{ color }}>
        {count}
      </span>
      <span className="text-xs text-slate-500">
        {count === 1 ? 'aluno' : 'alunos'}
      </span>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="bg-[#f8fafc] rounded-xl px-3 py-2.5">
      <span className="block text-[10px] text-slate-400 uppercase tracking-wide mb-1">
        {label}
      </span>
      <span className="text-sm font-bold" style={{ color: color || '#1e293b' }}>
        {value}
      </span>
    </div>
  );
}

function StudentCard({ student }) {
  const { color, bg, border } = RISK_CONFIG[student.risk_level] || {};
  const riskPct       = Math.round((student.risk_score ?? 0) * 100);
  const scoreDisplay  = (student.average_score * 4 + 1).toFixed(1);
  const sentimentVal  = student.average_sentiment;
  const sentimentDisplay =
    sentimentVal !== null && sentimentVal !== undefined
      ? `${sentimentVal > 0 ? '+' : ''}${sentimentVal.toFixed(2)}`
      : '—';
  const sentimentColor =
    sentimentVal >= 0.05  ? '#16a34a' :
    sentimentVal <= -0.05 ? '#dc2626' : '#6b7280';

  const initials = getInitials(student.student_username);

  return (
    <div
      className="bg-white rounded-2xl border shadow-[0_2px_16px_rgba(0,0,0,0.07)] p-5 flex flex-col gap-3 border-l-4"
      style={{ borderLeftColor: color, borderColor: border }}
    >
      {/* Header: avatar + name + subject */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-bold"
          style={{ backgroundColor: bg, color }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[#1e293b] leading-tight truncate">
            {student.student_username}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            {translateSubject(student.subject_name)}
          </p>
        </div>
      </div>

      {/* 2×2 metrics grid */}
      <div className="grid grid-cols-2 gap-2">
        <Metric label="Score Médio"  value={`${scoreDisplay}/5`} />
        <Metric
          label="Sentimento"
          value={sentimentDisplay}
          color={sentimentVal !== null && sentimentVal !== undefined ? sentimentColor : undefined}
        />
        <Metric label="Feedbacks" value={student.feedback_count} />
        <Metric label="Risco"     value={`${riskPct}%`} color={color} />
      </div>

      {/* Risk progress bar */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Pontuação de risco</span>
          <span className="text-[10px] font-semibold" style={{ color }}>{riskPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${color}20` }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${riskPct}%`, backgroundColor: color }}
          />
        </div>
      </div>
    </div>
  );
}

function RiskAnalysis({ selectedSubject, minRiskLevel }) {
  const [studentsAtRisk, setStudentsAtRisk] = useState([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [error, setError]                   = useState(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const fetchRiskData = async () => {
      if (!cancelled) { setIsLoading(true); setError(null); }
      try {
        const data = await getStudentsAtRisk(
          selectedSubject || null,
          minRiskLevel,
          accessToken
        );
        if (!cancelled) setStudentsAtRisk(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (accessToken) fetchRiskData();
    return () => { cancelled = true; };
  }, [selectedSubject, minRiskLevel, accessToken]);

  const grouped = studentsAtRisk.reduce(
    (acc, s) => {
      if (acc[s.risk_level]) acc[s.risk_level].push(s);
      return acc;
    },
    { alto: [], medio: [], baixo: [] }
  );
  const total = studentsAtRisk.length;

  return (
    <div className="space-y-6">
      {/* Loading skeleton */}
      {isLoading && <SkeletonCards />}

      {/* Error */}
      {!isLoading && error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
          Erro ao carregar dados: {error}
        </div>
      )}

      {!isLoading && !error && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="Alto Risco"     count={grouped.alto.length}  level="alto" />
          <SummaryCard label="Risco Moderado" count={grouped.medio.length} level="medio" />
          <SummaryCard label="Baixo Risco"    count={grouped.baixo.length} level="baixo" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && total === 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-6 py-12 flex flex-col items-center gap-3 text-center">
          <svg
            className="w-10 h-10 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-sm text-slate-500">
            Nenhum aluno identificado nos critérios selecionados.
          </p>
        </div>
      )}

      {/* Students grouped by risk level */}
      {!isLoading && !error && total > 0 && (
        <div className="space-y-8">
          {['alto', 'medio', 'baixo'].map((level) => {
            const students = grouped[level];
            if (students.length === 0) return null;
            const { color, bg, border } = RISK_CONFIG[level];

            return (
              <div key={level}>
                {/* Section header */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-4 border"
                  style={{ backgroundColor: bg, borderColor: border }}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-sm font-semibold" style={{ color }}>
                    {getRiskLabel(level)}
                  </h3>
                  <span
                    className="text-xs font-medium px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: `${color}20`, color }}
                  >
                    {students.length}
                  </span>
                </div>

                {/* Cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {students.map((student) => (
                    <StudentCard
                      key={`${student.student_id}-${student.subject_id}`}
                      student={student}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RiskAnalysis;
