export const SENTIMENT_THRESHOLDS = { positive: 0.05, negative: -0.05 };

export const getSentimentLabel = (compound) => {
  if (compound === null || compound === undefined) return 'neutro';
  if (compound >= SENTIMENT_THRESHOLDS.positive) return 'positivo';
  if (compound <= SENTIMENT_THRESHOLDS.negative) return 'negativo';
  return 'neutro';
};

export const getSentimentClass = (compound) => {
  const label = getSentimentLabel(compound);
  return `${label}-feedback`;
};

export const getSentimentColor = (compound) => {
  const label = getSentimentLabel(compound);
  const colors = { positivo: '#28a745', neutro: '#6c757d', negativo: '#dc3545' };
  return colors[label];
};

export const getSentimentMessage = (compound) => {
  if (compound === null || compound === undefined) {
    return 'Sem dados de sentimento para este feedback.';
  }
  if (compound >= SENTIMENT_THRESHOLDS.positive) {
    return 'Seu comentário foi percebido como positivo.';
  }
  if (compound <= SENTIMENT_THRESHOLDS.negative) {
    return 'Seu comentário foi percebido como negativo.';
  }
  return 'Seu comentário foi percebido como neutro.';
};

export const getWeekLabel = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week = Math.round(((d - new Date(d.getFullYear(), 0, 4)) / 86400000 + 1) / 7);
  return `Sem. ${week}`;
};
