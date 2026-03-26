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
import { getWeekLabel } from '../utils/sentiment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const groupFeedbacksByDay = (feedbackList) => {
  const groups = feedbackList.reduce((acc, fb) => {
    const date = new Date(fb.created_at);
    const key = date.toISOString().split('T')[0]; // YYYY-MM-DD ensures correct sort
    const label = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!acc[key]) acc[key] = { label, scores: [] };
    acc[key].scores.push(fb.compound);
    return acc;
  }, {});

  return Object.keys(groups)
    .sort()
    .map((key) => ({
      label: groups[key].label,
      avg: groups[key].scores.reduce((s, v) => s + v, 0) / groups[key].scores.length,
    }));
};

const groupFeedbacksByWeek = (feedbackList) => {
  const groups = feedbackList.reduce((acc, fb) => {
    const key = getWeekLabel(fb.created_at);
    if (!acc[key]) acc[key] = { scores: [] };
    acc[key].scores.push(fb.compound);
    return acc;
  }, {});

  return Object.keys(groups).map((key) => ({
    label: key,
    avg: groups[key].scores.reduce((s, v) => s + v, 0) / groups[key].scores.length,
  }));
};

function SentimentTrendChart({ feedbacks, groupBy = 'day' }) {
  if (!feedbacks || feedbacks.length === 0) {
    return <p>Dados insuficientes para gerar o gráfico de tendência.</p>;
  }

  const validFeedbacks = feedbacks.filter((fb) => fb.compound !== null && fb.compound !== undefined);
  if (validFeedbacks.length === 0) {
    return <p>Nenhum dado de sentimento disponível.</p>;
  }

  const points = groupBy === 'week'
    ? groupFeedbacksByWeek(validFeedbacks)
    : groupFeedbacksByDay(validFeedbacks);

  const data = {
    labels: points.map((p) => p.label),
    datasets: [
      {
        label: 'Média de Sentimento',
        data: points.map((p) => p.avg.toFixed(2)),
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
      legend: { position: 'top' },
      title: {
        display: true,
        text: 'Tendência de Sentimento ao Longo do Tempo',
        font: { size: 18 },
      },
      subtitle: {
        display: true,
        text: 'A linha representa a média de sentimento (-1 a +1) dos feedbacks.',
        padding: { bottom: 20 },
      },
      tooltip: {
        callbacks: {
          footer: () => 'Nota: -1 (Negativo) a +1 (Positivo)',
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
          text: 'Negativo ◄ ► Positivo',
          font: { size: 14 },
        },
      },
      x: {
        title: {
          display: true,
          text: groupBy === 'week' ? 'Semana' : 'Data',
          font: { size: 14 },
        },
      },
    },
  };

  return <Line options={options} data={data} />;
}

export default SentimentTrendChart;
