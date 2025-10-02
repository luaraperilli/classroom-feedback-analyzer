import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';

export function useDashboardData() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      console.log("Tentando buscar dados com o token:", token);

      try {
        const res = await fetch('http://127.0.0.1:5000/feedbacks', {
          signal,
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!res.ok) {
          throw new Error(`A resposta da rede não foi OK (status: ${res.status})`);
        }

        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : []);

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Erro detalhado no fetch:", err);
          setError(err.message);
        }
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, [token]);

  return { feedbacks, isLoading, error };
}