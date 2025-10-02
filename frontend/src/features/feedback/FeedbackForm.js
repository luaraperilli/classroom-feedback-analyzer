import React, { useState, useCallback, useEffect } from 'react';
import '../../App.css';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, analyzeFeedback } from '../../services/api';

const interpretSentiment = (compound) => {
  if (compound >= 0.05) return { text: 'Positivo', emoji: '😊', color: '#28a745' };
  if (compound <= -0.05) return { text: 'Negativo', emoji: '😠', color: '#dc3545' };
  return { text: 'Neutro', emoji: '😐', color: '#6c757d' };
};

function FeedbackForm() {
  const [feedbackText, setFeedbackText] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [sentimentResult, setSentimentResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const { accessToken, user, logout, refreshAccessToken } = useAuth();

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!accessToken) return;
      try {
        const data = await getSubjects(accessToken);
        setSubjects(data);
      } catch (e) {
        console.error("Erro ao buscar matérias:", e);
      }
    };
    fetchSubjects();
  }, [accessToken]);

  const sendFeedback = useCallback(async (retry = false) => {
    setIsLoading(true);
    setMessage(null);
    setError(null);
    setSentimentResult(null);

    try {
      const data = await analyzeFeedback(feedbackText, subjectId, accessToken);
      setSentimentResult(data);
      setMessage('Obrigado.');
      setFeedbackText('');
      setSubjectId('');
    } catch (err) {
        if (err.message.includes('401') && !retry) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              return sendFeedback(true);
            } else {
              logout();
              setError('Sessão expirada. Por favor, faça login novamente.');
            }
        } else {
            console.error('Erro ao enviar feedback:', err);
            setError(err.message || 'Falha ao analisar o sentimento.');
        }
    } finally {
      setIsLoading(false);
    }
  }, [feedbackText, subjectId, accessToken, logout, refreshAccessToken]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (feedbackText.trim() && subjectId && accessToken) {
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
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          required
          disabled={isLoading || !accessToken}
        >
          <option value="" disabled>Selecione uma matéria</option>
          {subjects.map(subject => (
            <option key={subject.id} value={subject.id}>{translateSubject(subject.name)}</option>
          ))}
        </select>

        <textarea
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          placeholder="Seja específico. O que foi bom? O que pode melhorar?"
          rows="5"
          required
          disabled={isLoading || !accessToken}
        />

        <button type="submit" disabled={isLoading || !feedbackText.trim() || !subjectId || !accessToken}>
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
          </p>
        </div>
      )}
    </header>
  );
}

export default FeedbackForm;