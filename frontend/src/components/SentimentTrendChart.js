import React from 'react';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts';
import { getWeekLabel } from '../utils/sentiment';

const groupFeedbacks = (feedbackList, groupBy) => {
  const groups = feedbackList.reduce((acc, fb) => {
    const isWeek = groupBy === 'week';
    const key    = isWeek
      ? getWeekLabel(fb.created_at)
      : new Date(fb.created_at).toISOString().split('T')[0];
    const label  = isWeek
      ? key
      : new Date(fb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!acc[key]) acc[key] = { label, scores: [] };
    acc[key].scores.push(fb.compound);
    return acc;
  }, {});

  const keys = groupBy === 'week' ? Object.keys(groups) : Object.keys(groups).sort();
  return keys.map((key) => ({
    label: groups[key].label,
    avg: parseFloat(
      (groups[key].scores.reduce((s, v) => s + v, 0) / groups[key].scores.length).toFixed(3)
    ),
  }));
};

const getSentimentBand = (value) => {
  if (value >= 0.05) return 'Positivo';
  if (value <= -0.05) return 'Negativo';
  return 'Neutro';
};

const getSentimentBandColor = (value) => {
  if (value >= 0.05) return '#16a34a';
  if (value <= -0.05) return '#dc2626';
  return '#6b7280';
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;
  const band  = getSentimentBand(value);
  const color = getSentimentBandColor(value);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] px-4 py-3 text-sm">
      <p className="text-slate-500 font-medium mb-1">{label}</p>
      <p className="font-semibold text-[#1e293b]">
        Sentimento:{' '}
        <span style={{ color: '#0f766e' }}>
          {value > 0 ? '+' : ''}{value.toFixed(3)}
        </span>
      </p>
      <p style={{ color }} className="font-medium mt-0.5">{band}</p>
    </div>
  );
}

function SentimentTrendChart({ feedbacks, groupBy = 'day' }) {
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Dados insuficientes para gerar o gráfico de tendência.
      </p>
    );
  }

  const validFeedbacks = feedbacks.filter(
    (fb) => fb.compound !== null && fb.compound !== undefined
  );

  if (validFeedbacks.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Nenhum dado de sentimento disponível.
      </p>
    );
  }

  const points = groupFeedbacks(validFeedbacks, groupBy);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={points} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0f766e" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0}    />
          </linearGradient>
        </defs>

        <ReferenceArea y1={-0.05} y2={0.05} fill="#f1f5f9" fillOpacity={0.9} ifOverflow="extendDomain" />

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />

        <YAxis
          domain={[-1, 1]}
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickCount={5}
        />

        <ReferenceLine y={0} stroke="#e2e8f0" strokeDasharray="4 4" />
        <ReferenceLine
          y={0.9}
          stroke="transparent"
          label={{ value: 'Positivo', position: 'insideTopRight', fill: '#16a34a', fontSize: 10, fontWeight: 600 }}
        />
        <ReferenceLine
          y={-0.9}
          stroke="transparent"
          label={{ value: 'Negativo', position: 'insideBottomRight', fill: '#dc2626', fontSize: 10, fontWeight: 600 }}
        />

        <Tooltip content={<CustomTooltip />} />

        <Area type="monotone" dataKey="avg" fill="url(#sentGrad)" stroke="none" />

        <Line
          type="monotone"
          dataKey="avg"
          name="Sentimento Médio"
          stroke="#0f766e"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#0f766e', strokeWidth: 0 }}
          activeDot={{ r: 6, fill: '#0f766e', strokeWidth: 2, stroke: '#fff' }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default SentimentTrendChart;
