import React from 'react';
import ReactWordcloud from 'react-wordcloud';

function WordCloud({ words }) {
  if (!words || words.length === 0) {
    return (
      <div className="chart chart-wordcloud">
        <h3>Palavras-Chave Mais Citadas</h3>
        <p>Sem palavras-chave para exibir.</p>
      </div>
    );
  }

  const options = {
    rotations: 2,
    rotationAngles: [-90, 0],
    fontSizes: [20, 60],
    padding: 1,
  };

  return (
    <div className="chart chart-wordcloud">
      <h3>Palavras-Chave Mais Citadas</h3>
      <div style={{ height: '300px', width: '100%' }}>
        <ReactWordcloud words={words} options={options} />
      </div>
    </div>
  );
}

export default WordCloud;