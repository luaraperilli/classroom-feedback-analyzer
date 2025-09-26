import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import SentimentPieChart from './SentimentPieChart';
import SentimentTrendChart from './SentimentTrendChart';
import WordCloud from './WordCloud';

function Dashboard() {
  const { feedbacks, keywords, isLoading, error } = useDashboardData();

  if (isLoading) return <p className="loading-message">A carregar dashboard...</p>;
  if (error) return <p className="error-message">Erro ao carregar dados: {error}</p>;

  return (
    <div className="dashboard">
      <h1>Dashboard do Professor</h1>
      
      <div className="grid-container">
        <SentimentPieChart feedbacks={feedbacks} />
        <SentimentTrendChart feedbacks={feedbacks} />
        <div className="chart chart-wordcloud">
            <h3>Palavras-Chave Mais Citadas</h3>
            <WordCloud words={keywords} />
        </div>
      </div>

      <div className="feedback-list">
        <h2>Feedbacks Recentes</h2>
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className="feedback-item">
              <p>"{fb.text}"</p>
              <small>Compound: {fb.compound.toFixed(4)} | Recebido em: {new Date(fb.created_at).toLocaleString()}</small>
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