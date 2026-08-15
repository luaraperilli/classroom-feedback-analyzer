import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getFeedbacks } from '../../services/api';

export function useDashboardData(subjectId, dateRange) {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const { accessToken } = useAuth();
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => { montadoRef.current = false; };
  }, []);

  // A renovação do token e a repetição da requisição ficam na camada de API.
  const buscar = useCallback(async () => {
    if (!accessToken) {
      if (montadoRef.current) setIsLoading(false);
      return;
    }

    if (montadoRef.current) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const dados = await getFeedbacks(subjectId, dateRange, accessToken);
      if (montadoRef.current) setFeedbacks(Array.isArray(dados) ? dados : []);
    } catch (err) {
      if (montadoRef.current) setError(err.message || 'Erro ao carregar os dados.');
    } finally {
      if (montadoRef.current) setIsLoading(false);
    }
  }, [accessToken, subjectId, dateRange]);

  useEffect(() => {
    if (dateRange) buscar();
  }, [buscar, dateRange]);

  return { feedbacks, isLoading, error };
}
