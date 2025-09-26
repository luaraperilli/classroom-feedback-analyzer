import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function SentimentPieChart({ feedbacks }) {
  console.log('SentimentPieChart render:', feedbacks?.length);

  if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
    return (
      <div className="chart">
        <h3>Distribuição de Sentimentos</h3>
        <p>Sem dados disponíveis</p>
      </div>
    );
  }

  const counts = { positive: 0, neutral: 0, negative: 0 };
  
  feedbacks.forEach(fb => {
    if (fb && typeof fb.compound === 'number') {
      if (fb.compound >= 0.05) counts.positive++;
      else if (fb.compound <= -0.05) counts.negative++;
      else counts.neutral++;
    }
  });

  const data = {
    labels: ['Positivo', 'Neutro', 'Negativo'],
    datasets: [{
      data: [counts.positive, counts.neutral, counts.negative],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(201, 203, 207, 0.6)', 
        'rgba(255, 99, 132, 0.6)'
      ],
      borderColor: ['#4BC0C0', '#C9CBCE', '#FF6384'],
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
  };

  return (
    <div className="chart">
      <h3>Distribuição de Sentimentos</h3>
      <div style={{ height: '300px' }}>
        <Pie data={data} options={options} />
      </div>
    </div>
  );
}

export default SentimentPieChart;