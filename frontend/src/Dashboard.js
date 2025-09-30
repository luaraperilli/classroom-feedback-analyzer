import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import SentimentSummary from './SentimentSummary';
import SentimentTrendChart from './SentimentTrendChart';

function Dashboard() {
  const { feedbacks, isLoading, error } = useDashboardData();

  const getCompoundColor = (compound) => {
    if (compound >= 0.05) return '#28a745';
    if (compound <= -0.05) return '#dc3545';
    return '#6c757d';
  };

  if (isLoading) return <p className="loading-message">Carregando dashboard...</p>;
  if (error) return <p className="error-message">Erro ao carregar dados: {error}</p>;

  return (
    <div className="dashboard">
      <h1>Dashboard do Professor</h1>
      
      <div className="grid-container">
        <SentimentSummary feedbacks={feedbacks} />
        <SentimentTrendChart feedbacks={feedbacks} />
      </div>

      <div className="feedback-list">
        <h2>Feedbacks Recentes</h2>
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className="feedback-item">
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