import React, { useState, useEffect } from 'react';
import { useDashboardData } from './useDashboardData';
import SentimentSummary from '../../components/SentimentSummary';
import SentimentTrendChart from '../../components/SentimentTrendChart';
import RiskAnalysis from './RiskAnalysis';
import { useAuth } from '../auth/AuthContext';
import { translateSubject } from '../../utils/translations';
import { getSubjects } from '../../services/api';

const getSentimentClass = (compound) => {
    if (compound >= 0.05) return 'positive-feedback';
    if (compound <= -0.05) return 'negative-feedback';
    return 'neutral-feedback';
};

const getCompoundColor = (compound) => {
    if (compound >= 0.05) return '#28a745';
    if (compound <= -0.05) return '#dc3545';
    return '#6c757d';
};

function Dashboard() {
  const [selectedSubject, setSelectedSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [period, setPeriod] = useState('all');
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const [activeTab, setActiveTab] = useState('feedbacks'); // 'feedbacks' ou 'risk'
  const { feedbacks, isLoading, error } = useDashboardData(selectedSubject, dateRange);
  const { accessToken, user } = useAuth();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await getSubjects(accessToken);
        setSubjects(data);
      } catch (e) {
        console.error("Erro ao buscar matérias", e);
      }
    };
    if (user.role === 'professor' || user.role === 'coordenador') {
        fetchSubjects();
    }
  }, [accessToken, user.role]);

  useEffect(() => {
    const now = new Date();
    let startDate = null;
    const endDate = new Date();

    switch (period) {
      case '7days':
        startDate = new Date();
        startDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        startDate = new Date();
        startDate.setDate(now.getDate() - 30);
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = null;
        break;
    }

    if (startDate) {
        startDate.setHours(0, 0, 0, 0);
    }

    setDateRange({ startDate, endDate: period === 'all' ? null : endDate });
  }, [period]);

  if (isLoading && !feedbacks.length && activeTab === 'feedbacks') {
    return <p className="loading-message">Carregando dashboard...</p>;
  }

  if (error && activeTab === 'feedbacks') {
    return <p className="error-message">Erro ao carregar dados: {error}</p>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="filters-wrapper">
          <div className="filter-container">
            <label htmlFor="period-filter">Período:</label>
            <select
              id="period-filter"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
            >
              <option value="all">Desde o início</option>
              <option value="7days">Últimos 7 dias</option>
              <option value="30days">Últimos 30 dias</option>
              <option value="this_month">Este mês</option>
            </select>
          </div>
          <div className="filter-container">
            <label htmlFor="subject-filter">Matéria:</label>
            <select
              id="subject-filter"
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="">Todas</option>
              {subjects.map(subject => (
                <option key={subject.id} value={subject.id}>{translateSubject(subject.name)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'feedbacks' ? 'active' : ''}`}
          onClick={() => setActiveTab('feedbacks')}
        >
          Feedbacks
        </button>
        <button 
          className={`tab-button ${activeTab === 'risk' ? 'active' : ''}`}
          onClick={() => setActiveTab('risk')}
        >
          Análise de Risco
        </button>
      </div>

      {activeTab === 'feedbacks' && (
        <>
          <div className="grid-container">
            <SentimentSummary feedbacks={feedbacks} />
            <div className="chart">
              <SentimentTrendChart feedbacks={feedbacks} />
            </div>
          </div>

          <div className="feedback-list">
            <h2>Feedbacks Recentes</h2>
            {isLoading && <p>Atualizando...</p>}
            {!isLoading && feedbacks.length === 0 ? (
              <p>Nenhum feedback recebido para os filtros selecionados.</p>
            ) : (
              feedbacks.map((fb) => (
                <div key={fb.id} className={`feedback-item ${getSentimentClass(fb.compound || 0)}`}>
                  <div className="feedback-header">
                    <strong>{fb.student_username}</strong>
                    <span className="feedback-meta">
                      <strong>{translateSubject(fb.subject)}</strong> | 
                      {' '}{new Date(fb.created_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="feedback-ratings">
                    <div className="rating-item">
                      <span className="rating-icon">🙋‍♂️</span>
                      <span>Participação: {fb.active_participation}/5</span>
                    </div>
                    <div className="rating-item">
                      <span className="rating-icon">📅</span>
                      <span>Tarefas: {fb.task_completion}/5</span>
                    </div>
                    <div className="rating-item">
                      <span className="rating-icon">💡</span>
                      <span>Motivação: {fb.motivation_interest}/5</span>
                    </div>
                    <div className="rating-item">
                      <span className="rating-icon">🤗</span>
                      <span>Ambiente: {fb.welcoming_environment}/5</span>
                    </div>
                    <div className="rating-item">
                      <span className="rating-icon">📚</span>
                      <span>Esforço: {fb.comprehension_effort}/5</span>
                    </div>
                    <div className="rating-item">
                      <span className="rating-icon">🔗</span>
                      <span>Conexão: {fb.content_connection}/5</span>
                    </div>
                  </div>

                  {fb.additional_comment && (
                    <p className="feedback-comment">💬 "{fb.additional_comment}"</p>
                  )}

                  <div className="feedback-scores">
                    <span>Score Geral: <strong>{(fb.overall_score * 4 + 1).toFixed(1)}/5</strong></span>
                    {fb.compound !== null && (
                      <span>
                        Sentimento: 
                        <strong style={{ color: getCompoundColor(fb.compound) }}>
                          {' '}{fb.compound.toFixed(2)}
                        </strong>
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {activeTab === 'risk' && <RiskAnalysis />}
    </div>
  );
}

export default Dashboard;