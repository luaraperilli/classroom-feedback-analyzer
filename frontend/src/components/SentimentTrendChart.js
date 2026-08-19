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
  LabelList,
} from 'recharts';
import { numeroPtBr, numeroComSinal } from '../utils/numeroPtBr';

// Duas métricas, para dois públicos.
//
// "sentimento" usa o compound (POS − NEG, de −1 a +1) e é a evolução do
// sentimento da turma, no dashboard do docente.
//
// "avaliacao" usa a média das seis respostas na mesma escala de 1 a 5 que o
// aluno respondeu. Na tela dele, o compound gerava dúvida — um número entre
// −1 e +1 não significa nada para quem marcou notas de 1 a 5.
const METRICAS = {
  sentimento: {
    valor: (fb) => fb.compound,
    dominio: [-1, 1],
    rotulo: 'Sentimento',
    formata: (v) => numeroComSinal(v, 2),
    faixa: (v) => (v >= 0.05 ? 'Positivo' : v <= -0.05 ? 'Negativo' : 'Neutro'),
    cor: (v) => (v >= 0.05 ? '#0f766e' : v <= -0.05 ? '#dc2626' : '#64748b'),
    neutro: [-0.05, 0.05],
    linhaBase: 0,
    topo: 0.9,
    base: -0.9,
    vazio: 'Nenhum dado de sentimento disponível.',
  },
  avaliacao: {
    valor: (fb) => (fb.overall_score * 4 + 1),
    dominio: [1, 5],
    rotulo: 'Sua avaliação',
    formata: (v) => numeroPtBr(v, 1),
    faixa: (v) => (v >= 3.5 ? 'Concordo' : v <= 2.5 ? 'Discordo' : 'Neutro'),
    cor: (v) => (v >= 3.5 ? '#0f766e' : v <= 2.5 ? '#dc2626' : '#64748b'),
    neutro: [2.5, 3.5],
    linhaBase: 3,
    topo: 4.8,
    base: 1.2,
    vazio: 'Nenhuma avaliação disponível.',
  },
};

const agrupar = (feedbacks, groupBy, metrica) => {
  const isWeek = groupBy === 'week';

  const grupos = feedbacks.reduce((acc, fb) => {
    const data = new Date(fb.created_at);
    const chave = isWeek
      ? `${data.getFullYear()}-${data.getMonth()}`
      : data.toISOString().split('T')[0];

    if (!acc[chave]) acc[chave] = { data, valores: [] };
    if (data < acc[chave].data) acc[chave].data = data;
    acc[chave].valores.push(metrica.valor(fb));
    return acc;
  }, {});

  return Object.keys(grupos)
    .sort((a, b) => grupos[a].data - grupos[b].data)
    .map((chave) => {
      const { data, valores } = grupos[chave];
      const media = valores.reduce((soma, v) => soma + v, 0) / valores.length;
      return {
        label: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        avg: parseFloat(media.toFixed(3)),
      };
    });
};

function CustomTooltip({ active, payload, label, metrica }) {
  if (!active || !payload || !payload.length) return null;

  const valor = payload[0].value;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] px-4 py-3 text-sm max-w-[15rem]">
      <p className="text-slate-500 font-medium mb-1">{label}</p>
      <p className="font-semibold text-[#1e293b]">
        {metrica.rotulo}: <span style={{ color: '#0f766e' }}>{metrica.formata(valor)}</span>
      </p>
      <p style={{ color: metrica.cor(valor) }} className="font-medium mt-0.5">
        {metrica.faixa(valor)}
      </p>
      {metrica.rotulo === 'Sua avaliação' && (
        <p className="text-slate-500 mt-2 leading-snug">
          Média das suas seis respostas, na mesma escala de 1 a 5 do questionário.
        </p>
      )}
    </div>
  );
}

function SentimentTrendChart({ feedbacks, groupBy = 'day', metrica = 'sentimento' }) {
  const config = METRICAS[metrica] || METRICAS.sentimento;

  if (!feedbacks || feedbacks.length === 0) {
    return (
      <p className="text-sm text-slate-400 py-8 text-center">
        Dados insuficientes para gerar o gráfico de tendência.
      </p>
    );
  }

  const validos = feedbacks.filter((fb) => {
    const v = config.valor(fb);
    return v !== null && v !== undefined && !Number.isNaN(v);
  });

  if (validos.length === 0) {
    return <p className="text-sm text-slate-400 py-8 text-center">{config.vazio}</p>;
  }

  const pontos = agrupar(validos, groupBy, config);
  // Com poucos pontos, mostramos o valor sobre cada um para o gráfico não ficar vazio.
  const poucosPontos = pontos.length <= 8;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={pontos} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity={0.15} />
            <stop offset="100%" stopColor="#0f766e" stopOpacity={0} />
          </linearGradient>
        </defs>

        <ReferenceArea
          y1={config.neutro[0]}
          y2={config.neutro[1]}
          fill="#f1f5f9"
          fillOpacity={0.9}
          ifOverflow="extendDomain"
        />

        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

        <XAxis
          dataKey="label"
          tick={{ fontSize: 14, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
          padding={{ left: 24, right: 24 }}
        />

        <YAxis
          domain={config.dominio}
          tick={{ fontSize: 14, fill: '#475569' }}
          axisLine={false}
          tickLine={false}
          tickCount={5}
        />

        <ReferenceLine y={config.linhaBase} stroke="#e2e8f0" strokeDasharray="4 4" />
        <ReferenceLine
          y={config.topo}
          stroke="transparent"
          label={{
            value: metrica === 'avaliacao' ? 'Concordo totalmente' : 'Positivo',
            position: 'insideTopRight',
            fill: '#0f766e',
            fontSize: 13,
            fontWeight: 600,
          }}
        />
        <ReferenceLine
          y={config.base}
          stroke="transparent"
          label={{
            value: metrica === 'avaliacao' ? 'Discordo totalmente' : 'Negativo',
            position: 'insideBottomRight',
            fill: '#dc2626',
            fontSize: 13,
            fontWeight: 600,
          }}
        />

        <Tooltip content={<CustomTooltip metrica={config} />} />

        <Area type="monotone" dataKey="avg" fill="url(#sentGrad)" stroke="none" />

        <Line
          type="monotone"
          dataKey="avg"
          name={config.rotulo}
          stroke="#0f766e"
          strokeWidth={2.5}
          dot={{ r: poucosPontos ? 5 : 3, fill: '#0f766e', strokeWidth: 2, stroke: '#fff' }}
          activeDot={{ r: 7, fill: '#0f766e', strokeWidth: 2, stroke: '#fff' }}
        >
          {poucosPontos && (
            <LabelList
              dataKey="avg"
              position="top"
              offset={12}
              formatter={(v) => config.formata(Number(v))}
              style={{ fontSize: 12, fill: '#0f766e', fontWeight: 600 }}
            />
          )}
        </Line>
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default SentimentTrendChart;
