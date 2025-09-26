import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import SentimentPieChart from './SentimentPieChart';
import SentimentTrendChart from './SentimentTrendChart';
import WordCloud from './WordCloud';

function Dashboard() {
  const { feedbacks, keywords, isLoading, error } = useDashboardData();

  if (isLoading) return <p className="loading-message">A carregar dashboard...</p>;
  if (error) return <p className="error-message">Erro ao carregar dados: {error}</p>;

  const validFeedbacks = Array.isArray(feedbacks) ? feedbacks : [];
  const validKeywords = Array.isArray(keywords) ? keywords : [];

  return (
    <div className="dashboard">
      <h1>Dashboard do Professor</h1>
      
      <div className="grid-container">
        <SentimentPieChart feedbacks={validFeedbacks} />
        <SentimentTrendChart feedbacks={validFeedbacks} />
        <div className="chart chart-wordcloud">
          <h3>Palavras-Chave Mais Citadas</h3>
          <WordCloud words={validKeywords} />
        </div>
      </div>

      <div className="feedback-list">
        <h2>Feedbacks Recentes</h2>
        {validFeedbacks && validFeedbacks.length > 0 ? (
          validFeedbacks.map((fb) => {
            if (!fb || typeof fb !== 'object' || !fb.id) {
              return null;
            }

            const displayText = fb.text || 'Texto não disponível';
            const displayCompound = typeof fb.compound === 'number' ? fb.compound.toFixed(4) : 'N/A';
            const displayDate = fb.created_at ? 
              new Date(fb.created_at).toLocaleString() : 
              'Data não disponível';

            return (
              <div key={fb.id} className="feedback-item">
                <p>"{displayText}"</p>
                <small>
                  Compound: {displayCompound} | Recebido em: {displayDate}
                </small>
              </div>
            );
          }).filter(Boolean) 
        ) : (
          <p>Nenhum feedback recebido ainda.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;