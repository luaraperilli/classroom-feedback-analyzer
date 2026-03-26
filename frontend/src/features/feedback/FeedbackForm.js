import React, { useState, useEffect } from 'react';
import '../../App.css';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects, analyzeFeedback } from '../../services/api';
import SentimentResult from '../student/SentimentResult';

const QUESTIONS = [
  {
    id: 'active_participation',
    label: 'Participo ativamente das aulas e atividades propostas pelo professor.',
    pillar: 'Comportamental',
    icon: '🙋‍♂️',
  },
  {
    id: 'task_completion',
    label: 'Cumpro as tarefas e prazos estabelecidos na disciplina com regularidade.',
    pillar: 'Comportamental',
    icon: '📅',
  },
  {
    id: 'motivation_interest',
    label: 'Sinto-me motivado(a) e interessado(a) pelos conteúdos trabalhados nesta disciplina.',
    pillar: 'Emocional',
    icon: '💡',
  },
  {
    id: 'welcoming_environment',
    label: 'Sinto que o ambiente de aula é acolhedor e me estimula a continuar participando.',
    pillar: 'Emocional',
    icon: '🤗',
  },
  {
    id: 'comprehension_effort',
    label: 'Dedico tempo e esforço para compreender os conceitos apresentados em aula.',
    pillar: 'Cognitivo',
    icon: '📚',
  },
  {
    id: 'content_connection',
    label: 'Consigo relacionar os conteúdos desta disciplina com situações práticas ou outras matérias.',
    pillar: 'Cognitivo',
    icon: '🔗',
  },
];

const RATING_LABELS = {
  1: 'Muito insatisfeito',
  2: 'Insatisfeito',
  3: 'Neutro',
  4: 'Satisfeito',
  5: 'Muito satisfeito',
};

function RatingQuestion({ question, value, onChange }) {
  return (
    <div className="rating-question">
      <label className="question-label">
        <span className="question-icon">{question.icon}</span>
        <div>
          <span className="question-pillar">{question.pillar}</span>
          <br />
          {question.label}
        </div>
      </label>
      <div className="rating-options">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            className={`rating-button ${value === rating ? 'selected' : ''}`}
            onClick={() => onChange(question.id, rating)}
            title={RATING_LABELS[rating]}
          >
            {rating}
          </button>
        ))}
      </div>
      {value && <p className="rating-label">{RATING_LABELS[value]}</p>}
    </div>
  );
}

function ProgressSteps({ subjectId, allAnswered, hasComment }) {
  const steps = [
    { label: 'Matéria', done: !!subjectId },
    { label: 'Avaliação', done: allAnswered },
    { label: 'Comentário', done: hasComment },
  ];

  return (
    <div className="progress-steps">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          <div className={`progress-step ${step.done ? 'done' : ''}`}>
            <div className="step-circle">{step.done ? '✓' : i + 1}</div>
            <span className="step-label">{step.label}</span>
          </div>
          {i < steps.length - 1 && <div className={`step-connector ${step.done ? 'done' : ''}`} />}
        </React.Fragment>
      ))}
    </div>
  );
}

function FeedbackForm() {
  const [subjectId, setSubjectId] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [ratings, setRatings] = useState({});
  const [additionalComment, setAdditionalComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedFeedback, setSubmittedFeedback] = useState(null);
  const { accessToken, user, logout, refreshAccessToken } = useAuth();

  useEffect(() => {
    if (!accessToken) return;
    getSubjects(accessToken)
      .then(setSubjects)
      .catch(() => {});
  }, [accessToken]);

  const handleRatingChange = (questionId, value) => {
    setRatings((prev) => ({ ...prev, [questionId]: value }));
  };

  const allQuestionsAnswered = QUESTIONS.every((q) => ratings[q.id]);
  const hasComment = additionalComment.trim() !== '';
  const isFormValid = allQuestionsAnswered && subjectId && hasComment;

  const handleSubmit = async (event, retry = false) => {
    if (event) event.preventDefault();
    if (!isFormValid || !accessToken) return;

    setIsLoading(true);
    setError(null);

    const payload = {
      subject_id: parseInt(subjectId),
      active_participation: ratings.active_participation,
      task_completion: ratings.task_completion,
      motivation_interest: ratings.motivation_interest,
      welcoming_environment: ratings.welcoming_environment,
      comprehension_effort: ratings.comprehension_effort,
      content_connection: ratings.content_connection,
      additional_comment: additionalComment.trim(),
    };

    try {
      const data = await analyzeFeedback(payload, accessToken);
      setSubmittedFeedback(data);
    } catch (err) {
      if (err.message.includes('401') && !retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return handleSubmit(null, true);
        } else {
          logout();
          setError('Sessão expirada. Por favor, faça login novamente.');
        }
      } else {
        setError(err.message || 'Falha ao enviar o feedback.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSubjectId('');
    setRatings({});
    setAdditionalComment('');
    setSubmittedFeedback(null);
    setError(null);
  };

  if (submittedFeedback) {
    return (
      <main className="App-header">
        <h1>Obrigado, {user?.username}!</h1>
        <p>Seu feedback foi registrado com sucesso.</p>
        <SentimentResult feedback={submittedFeedback} onClose={handleReset} />
      </main>
    );
  }

  return (
    <main className="App-header">
      <h1>Olá, {user?.username}!</h1>
      <p>Como foi a aula de hoje? Sua opinião é muito importante.</p>

      <ProgressSteps
        subjectId={subjectId}
        allAnswered={allQuestionsAnswered}
        hasComment={hasComment}
      />

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
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {translateSubject(subject.name)}
              </option>
            ))}
          </select>
        </div>

        {subjectId && (
          <>
            <div className="form-section">
              <h3 className="section-title">Avalie seu engajamento na aula</h3>
              <p className="section-subtitle">
                Use a escala de 1 (muito insatisfeito) a 5 (muito satisfeito)
              </p>
              <div className="questions-container">
                {QUESTIONS.map((question) => (
                  <RatingQuestion
                    key={question.id}
                    question={question}
                    value={ratings[question.id]}
                    onChange={handleRatingChange}
                  />
                ))}
              </div>
            </div>

            <div className="form-section">
              <label htmlFor="comment" className="section-title">
                Comentário sobre a aula
              </label>
              <textarea
                id="comment"
                value={additionalComment}
                onChange={(e) => setAdditionalComment(e.target.value)}
                placeholder="Como foi a aula? O que você achou do ritmo, dos conteúdos ou do ambiente?"
                rows="4"
                disabled={isLoading || !accessToken}
                className="comment-textarea"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !isFormValid || !accessToken}
              className="submit-feedback-button"
            >
              {isLoading ? 'Enviando...' : 'Enviar feedback'}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default FeedbackForm;
