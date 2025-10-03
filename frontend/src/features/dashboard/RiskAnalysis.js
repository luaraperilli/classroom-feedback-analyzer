// Este arquivo deve ser salvo em: frontend/src/features/dashboard/RiskAnalysis.js

import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getStudentsAtRisk, getSubjects } from '../../services/api';
import { translateSubject } from '../../utils/translations';

const getRiskColor = (riskLevel) => {
  const colors = {
    'baixo': '#28a745',
    'medio': '#ffc107',
    'alto': '#dc3545'
  };
  return colors[riskLevel] || '#6c757d';
};

const getRiskIcon = (riskLevel) => {
  const icons = {
    'baixo': '✅',
    'medio': '⚠️',
    'alto': '🚨'
  };
  return icons[riskLevel] || '❓';
};

const getRiskLabel = (riskLevel) => {
  const labels = {
    'baixo': 'Baixo Risco',
    'medio': 'Risco Moderado',
    'alto': 'Alto Risco'
  };
  return labels[riskLevel] || 'Desconhecido';
};

function RiskAnalysis() {
  const [studentsAtRisk, setStudentsAtRisk] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [minRiskLevel, setMinRiskLevel] = useState('medio');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken } = useAuth();

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const data = await getSubjects(accessToken);
        setSubjects(data);
      } catch (e) {
        console.error("Erro ao buscar matérias", e);
      }
    };
    fetchSubjects();
  }, [accessToken]);

  useEffect(() => {
    const fetchRiskData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await getStudentsAtRisk(
          selectedSubject || null,
          minRiskLevel,
          accessToken
        );
        setStudentsAtRisk(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchRiskData();
    }
  }, [selectedSubject, minRiskLevel, accessToken]);

  const groupByRiskLevel = () => {
    const grouped = {
      alto: [],
      medio: [],
      baixo: []
    };

    studentsAtRisk.forEach(student => {
      if (grouped[student.risk_level]) {
        grouped[student.risk_level].push(student);
      }
    });

    return grouped;
  };

  const grouped = groupByRiskLevel();

  return (
    <div className="risk-analysis-container">
      <div className="risk-header">
        <h2>🎯 Análise de Risco de Evasão</h2>
        <p>Identificação de alunos que podem precisar de atenção especial</p>
      </div>

      <div className="risk-filters">
        <div className="filter-group">
          <label>Matéria:</label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
          >
            <option value="">Todas as matérias</option>
            {subjects.map(subject => (
              <option key={subject.id} value={subject.id}>
                {translateSubject(subject.name)}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Nível mínimo:</label>
          <select
            value={minRiskLevel}
            onChange={(e) => setMinRiskLevel(e.target.value)}
          >
            <option value="baixo">Baixo e acima</option>
            <option value="medio">Moderado e acima</option>
            <option value="alto">Apenas alto risco</option>
          </select>
        </div>
      </div>

      {isLoading && <p className="loading-message">Carregando análise...</p>}
      {error && <p className="error-message">Erro: {error}</p>}

      {!isLoading && !error && (
        <div className="risk-summary">
          <div className="risk-stat high">
            <span className="stat-number">{grouped.alto.length}</span>
            <span className="stat-label">Alto Risco</span>
          </div>
          <div className="risk-stat medium">
            <span className="stat-number">{grouped.medio.length}</span>
            <span className="stat-label">Risco Moderado</span>
          </div>
          <div className="risk-stat low">
            <span className="stat-number">{grouped.baixo.length}</span>
            <span className="stat-label">Baixo Risco</span>
          </div>
        </div>
      )}

      {!isLoading && !error && studentsAtRisk.length === 0 && (
        <div className="no-risk-message">
          <span className="success-icon">🎉</span>
          <p>Nenhum aluno identificado nos critérios selecionados!</p>
        </div>
      )}

      {!isLoading && !error && studentsAtRisk.length > 0 && (
        <div className="students-risk-list">
          {['alto', 'medio', 'baixo'].map(level => (
            grouped[level].length > 0 && (
              <div key={level} className="risk-level-section">
                <h3 className="risk-level-title" style={{ color: getRiskColor(level) }}>
                  {getRiskIcon(level)} {getRiskLabel(level)} ({grouped[level].length})
                </h3>
                
                <div className="students-grid">
                  {grouped[level].map(student => (
                    <div 
                      key={`${student.student_id}-${student.subject_id}`} 
                      className="student-risk-card"
                      style={{ borderLeftColor: getRiskColor(student.risk_level) }}
                    >
                      <div className="student-info">
                        <h4>{student.student_username}</h4>
                        <p className="subject-name">{translateSubject(student.subject_name)}</p>
                      </div>
                      
                      <div className="risk-metrics">
                        <div className="metric">
                          <span className="metric-label">Score Médio</span>
                          <span className="metric-value">
                            {(student.average_score * 4 + 1).toFixed(1)}/5
                          </span>
                        </div>
                        
                        {student.average_sentiment !== null && (
                          <div className="metric">
                            <span className="metric-label">Sentimento</span>
                            <span className="metric-value">
                              {student.average_sentiment > 0 ? '😊' : student.average_sentiment < 0 ? '😞' : '😐'}
                              {' '}{student.average_sentiment.toFixed(2)}
                            </span>
                          </div>
                        )}
                        
                        <div className="metric">
                          <span className="metric-label">Feedbacks</span>
                          <span className="metric-value">{student.feedback_count}</span>
                        </div>
                        
                        <div className="metric">
                          <span className="metric-label">Risco</span>
                          <span 
                            className="metric-value risk-score"
                            style={{ color: getRiskColor(student.risk_level) }}
                          >
                            {(student.risk_score * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export default RiskAnalysis;