import React from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import SentimentPieChart from './SentimentPieChart';
import SentimentTrendChart from './SentimentTrendChart';

function Dashboard() {
  const { feedbacks, keywords, isLoading, error } = useDashboardData();

  if (isLoading) return <p className="loading-message">A carregar dashboard...</p>;
  if (error) return <p className="error-message">Erro ao carregar dados: {error}</p>;

  const safeFeedbacks = feedbacks || [];
  const safeKeywords = keywords || [];

  const validFeedbacks = Array.isArray(safeFeedbacks) ? safeFeedbacks : [];
  const validKeywords = Array.isArray(safeKeywords) ? safeKeywords : [];

  console.log('Dashboard renderizando com:', {
    feedbacks: validFeedbacks.length,
    keywords: validKeywords.length,
    feedbacksType: typeof feedbacks,
    keywordsType: typeof keywords
  });

  return (
    <div className="dashboard">
      <h1>Dashboard do Professor</h1>
      
      <div className="grid-container">
        <SentimentPieChart feedbacks={validFeedbacks} />
        <SentimentTrendChart feedbacks={validFeedbacks} />
        <div className="chart chart-wordcloud">
          <h3>Palavras-Chave Mais Citadas</h3>
          <div style={{ padding: '20px', textAlign: 'center', background: '#f5f5f5' }}>
            {validKeywords.length > 0 ? (
              <div>
                <p>Encontradas {validKeywords.length} palavras-chave:</p>
                <ul>
                  {validKeywords.slice(0, 10).map((keyword, index) => (
                    <li key={index}>
                      {typeof keyword === 'string' ? keyword : keyword.word || keyword.text || keyword.name || 'Palavra desconhecida'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p>Nenhuma palavra-chave encontrada.</p>
            )}
          </div>
        </div>
      </div>

      <div className="feedback-list">
        <h2>Feedbacks Recentes</h2>
        {validFeedbacks.length > 0 ? (
          validFeedbacks.map((fb, index) => {
            if (!fb || typeof fb !== 'object') {
              console.warn('Feedback inválido no índice', index, fb);
              return null;
            }

            const key = fb.id || `feedback-${index}`;
            const displayText = fb.text || 'Texto não disponível';
            const displayCompound = typeof fb.compound === 'number' ? fb.compound.toFixed(4) : 'N/A';
            const displayDate = fb.created_at ? 
              (() => {
                try {
                  return new Date(fb.created_at).toLocaleString();
                } catch (e) {
                  return 'Data inválida';
                }
              })() : 'Data não disponível';

            return (
              <div key={key} className="feedback-item">
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