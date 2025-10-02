import React from 'react';

/**
 * Component to display a summary of sentiments from feedbacks
 * @param {Array} feedbacks 
 */
function SentimentSummary({ feedbacks }) {
  const totalFeedbacks = feedbacks.length;
  const positiveCount = feedbacks.filter(fb => fb.compound >= 0.05).length;
  const neutralCount = feedbacks.filter(fb => fb.compound > -0.05 && fb.compound < 0.05).length;
  const negativeCount = feedbacks.filter(fb => fb.compound <= -0.05).length;

  const getPercentage = (count) => {
    return totalFeedbacks > 0 ? ((count / totalFeedbacks) * 100).toFixed(1) : 0;
  };

  return (
    <div className="summary-container">
      <div className="summary-card positive">
        <h2>{positiveCount}</h2>
        <p>Feedbacks Positivos</p>
        <span>{getPercentage(positiveCount)}%</span>
      </div>
      <div className="summary-card neutral">
        <h2>{neutralCount}</h2>
        <p>Feedbacks Neutros</p>
        <span>{getPercentage(neutralCount)}%</span>
      </div>
      <div className="summary-card negative">
        <h2>{negativeCount}</h2>
        <p>Feedbacks Negativos</p>
        <span>{getPercentage(negativeCount)}%</span>
      </div>
    </div>
  );
}

export default SentimentSummary;

