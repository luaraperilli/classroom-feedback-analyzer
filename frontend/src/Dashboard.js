import React, { useState, useEffect } from 'react';
import { useDashboardData } from './hooks/useDashboardData';
import SentimentSummary from './components/SentimentSummary';
import SentimentTrendChart from './components/SentimentTrendChart';
import { useAuth } from './AuthContext';
import { translateSubject } from './utils/translations';

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
  const [period, setPeriod] = useState('all'); // Novo estado para o período
  const [dateRange, setDateRange] = useState({ startDate: null, endDate: null });
  const { feedbacks, isLoading, error } = useDashboardData(selectedSubject, dateRange);
  const { accessToken, API_BASE_URL, user } = useAuth();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/subjects`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const data = await res.json();
        setSubjects(data);
      } catch (e) {
        console.error("Erro ao buscar matérias", e);
      }
    };
    if (user.role === 'professor' || user.role === 'coordenador') {
        fetchSubjects();
    }
  }, [accessToken, API_BASE_URL, user.role]);

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

    setDateRange({ startDate, endDate });
  }, [period]);

  if (isLoading) {
    return <p className="loading-message">Carregando dashboard...</p>;
  }

  if (error) {
    return <p className="error-message">Erro ao carregar dados: {error}</p>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard do Professor</h1>
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
      
      <div className="grid-container">
        <SentimentSummary feedbacks={feedbacks} />
        <div className="chart">
          <SentimentTrendChart feedbacks={feedbacks} />
        </div>
      </div>

      <div className="feedback-list">
        <h2>Feedbacks Recentes</h2>
        {feedbacks && feedbacks.length > 0 ? (
          feedbacks.map((fb) => (
            <div key={fb.id} className={`feedback-item ${getSentimentClass(fb.compound)}`}>
              <p>"{fb.text}"</p>
              <small>
                <strong>Matéria: {translateSubject(fb.subject)}</strong> | Nota de Sentimento: 
                <strong style={{ color: getCompoundColor(fb.compound) }}>
                  {' '}{fb.compound.toFixed(4)}
                </strong> 
                {' '}| Recebido em: {new Date(fb.created_at).toLocaleString()}
              </small>
            </div>
          ))
        ) : (
          <p>Nenhum feedback recebido para o período selecionado.</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;