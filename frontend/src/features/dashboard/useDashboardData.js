import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getFeedbacks } from '../../services/api';

export function useDashboardData(subjectId, dateRange) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken, logout, refreshAccessToken } = useAuth();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchData = useCallback(async (retry = false) => {
    if (!accessToken) {
      if (isMountedRef.current) setIsLoading(false);
      return;
    }

    if (isMountedRef.current) { setIsLoading(true); setError(null); }

    try {
      const data = await getFeedbacks(subjectId, dateRange, accessToken);
      if (isMountedRef.current) setFeedbacks(Array.isArray(data) ? data : []);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (err.message.includes('401') && !retry) {
        const refreshed = await refreshAccessToken();
        if (refreshed) return fetchData(true);
        logout();
        setError('Sessão expirada. Por favor, faça login novamente.');
      } else {
        setError(err.message || 'Erro ao carregar os dados.');
      }
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [accessToken, logout, refreshAccessToken, subjectId, dateRange]);

  useEffect(() => {
    if (dateRange) fetchData();
  }, [fetchData, dateRange]);

  return { feedbacks, isLoading, error };
}
