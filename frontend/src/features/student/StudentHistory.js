import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getMyFeedbacks, getSubjects } from '../../services/api';
import { getSentimentLabel, getSentimentColor } from '../../utils/sentiment';
import { translateSubject } from '../../utils/translations';
import SentimentTrendChart from '../../components/SentimentTrendChart';

function OverallGauge({ score }) {
  // score: 0–1, displayed as a semicircle gauge
  const angle = score * 180; // 0° = left (bad), 180° = right (good)
  const rad = ((angle - 90) * Math.PI) / 180;
  const cx = 80;
  const cy = 80;
  const r = 60;
  const x = cx + r * Math.cos(rad);
  const y = cy + r * Math.sin(rad);

  const color = score >= 0.6 ? '#28a745' : score >= 0.4 ? '#ffc107' : '#dc3545';
  const label = score >= 0.6 ? 'Indo bem!' : score >= 0.4 ? 'Atenção' : 'Precisa melhorar';

  return (
    <div className="gauge-wrapper">
      <svg width="160" height="100" viewBox="0 0 160 100">
        {/* Track */}
        <path
          d="M 20 80 A 60 60 0 0 1 140 80"
          fill="none"
          stroke="#e9ecef"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Fill arc up to score */}
        <path
          d={`M 20 80 A 60 60 0 ${angle > 90 ? 1 : 0} 1 ${x.toFixed(1)} ${y.toFixed(1)}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Needle dot */}
        <circle cx={x.toFixed(1)} cy={y.toFixed(1)} r="6" fill={color} />
        {/* Score text */}
        <text x="80" y="72" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>
          {(score * 4 + 1).toFixed(1)}
        </text>
        <text x="80" y="88" textAnchor="middle" fontSize="11" fill="#6c757d">
          de 5
        </text>
      </svg>
      <p className="gauge-label" style={{ color }}>{label}</p>
    </div>
  );
}

function StudentHistory() {
  const { accessToken, user } = useAuth();
  const [feedbacks, setFeedbacks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await getSubjects(accessToken);
        setSubjects(data);
      } catch {
      }
    };
    fetchSubjects();
  }, [accessToken]);

  useEffect(() => {
    const fetchFeedbacks = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getMyFeedbacks(selectedSubject || null, accessToken);
        setFeedbacks(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Erro ao carregar histórico.');
      } finally {
        setIsLoading(false);
      }
    };
    if (accessToken) fetchFeedbacks();
  }, [accessToken, selectedSubject]);

  const avgScore =
    feedbacks.length > 0
      ? feedbacks.reduce((sum, fb) => sum + fb.overall_score, 0) / feedbacks.length
      : null;

  const sentimentCounts = feedbacks.reduce(
    (acc, fb) => {
      const label = getSentimentLabel(fb.compound);
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    },
    { positivo: 0, neutro: 0, negativo: 0 }
  );

  return (
    <main className="student-history">
      <div className="history-header">
        <h1>Seu progresso, {user?.username}</h1>
        <p>Acompanhe como você tem se saído ao longo do tempo.</p>
      </div>

      <div className="history-filter">
        <label htmlFor="subject-history-filter">Filtrar por matéria:</label>
        <select
          id="subject-history-filter"
          value={selectedSubject}
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="">Todas as matérias</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {translateSubject(s.name)}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="loading-message">Carregando seu histórico...</p>}
      {error && <p className="error-message">{error}</p>}

      {!isLoading && !error && feedbacks.length === 0 && (
        <div className="history-empty">
          <p>Você ainda não enviou nenhum feedback. Que tal enviar o primeiro agora?</p>
        </div>
      )}

      {!isLoading && !error && feedbacks.length > 0 && (
        <>
          <div className="history-summary">
            <div className="history-gauge-card">
              <h3>Avaliação média geral</h3>
              <OverallGauge score={avgScore} />
              <p className="gauge-subtitle">{feedbacks.length} feedback(s) enviado(s)</p>
            </div>

            <div className="history-sentiment-pills">
              <h3>Clima dos seus comentários</h3>
              <div className="sentiment-pills">
                <span className="pill positivo">
                  {sentimentCounts.positivo} positivo{sentimentCounts.positivo !== 1 ? 's' : ''}
                </span>
                <span className="pill neutro">
                  {sentimentCounts.neutro} neutro{sentimentCounts.neutro !== 1 ? 's' : ''}
                </span>
                <span className="pill negativo">
                  {sentimentCounts.negativo} negativo{sentimentCounts.negativo !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          <div className="history-chart-card">
            <SentimentTrendChart feedbacks={feedbacks} groupBy="week" />
          </div>

          <div className="history-list">
            <h2>Seus feedbacks recentes</h2>
            {[...feedbacks].reverse().map((fb) => {
              const label = getSentimentLabel(fb.compound);
              const color = getSentimentColor(fb.compound);
              return (
                <div
                  key={fb.id}
                  className={`feedback-item ${label}-feedback`}
                >
                  <div className="feedback-header">
                    <strong>{translateSubject(fb.subject)}</strong>
                    <span className="feedback-meta">
                      {new Date(fb.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {fb.additional_comment && (
                    <p className="feedback-comment">"{fb.additional_comment}"</p>
                  )}

                  <div className="feedback-scores">
                    <span>
                      Avaliação:{' '}
                      <strong>{(fb.overall_score * 4 + 1).toFixed(1)}/5</strong>
                    </span>
                    {fb.compound !== null && (
                      <span style={{ color }}>
                        Comentário percebido como <strong>{label}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default StudentHistory;
