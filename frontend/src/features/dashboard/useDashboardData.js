import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getFeedbacks } from '../../services/api';

export function useDashboardData(subjectId, dateRange) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, logout, refreshAccessToken } = useAuth();

  const fetchData = useCallback(async (retry = false) => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getFeedbacks(subjectId, dateRange, accessToken);
      setFeedbacks(Array.isArray(data) ? data : []);
    } catch (err) {
        if (err.message.toLowerCase().includes('token') && !retry) {
            const refreshed = await refreshAccessToken();
            if (refreshed) {
              return fetchData(true);
            } else {
              logout();
              setError('Sessão expirada. Por favor, faça login novamente.');
            }
        } else {
            console.error("Erro detalhado no fetch:", err);
            setError(err.message || 'Erro ao carregar os dados.');
        }
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, logout, refreshAccessToken, subjectId, dateRange]);

  useEffect(() => {
    if (dateRange) {
        fetchData();
    }
  }, [fetchData, dateRange]);

  return { feedbacks, isLoading, error, fetchData };
}