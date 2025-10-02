import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import SentimentSummary from './components/SentimentSummary';
import SentimentTrendChart from './components/SentimentTrendChart';

const getSentimentClass = (compound) => {
  if (compound >= 0.05) return 'positive-feedback';
  if (compound <= -0.05) return 'negative-feedback';
  return 'neutral-feedback';
};

/**
 * Returns the appropriate hexadecimal color based on the composite sentiment score
 * @param {number} compound 
 * @returns {string}
 */
const getCompoundColor = (compound) => {
  if (compound >= 0.05) return '#28a745';
  if (compound <= -0.05) return '#dc3545';
  return '#6c757d'; // Cinza
};

function Dashboard() {
  const { feedbacks, isLoading, error } = useDashboardData();

  if (isLoading) {
    return <p className="loading-message">Carregando dashboard...</p>;
  }

  if (error) {
    return <p className="error-message">Erro ao carregar dados: {error}</p>;
  }

  return (
    <div className="dashboard">
      <h1>Dashboard do Professor</h1>
      
      <div className="grid-container">
        <SentimentSummary feedbacks={feedbacks} />
        <div className="chart">
          <SentimentTrendChart feedbacks={feedbacks} />
        </div>
      </div>

      <div className="feedback-list">
        <h2>Feedbacks Recentes</h2>
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className={`feedback-item ${getSentimentClass(fb.compound)}`}>
              <p>"{fb.text}"</p>
              <small>
                Nota de Sentimento: 
                <strong style={{ color: getCompoundColor(fb.compound) }}>
                  {' '}{fb.compound.toFixed(4)}
                </strong> 
                {' '}| Recebido em: {new Date(fb.created_at).toLocaleString()}
              </small>
            </div>
          ))
        ) : (
          <p>Nenhum feedback recebido ainda.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;