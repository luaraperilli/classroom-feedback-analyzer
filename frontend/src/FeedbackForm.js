import React, { useState, useCallback } from 'react';
import './App.css';
import { useAuth } from './AuthContext';

const interpretSentiment = (compound) => {
  if (compound >= 0.05) return { text: 'Positivo', emoji: '😊', color: '#28a745' };
  if (compound <= -0.05) return { text: 'Negativo', emoji: '😠', color: '#dc3545' };
  return { text: 'Neutro', emoji: '😐', color: '#6c757d' };
};

function FeedbackForm() {
  const [feedbackText, setFeedbackText] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const { accessToken, user, logout, refreshAccessToken, API_BASE_URL } = useAuth();

  const sendFeedback = useCallback(async (retry = false) => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    setSentimentResult(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ text: feedbackText }),
      });

      if (response.status === 401 && !retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return sendFeedback(true);
        } else {
          logout();
          setError('Sessão expirada. Por favor, faça login novamente.');
          return;
        }
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Erro ao enviar feedback: ${response.statusText}`);
      }

      const data = await response.json();
      setSentimentResult(data);
      setMessage('Obrigado pelo seu feedback!');
      setFeedbackText('');
    } catch (err) {
      console.error('Erro ao enviar feedback:', err);
      setError(err.message || 'Falha ao analisar o sentimento.');
    } finally {
      setIsLoading(false);
    }
  }, [feedbackText, accessToken, logout, refreshAccessToken, API_BASE_URL]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (feedbackText.trim() && accessToken) {
      sendFeedback();
    }
  };

  const sentimentDisplay = sentimentResult ? interpretSentiment(sentimentResult.compound) : null;

  return (
    <header className="App-header">
      <h1>Olá, {user?.username}!</h1>
      <p>Como você se sentiu sobre a aula de hoje?</p>
    
      {message && <p className="success-message">{message}</p>}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} className="feedback-form">
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Seja específico. O que foi bom? O que pode melhorar?"
          rows="5"
          required
          disabled={isLoading || !accessToken}
        />
        <br />
        <button type="submit" disabled={isLoading || !feedbackText.trim() || !accessToken}>
          {isLoading ? 'Analisando...' : 'Enviar'}
        </button>
      </form>

      {sentimentResult && !isLoading && !error && (
        <div className="result-container">
          <h2>Resultado da Análise:</h2>
          <div className="sentiment-display" style={{ color: sentimentDisplay.color }}>
            <span>{sentimentDisplay.text}</span>
            <span className="emoji">{sentimentDisplay.emoji}</span>
          </div>
          <p className="compound-explanation">
            A sua nota de sentimento foi: <strong>{sentimentResult.compound.toFixed(2)}</strong>
            <br />
            <small>(Varia de -1, muito negativo, a +1, muito positivo)</small>
          </p>
        </div>
      )}
    </header>
  );
}

export default FeedbackForm;

