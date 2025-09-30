import { useState, useEffect } from 'react';

export function useDashboardData() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('http://127.0.0.1:5000/feedbacks', { signal });

        if (!res.ok) {
          throw new Error('A resposta da rede não foi OK');
        }

        const data = await res.json();
        setFeedbacks(Array.isArray(data) ? data : []);

      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      controller.abort();
    };
  }, []);

  return { feedbacks, isLoading, error };
}