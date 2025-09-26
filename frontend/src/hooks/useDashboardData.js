import { useState, useEffect } from 'react';

export function useDashboardData() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [feedbacksRes, keywordsRes] = await Promise.all([
          fetch('http://127.0.0.1:5000/feedbacks', { signal }),
          fetch('http://127.0.0.1:5000/keywords', { signal }),
        ]);

        if (!feedbacksRes.ok || !keywordsRes.ok) {
          throw new Error('A resposta da rede não foi OK');
        }

        const feedbacksData = await feedbacksRes.json();
        const keywordsData = await keywordsRes.json();
        
        // Adicionamos inteligência aqui para extrair o array da resposta
        const finalFeedbacks = Array.isArray(feedbacksData) ? feedbacksData : feedbacksData.feedbacks || [];
        const finalKeywords = Array.isArray(keywordsData) ? keywordsData : keywordsData.keywords || [];

        setFeedbacks(finalFeedbacks);
        setKeywords(finalKeywords);

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Erro ao buscar dados:", err);
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

  return { feedbacks, keywords, isLoading, error };
}