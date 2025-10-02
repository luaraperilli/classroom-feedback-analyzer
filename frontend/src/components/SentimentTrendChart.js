import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function SentimentTrendChart({ feedbacks }) {
  const processDataForChart = (feedbackList) => {
    if (!feedbackList || feedbackList.length === 0) {
      return { labels: [], data: [] };
    }

    const dailyScores = feedbackList.reduce((acc, fb) => {
      const date = new Date(fb.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(fb.compound);
      return acc;
    }, {});

    const sortedDates = Object.keys(dailyScores).sort((a, b) => {
      const [dayA, monthA] = a.split('/');
      const [dayB, monthB] = b.split('/');
      return new Date(`2024-${monthA}-${dayA}`) - new Date(`2024-${monthB}-${dayB}`);
    });
    
    const labels = sortedDates;
    const data = sortedDates.map(date => {
      const scores = dailyScores[date];
      const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      return average.toFixed(2);
    });

    return { labels, data };
  };

  const { labels, data: chartData } = processDataForChart(feedbacks);

  const data = {
    labels: labels,
    datasets: [
      {
        label: 'Média de Sentimento Diário',
        data: chartData,
        fill: true,
        backgroundColor: 'rgba(74, 144, 226, 0.2)',
        borderColor: 'rgba(74, 144, 226, 1)',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 8,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Tendência de Sentimento ao Longo do Tempo',
        font: {
          size: 18,
        },
      },
      subtitle: {
        display: true,
        text: 'A linha representa a média de sentimento (-1 a +1) de todos os feedbacks recebidos em cada dia.',
        padding: {
            bottom: 20
        }
      },
      tooltip: {
        callbacks: {
            footer: function(tooltipItems) {
                return 'Nota: -1 (Negativo) a +1 (Positivo)';
            }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: -1, 
        max: 1,
        title: {
            display: true,
            text: 'Média de Sentimento (Negativo ◄ ► Positivo)',
            font: {
                size: 14
            }
        }
      },
      x: {
        title: {
            display: true,
            text: 'Data de Recebimento',
            font: {
                size: 14
            }
        }
      }
    },
  };

  return (
    <div>
      {feedbacks && feedbacks.length > 0 ? (
        <Line options={options} data={data} />
      ) : (
        <p>Dados insuficientes para gerar o gráfico de tendência.</p>
      )}
    </div>
  );
}

export default SentimentTrendChart;