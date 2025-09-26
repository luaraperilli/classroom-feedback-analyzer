import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function SentimentTrendChart({ feedbacks }) {
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="chart">
        <h3>Evolução do Sentimento</h3>
        <p>Sem dados para o gráfico.</p>
      </div>
    );
  }

  const feedbacksByDay = feedbacks.reduce((acc, fb) => {
    const date = new Date(fb.created_at).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
    if (!acc[date]) {
      acc[date] = { sum: 0, count: 0, dateObj: new Date(fb.created_at) };
    }
    acc[date].sum += fb.compound;
    acc[date].count += 1;
    return acc;
  }, {});

  const sortedLabels = Object.keys(feedbacksByDay).sort((a, b) => {
    const dateA = feedbacksByDay[a].dateObj;
    const dateB = feedbacksByDay[b].dateObj;
    return dateA - dateB;
  });

  const dataPoints = sortedLabels.map(date => feedbacksByDay[date].sum / feedbacksByDay[date].count);

  const data = {
    labels: sortedLabels,
    datasets: [{
      label: 'Média de Sentimento Diário',
      data: dataPoints,
      backgroundColor: dataPoints.map(v => v >= 0.05 ? 'rgba(75, 192, 192, 0.6)' : v <= -0.05 ? 'rgba(255, 99, 132, 0.6)' : 'rgba(201, 203, 207, 0.6)'),
    }]
  };
  
  const options = {
      scales: { y: { beginAtZero: false, min: -1, max: 1 } }
  };

  return (
    <div className="chart">
      <h3>Evolução do Sentimento</h3>
      <Bar data={data} options={options} />
    </div>
  );
}

export default SentimentTrendChart;