import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getSentimentLabel, getSentimentColor, getSentimentMessage } from '../../utils/sentiment';

function ScoreBar({ score }) {
  // score: 0 to 1 (normalised overall_score from backend)
  const percent = Math.round(score * 100);
  const color = score >= 0.6 ? '#28a745' : score >= 0.4 ? '#ffc107' : '#dc3545';

  return (
    <div className="score-bar-wrapper">
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{ width: `${percent}%`, backgroundColor: color }}
        />
      </div>
      <span className="score-bar-label" style={{ color }}>
        {(score * 4 + 1).toFixed(1)} / 5
      </span>
    </div>
  );
}

function SentimentResult({ feedback, onClose }) {
  const navigate = useNavigate();
  const sentimentLabel = getSentimentLabel(feedback.compound);
  const sentimentColor = getSentimentColor(feedback.compound);
  const sentimentMessage = getSentimentMessage(feedback.compound);

  const sentimentEmoji = { positivo: '😊', neutro: '😐', negativo: '😔' }[sentimentLabel];

  return (
    <div className="sentiment-result-card">
      <div className="sentiment-result-header" style={{ borderTopColor: sentimentColor }}>
        <span className="sentiment-result-emoji">{sentimentEmoji}</span>
        <h3 className="sentiment-result-title" style={{ color: sentimentColor }}>
          Sentimento {sentimentLabel}
        </h3>
        <p className="sentiment-result-message">{sentimentMessage}</p>
      </div>

      <div className="sentiment-result-body">
        <p className="sentiment-result-metric-label">Sua avaliação geral desta aula</p>
        <ScoreBar score={feedback.overall_score} />
      </div>

      <div className="sentiment-result-actions">
        <button className="btn-historico" onClick={() => navigate('/historico')}>
          Ver meu progresso
        </button>
        <button className="btn-fechar" onClick={onClose}>
          Enviar outro feedback
        </button>
      </div>
    </div>
  );
}

export default SentimentResult;
