import { useState, useEffect, useRef } from 'react';

export function useDashboardData() {
  const [state, setState] = useState({
    feedbacks: [],
    keywords: [],
    isLoading: true,
    error: null
  });
  
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    console.log('useDashboardData: Executando ÚNICA vez');

    const fetchData = async () => {
      try {
        console.log('Fazendo fetch...');
        
        const feedbacksRes = await fetch('http://127.0.0.1:5000/feedbacks');
        const keywordsRes = await fetch('http://127.0.0.1:5000/keywords');

        const feedbacksData = feedbacksRes.ok ? await feedbacksRes.json() : [];
        const keywordsData = keywordsRes.ok ? await keywordsRes.json() : [];

        console.log('Dados recebidos - Feedbacks:', feedbacksData.length, 'Keywords:', keywordsData.length);

        setState({
          feedbacks: Array.isArray(feedbacksData) ? feedbacksData : [],
          keywords: Array.isArray(keywordsData) ? keywordsData : [],
          isLoading: false,
          error: null
        });

        console.log('Estado atualizado com sucesso');

      } catch (error) {
        console.error('Erro:', error);
        setState({
          feedbacks: [],
          keywords: [],
          isLoading: false,
          error: error.message
        });
      }
    };

    fetchData();
  }, []); 

  return state;
}