import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData() {
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
      const res = await fetch(`${API_BASE_URL}/feedbacks`, {
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
  }, [accessToken, logout, refreshAccessToken, API_BASE_URL]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { feedbacks, isLoading, error, fetchData };
}

