import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getGlobalShap } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from 'recharts';

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  const color = d.mean_shap >= 0 ? '#16a34a' : '#dc2626';
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] px-4 py-3 text-sm">
      <p className="font-semibold text-[#1e293b] mb-1">"{d.word}"</p>
      <p>
        SHAP médio:{' '}
        <span className="font-semibold" style={{ color }}>
          {d.mean_shap > 0 ? '+' : ''}{d.mean_shap.toFixed(4)}
        </span>
      </p>
      <p className="text-slate-400 text-xs mt-0.5">
        Presente em {d.count} feedback{d.count !== 1 ? 's' : ''}
      </p>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6 animate-pulse">
      <div className="h-4 bg-slate-200 rounded w-1/3 mb-2" />
      <div className="h-3 bg-slate-100 rounded w-1/2 mb-6" />
      <div className="h-[400px] bg-slate-50 rounded-xl" />
    </div>
  );
}

function GlobalShapAnalysis({ selectedSubject }) {
  const [data, setData]         = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      if (!cancelled) { setIsLoading(true); setError(null); }
      try {
        const result = await getGlobalShap(selectedSubject || null, accessToken);
        if (!cancelled) setData(Array.isArray(result) ? result : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    if (accessToken) fetchData();
    return () => { cancelled = true; };
  }, [selectedSubject, accessToken]);

  if (isLoading) return <SkeletonChart />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 text-sm text-red-600">
        Erro ao carregar dados: {error}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-6 py-12 flex flex-col items-center gap-3 text-center">
        <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
        </svg>
        <p className="text-sm text-slate-500">
          Nenhum dado de explicabilidade disponível. Envie feedbacks com comentários para gerar a análise global.
        </p>
      </div>
    );
  }

  const top20 = data.slice(0, 20).reverse();

  const positiveCount = data.filter((d) => d.mean_shap > 0).length;
  const negativeCount = data.filter((d) => d.mean_shap < 0).length;

  return (
    <div className="space-y-6">
      {/* Summary pills */}
      <div className="flex flex-wrap gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#0f766e]/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0f766e]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#0f766e]">{data.length}</p>
            <p className="text-xs text-slate-500">Palavras analisadas</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#16a34a]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#16a34a]">{positiveCount}</p>
            <p className="text-xs text-slate-500">Impacto positivo</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_16px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#dc2626]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-bold text-[#dc2626]">{negativeCount}</p>
            <p className="text-xs text-slate-500">Impacto negativo</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-semibold text-[#1e293b]">Palavras Mais Influentes (SHAP Global)</h2>
        <p className="text-xs text-slate-400 mt-0.5 mb-6">
          Valor SHAP médio de cada palavra ao longo de todos os feedbacks. Valores positivos indicam contribuição para sentimento positivo, valores negativos para negativo.
        </p>

        <ResponsiveContainer width="100%" height={Math.max(400, top20.length * 32)}>
          <BarChart data={top20} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />

            <XAxis
              type="number"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              dataKey="word"
              type="category"
              tick={{ fontSize: 12, fill: '#1e293b', fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={120}
            />

            <ReferenceLine x={0} stroke="#e2e8f0" />

            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />

            <Bar dataKey="mean_shap" radius={[0, 6, 6, 0]} maxBarSize={20}>
              {top20.map((entry, idx) => (
                <Cell
                  key={idx}
                  fill={entry.mean_shap >= 0 ? '#16a34a' : '#dc2626'}
                  fillOpacity={0.8}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Word table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-6">
        <h2 className="text-base font-semibold text-[#1e293b] mb-4">Detalhamento por Palavra</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="text-left py-2.5 pr-4 font-medium">Palavra</th>
                <th className="text-right py-2.5 px-4 font-medium">SHAP Médio</th>
                <th className="text-right py-2.5 px-4 font-medium">Ocorrências</th>
                <th className="text-left py-2.5 pl-4 font-medium">Impacto</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, idx) => {
                const color = d.mean_shap >= 0 ? '#16a34a' : '#dc2626';
                const barWidth = Math.min(Math.abs(d.mean_shap) / (Math.abs(data[0]?.mean_shap) || 1) * 100, 100);
                return (
                  <tr key={idx} className="border-b border-slate-50 last:border-0">
                    <td className="py-2.5 pr-4 font-medium text-[#1e293b]">{d.word}</td>
                    <td className="py-2.5 px-4 text-right font-mono" style={{ color }}>
                      {d.mean_shap > 0 ? '+' : ''}{d.mean_shap.toFixed(4)}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">{d.count}</td>
                    <td className="py-2.5 pl-4 w-32">
                      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default GlobalShapAnalysis;
