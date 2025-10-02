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

/**
 * Component to display a sentiment trend graph over time
 * @param {Array} feedbacks
 */
function SentimentTrendChart({ feedbacks }) {
  const processDataForChart = (feedbackList) => {
    if (!feedbackList || feedbackList.length === 0) {
      return { labels: [], data: [] };
    }

    const dailyScores = feedbackList.reduce((acc, fb) => {
      const date = new Date(fb.created_at).toLocaleDateString('pt-BR');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(fb.compound);
      return acc;
    }, {});

    // Calculate the average sentiment for each day and sort by date
      const sortedDates = Object.keys(dailyScores).sort((a, b) => {
      const [dayA, monthA, yearA] = a.split('/');
      const [dayB, monthB, yearB] = b.split('/');
      return new Date(`${yearA}-${monthA}-${dayA}`) - new Date(`${yearB}-${monthB}-${dayB}`);
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
        fill: false,
        backgroundColor: 'rgba(74, 144, 226, 0.8)',
        borderColor: 'rgba(74, 144, 226, 1)',
        tension: 0.1,
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
          size: 16,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        min: -1, 
        max: 1,
        title: {
            display: true,
            text: 'Média de Sentimento'
        }
      },
      x: {
        title: {
            display: true,
            text: 'Data'
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