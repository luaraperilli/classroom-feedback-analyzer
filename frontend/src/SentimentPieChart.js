import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

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

  const data = {
    labels: ['Positivo', 'Neutro', 'Negativo'],
    datasets: [{
      data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
      backgroundColor: ['rgba(75, 192, 192, 0.6)', 'rgba(201, 203, 207, 0.6)', 'rgba(255, 99, 132, 0.6)'],
      borderColor: ['#4BC0C0', '#C9CBCE', '#FF6384'],
      borderWidth: 1,
    }],
  };

  return (
    <div className="chart">
      <h3>Distribuição de Sentimentos</h3>
      <Pie data={data} />
    </div>
  );
}

export default SentimentPieChart;