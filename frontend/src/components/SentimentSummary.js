import React from 'react';

const getPercentage = (count, total) =>
  total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';

const getAvgCompound = (feedbacks) => {
  const valid = feedbacks.filter((fb) => fb.compound !== null && fb.compound !== undefined);
  if (valid.length === 0) return null;
  return valid.reduce((acc, fb) => acc + fb.compound, 0) / valid.length;
};

function StatCard({ label, value, color, percentage, showBar, footer }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.08)] p-5 flex flex-col gap-1 min-w-0">
      <span className="text-4xl font-bold leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-sm text-slate-500 mt-1">{label}</span>

      {footer && (
        <span className="text-xs mt-1" style={{ color }}>
          {footer}
        </span>
      )}

      {showBar && (
        <div className="mt-3 space-y-1">
          <span className="text-xs font-medium" style={{ color }}>
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
  const positiveCount = feedbacks.filter((fb) => fb.compound >= 0.05).length;
  const neutralCount  = feedbacks.filter((fb) => fb.compound > -0.05 && fb.compound < 0.05).length;
  const negativeCount = feedbacks.filter((fb) => fb.compound <= -0.05).length;

  const avg = getAvgCompound(feedbacks);
  const avgLabel = avg !== null
    ? `Média: ${avg > 0 ? '+' : ''}${avg.toFixed(2)}`
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
        color="#16a34a"
        percentage={getPercentage(positiveCount, total)}
        showBar
      />
      <StatCard
        label="Neutros"
        value={neutralCount}
        color="#6b7280"
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
    </div>
  );
}

export default SentimentSummary;
