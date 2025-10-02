import React, { useState } from 'react';
import './App.css';
import { useAuth } from './AuthContext';

function FeedbackForm() {
  const [feedbackText, setFeedbackText] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { token, user } = useAuth()

  const interpretSentiment = (compound) => {
    if (compound >= 0.05) return { text: 'Positivo', emoji: '😊', color: '#28a745' };
    if (compound <= -0.05) return { text: 'Negativo', emoji: '😠', color: '#dc3545' };
    return { text: 'Neutro', emoji: '😐', color: '#6c757d' };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setSentimentResult(null);
    setSubmitted(false);

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text: feedbackText }),
      });

      if (!response.ok) throw new Error('A resposta da rede não foi bem-sucedida');
      
      const data = await response.json();
      setSentimentResult(data);
      setSubmitted(true);
      setFeedbackText('');
    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      setSentimentResult({ error: 'Falha ao analisar o sentimento.' });
    } finally {
      setIsLoading(false);
    }
  };

  const sentimentDisplay = sentimentResult ? interpretSentiment(sentimentResult.compound) : null;

  return (
    <header className="App-header">
      <h1>Olá, {user?.username}!</h1>
      <p>Como você se sentiu sobre a aula de hoje?</p>
    
      {submitted && sentimentResult && !sentimentResult.error && (
        <div className="success-message">
          <p>Obrigado pelo seu feedback!</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="feedback-form">
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Seja específico. O que foi bom? O que pode melhorar?"
          rows="5"
          required
          disabled={isLoading}
        />
        <br />
        <button type="submit" disabled={isLoading || !feedbackText.trim()}>
          {isLoading ? 'Analisando...' : 'Enviar'}
        </button>
      </form>

      {sentimentResult && !isLoading && !submitted && (
        <div className="result-container">
          <h2>Resultado da Análise:</h2>
          {sentimentResult.error ? (
            <p style={{ color: '#dc3545' }}>{sentimentResult.error}</p>
          ) : (
            <>
              <div className="sentiment-display" style={{ color: sentimentDisplay.color }}>
                <span>{sentimentDisplay.text}</span>
                <span className="emoji">{sentimentDisplay.emoji}</span>
              </div>
              <p className="compound-explanation">
                A sua nota de sentimento foi: <strong>{sentimentResult.compound.toFixed(2)}</strong>
                <br />
                <small>(Varia de -1, muito negativo, a +1, muito positivo)</small>
              </p>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default FeedbackForm;