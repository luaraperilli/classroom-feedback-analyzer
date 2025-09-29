import React, { useState } from 'react';
import './App.css';

function FeedbackForm() {
  const [feedbackText, setFeedbackText] = useState('');
  const [sentimentResult, setSentimentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const interpretSentiment = (compound) => {
    if (compound >= 0.05) return { text: 'Positivo', emoji: '😊', color: '#28a745' };
    if (compound <= -0.05) return { text: 'Negativo', emoji: '😠', color: '#dc3545' };
    return { text: 'Neutro', emoji: '😐', color: '#6c757d' };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsLoading(true);
    setSentimentResult(null);

    try {
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: feedbackText }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const data = await response.json();
      setSentimentResult(data);
    } catch (error) {
      console.error('Error sending feedback:', error);
      setSentimentResult({ error: 'Failed to analyze sentiment.' });
    } finally {
      setIsLoading(false);
    }
  };

  const sentimentDisplay = sentimentResult ? interpretSentiment(sentimentResult.compound) : null;

  return (
    <header className="App-header">
      <h1>Análise de Sentimentos da Aula</h1>
      <p>Como você se sentiu sobre a aula de hoje?</p>
      
      <form onSubmit={handleSubmit} className="feedback-form">
        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Escreva seu feedback anônimo aqui..."
          rows="5"
          required
        />
        <br />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Analisando...' : 'Enviar Feedback'}
        </button>
      </form>

      {sentimentResult && (
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
                A nota "Compound" varia de -1 (muito negativo) a +1 (muito positivo).
                Sua nota foi: <strong>{sentimentResult.compound.toFixed(4)}</strong>
              </p>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default FeedbackForm;