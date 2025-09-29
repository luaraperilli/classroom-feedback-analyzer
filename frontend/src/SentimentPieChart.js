import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

// Registra o novo plugin junto com os outros
ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

function SentimentPieChart({ feedbacks }) {
  if (!feedbacks || feedbacks.length === 0) {
    return (
      <div className="chart">
        <h3>Distribuição de Sentimentos</h3>
        <p>Sem dados para o gráfico.</p>
      </div>
    );
  }

  const sentimentCounts = feedbacks.reduce((acc, fb) => {
    if (fb.compound >= 0.05) acc.positive += 1;
    else if (fb.compound <= -0.05) acc.negative += 1;
    else acc.neutral += 1;
    return acc;
  }, { positive: 0, neutral: 0, negative: 0 });

  const totalFeedbacks = feedbacks.length;

  const data = {
    labels: ['Positivo', 'Neutro', 'Negativo'],
    datasets: [{
      data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
      backgroundColor: ['rgba(75, 192, 192, 0.7)', 'rgba(201, 203, 207, 0.7)', 'rgba(255, 99, 132, 0.7)'],
      borderColor: ['#FFFFFF'],
      borderWidth: 2,
    }],
  };
  
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      // Configuração para mostrar as porcentagens
      datalabels: {
        formatter: (value, ctx) => {
          if (totalFeedbacks === 0) return '0%';
          const percentage = (value / totalFeedbacks * 100).toFixed(1) + '%';
          // Só mostra a porcentagem se for maior que um valor, para não poluir
          return (value / totalFeedbacks * 100) > 5 ? percentage : '';
        },
        color: '#fff',
        font: {
          weight: 'bold',
          size: 14,
        }
      }
    }
  };

  return (
    <div className="chart">
      <h3>Distribuição de Sentimentos</h3>
      <Pie data={data} options={options} />
    </div>
  );
}

export default SentimentPieChart;

