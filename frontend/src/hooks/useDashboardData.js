import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData(subjectId, dateRange) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { accessToken, logout, refreshAccessToken, API_BASE_URL } = useAuth();

  const fetchData = useCallback(async (retry = false) => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const url = new URL(`${API_BASE_URL}/feedbacks`);
      if (subjectId) {
        url.searchParams.append('subject_id', subjectId);
      }
      
      if (dateRange && dateRange.startDate) {
        url.searchParams.append('start_date', dateRange.startDate.toISOString());
      }
      if (dateRange && dateRange.endDate) {
        url.searchParams.append('end_date', dateRange.endDate.toISOString());
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (res.status === 401 && !retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) {
          return fetchData(true);
        } else {
          logout();
          setError('Sessão expirada. Por favor, faça login novamente.');
          return;
        }
      } else if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `A resposta da rede não foi OK (status: ${res.status})`);
      }

      const data = await res.json();
      setFeedbacks(Array.isArray(data) ? data : []);

    } catch (err) {
      console.error("Erro detalhado no fetch:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, logout, refreshAccessToken, API_BASE_URL, subjectId, dateRange]);

  useEffect(() => {
    if (dateRange) {
        fetchData();
    }
  }, [fetchData, dateRange]);

  return { feedbacks, isLoading, error, fetchData };
}