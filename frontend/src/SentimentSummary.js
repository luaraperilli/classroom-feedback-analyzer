import React from 'react';

function SentimentSummary({ feedbacks }) {
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="chart">
        <h3>Distribuição de Sentimentos</h3>
        <p>Sem dados para exibir.</p>
      </div>
    );
  }

  const sentimentCounts = feedbacks.reduce((acc, fb) => {
    if (fb.compound >= 0.05) acc.positive += 1;
    else if (fb.compound <= -0.05) acc.negative += 1;
    else acc.neutral += 1;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });

  const totalFeedbacks = feedbacks.length;

  const getPercentage = (count) => {
    if (totalFeedbacks === 0) return '0%';
    return `${((count / totalFeedbacks) * 100).toFixed(1)}%`;
  };

  return (
    <div className="summary-container">
      <div className="summary-card positive">
        <h2>{sentimentCounts.positive}</h2>
        <p>Positivos</p>
        <span>{getPercentage(sentimentCounts.positive)}</span>
      </div>
      <div className="summary-card neutral">
        <h2>{sentimentCounts.neutral}</h2>
        <p>Neutros</p>
        <span>{getPercentage(sentimentCounts.neutral)}</span>
      </div>
      <div className="summary-card negative">
        <h2>{sentimentCounts.negative}</h2>
        <p>Negativos</p>
        <span>{getPercentage(sentimentCounts.negative)}</span>
      </div>
    </div>
  );
}

export default SentimentSummary;