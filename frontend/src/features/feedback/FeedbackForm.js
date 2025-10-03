import React, { useState, useCallback, useEffect } from 'react';
import '../../App.css';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, analyzeFeedback } from '../../services/api';

const questions = [
  {
    id: 'material_quality',
    label: 'Como você avalia a qualidade do material didático?',
    icon: '📚'
  },
  {
    id: 'teaching_method',
    label: 'Como você avalia a didática do professor?',
    icon: '👨‍🏫'
  },
  {
    id: 'content_understanding',
    label: 'Quanto você conseguiu compreender do conteúdo?',
    icon: '🧠'
  },
  {
    id: 'class_pace',
    label: 'O ritmo da aula estava adequado?',
    icon: '⏱️'
  },
  {
    id: 'practical_examples',
    label: 'Os exemplos práticos ajudaram no aprendizado?',
    icon: '💡'
  }
];

const ratingLabels = {
  1: 'Muito insatisfeito',
  2: 'Insatisfeito',
  3: 'Neutro',
  4: 'Satisfeito',
  5: 'Muito satisfeito'
};

function RatingQuestion({ question, value, onChange }) {
  return (
    <div className="rating-question">
      <label className="question-label">
        <span className="question-icon">{question.icon}</span>
        {question.label}
      </label>
      <div className="rating-options">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            className={`rating-button ${value === rating ? 'selected' : ''}`}
            onClick={() => onChange(question.id, rating)}
            title={ratingLabels[rating]}
          >
            {rating}
          </button>
        ))}
      </div>
      {value && (
        <p className="rating-label">{ratingLabels[value]}</p>
      )}
    </div>
  );
}

function FeedbackForm() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [ratings, setRatings] = useState({});
  const [additionalComment, setAdditionalComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [showResult, setShowResult] = useState(false);
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

  const handleRatingChange = (questionId, value) => {
    setRatings(prev => ({ ...prev, [questionId]: value }));
  };

  const allQuestionsAnswered = questions.every(q => ratings[q.id]);

  const sendFeedback = useCallback(async (retry = false) => {
    setIsLoading(true);
    setMessage(null);
    setError(null);

    const payload = {
      subject_id: parseInt(subjectId),
      material_quality: ratings.material_quality,
      teaching_method: ratings.teaching_method,
      content_understanding: ratings.content_understanding,
      class_pace: ratings.class_pace,
      practical_examples: ratings.practical_examples,
      additional_comment: additionalComment.trim() || null
    };

    try {
      const data = await analyzeFeedback(payload, accessToken);
      setMessage('Feedback enviado com sucesso! Obrigado pela participação.');
      setShowResult(true);
      
      setTimeout(() => {
        setSubjectId('');
        setRatings({});
        setAdditionalComment('');
        setShowResult(false);
      }, 3000);
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
        setError(err.message || 'Falha ao enviar o feedback.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [subjectId, ratings, additionalComment, accessToken, logout, refreshAccessToken]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (allQuestionsAnswered && subjectId && accessToken) {
      sendFeedback();
    }
  };

  const calculateAverageScore = () => {
    const values = Object.values(ratings);
    if (values.length === 0) return 0;
    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  return (
    <header className="App-header">
      <h1>Olá, {user?.username}!</h1>
      <p>Como foi a aula de hoje? Sua opinião é muito importante.</p>

      {message && (
        <div className="success-message-card">
          <span className="success-icon">✅</span>
          <p>{message}</p>
        </div>
      )}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} className="structured-feedback-form">
        <div className="form-section">
          <label htmlFor="subject-select" className="section-title">
            Selecione a matéria
          </label>
          <select
            id="subject-select"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            required
            disabled={isLoading || !accessToken}
            className="subject-select"
          >
            <option value="" disabled>Escolha uma matéria...</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {translateSubject(subject.name)}
              </option>
            ))}
          </select>
        </div>

        {subjectId && (
          <>
            <div className="form-section">
              <h3 className="section-title">Avalie os aspectos da aula</h3>
              <p className="section-subtitle">
                Use a escala de 1 (muito insatisfeito) a 5 (muito satisfeito)
              </p>
              
              <div className="questions-container">
                {questions.map(question => (
                  <RatingQuestion
                    key={question.id}
                    question={question}
                    value={ratings[question.id]}
                    onChange={handleRatingChange}
                  />
                ))}
              </div>

              {allQuestionsAnswered && (
                <div className="average-score">
                  <span>Sua avaliação média: </span>
                  <strong>{calculateAverageScore()}/5</strong>
                </div>
              )}
            </div>

            <div className="form-section">
              <label htmlFor="comment" className="section-title">
                Comentário Adicional
              </label>
              <textarea
                id="comment"
                value={additionalComment}
                onChange={(e) => setAdditionalComment(e.target.value)}
                placeholder="Gostaria de adicionar algum comentário? O que foi bom? O que pode melhorar?"
                rows="4"
                disabled={isLoading || !accessToken}
                className="comment-textarea"
              />
            </div>

            <button 
              type="submit" 
              disabled={isLoading || !allQuestionsAnswered || !subjectId || !accessToken}
              className="submit-feedback-button"
            >
              {isLoading ? 'Enviando...' : 'Enviar Feedback'}
            </button>
          </>
        )}
      </form>

      {showResult && (
        <div className="feedback-success-animation">
          <div className="success-checkmark">✓</div>
          <p>Feedback registrado!</p>
        </div>
      )}
    </header>
  );
}

export default FeedbackForm;