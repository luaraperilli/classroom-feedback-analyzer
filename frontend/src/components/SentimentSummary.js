import React from 'react';
import { rotuloDoFeedback } from '../utils/sentiment';
import { numeroPtBr, numeroComSinal } from '../utils/numeroPtBr';

const getPercentage = (count, total) =>
  total > 0 ? numeroPtBr((count / total) * 100, 1) : '0,0';

const getAvgCompound = (feedbacks) => {
  const valid = feedbacks.filter((fb) => fb.compound !== null && fb.compound !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((acc, fb) => acc + fb.compound, 0) / valid.length;
};

function StatCard({ label, value, color, percentage, showBar, footer }) {
  return (
    <div className="bg-white rounded-2xl border border-[#cfe0da] shadow-[0_12px_16px_-4px_rgba(16,24,40,0.10),0_4px_6px_-2px_rgba(16,24,40,0.05)] p-5 flex flex-col gap-1 min-w-0">
      <span className="text-4xl font-bold leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-sm text-slate-500 mt-1">{label}</span>

      {footer && (
        <span className="text-sm mt-1" style={{ color }}>
          {footer}
        </span>
      )}

      {showBar && (
        <div className="mt-3 space-y-1">
          <span className="text-sm font-medium" style={{ color }}>
            {percentage}%
          </span>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${percentage}%`, backgroundColor: color }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function SentimentSummary({ feedbacks }) {
  const total         = feedbacks.length;
  // Contagem pelo mesmo rótulo que o aluno e o docente veem nos cartões. Antes
  // era por faixa de compound, e o resumo podia divergir do que estava escrito
  // em cada feedback.
  const conta = (rotulo) => feedbacks.filter((fb) => rotuloDoFeedback(fb) === rotulo).length;
  const positiveCount = conta('positivo');
  const neutralCount  = conta('neutro');
  const negativeCount = conta('negativo');
  const mixedCount    = conta('misto');

  const avg = getAvgCompound(feedbacks);
  const avgLabel = avg !== null
    ? `Média: ${numeroComSinal(avg, 2)}`
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      <StatCard
        label="Total de feedbacks"
        value={total}
        color="#0f766e"
        footer={avgLabel}
        showBar={false}
      />
      <StatCard
        label="Positivos"
        value={positiveCount}
        color="#0f766e"
        percentage={getPercentage(positiveCount, total)}
        showBar
      />
      <StatCard
        label="Neutros"
        value={neutralCount}
        color="#64748b"
        percentage={getPercentage(neutralCount, total)}
        showBar
      />
      <StatCard
        label="Negativos"
        value={negativeCount}
        color="#dc2626"
        percentage={getPercentage(negativeCount, total)}
        showBar
      />
      {/* Comentários em que nenhuma classe alcançou a maioria. Vale contá-los
          à parte porque são justamente aqueles em que a análise em nível de
          documento não dá conta, e não uma sobra de arredondamento. */}
      <StatCard
        label="Mistos"
        value={mixedCount}
        color="#b45309"
        percentage={getPercentage(mixedCount, total)}
        showBar
      />
    </div>
  );
}

export default SentimentSummary;
