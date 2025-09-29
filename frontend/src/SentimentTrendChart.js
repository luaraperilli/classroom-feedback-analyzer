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
    const date = new Date(fb.created_at).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { positive: 0, neutral: 0, negative: 0, count: 0 };
    }
    if (fb.compound >= 0.05) acc[date].positive += 1;
    else if (fb.compound <= -0.05) acc[date].negative += 1;
    else acc[date].neutral += 1;
    acc[date].count += 1;
    return acc;
  }, {});

  const labels = Object.keys(feedbacksByDay).reverse();
  
  const data = {
    labels,
    datasets: [
      {
        label: 'Positivo',
        data: labels.map(date => feedbacksByDay[date].positive),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Neutro',
        data: labels.map(date => feedbacksByDay[date].neutral),
        backgroundColor: 'rgba(201, 203, 207, 0.6)',
      },
      {
        label: 'Negativo',
        data: labels.map(date => feedbacksByDay[date].negative),
        backgroundColor: 'rgba(255, 99, 132, 0.6)',
      }
    ]
  };
  
  const options = {
    plugins: {
      title: {
        display: true,
        text: 'Contagem de Feedbacks por Sentimento a Cada Dia',
      },
      tooltip: {
        callbacks: {
          footer: (tooltipItems) => {
            const date = tooltipItems[0].label;
            const total = feedbacksByDay[date].count;
            return `Total de feedbacks no dia: ${total}`;
          },
        },
      },
    },
    responsive: true,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      },
    },
  };

  return (
    <div className="chart">
      <h3>Evolução do Sentimento</h3>
      <Bar data={data} options={options} />
    </div>
  );
}

export default SentimentTrendChart;