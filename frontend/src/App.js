// src/App.js
import React, { useState } from 'react';
import './App.css';

function App() {
  // State to hold the text from the textarea
  const [feedbackText, setFeedbackText] = useState('');
  // State to hold the analysis result
  const [sentimentResult, setSentimentResult] = useState(null);
  // State to manage loading status
  const [isLoading, setIsLoading] = useState(false);

  // Function to handle the form submission
  const handleSubmit = async (event) => {
    event.preventDefault(); // Prevents the browser from reloading the page
    setIsLoading(true);
    setSentimentResult(null);

    try {
      // Send the feedback text to our Python API
      const response = await fetch('http://127.0.0.1:5000/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: feedbackText }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();
      setSentimentResult(data); // Store the result from the API
    } catch (error) {
      console.error('Error sending feedback:', error);
      // Handle errors, e.g., show an error message to the user
      setSentimentResult({ error: 'Failed to analyze sentiment.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to determine the result color based on sentiment
  const getResultColor = () => {
    if (!sentimentResult || sentimentResult.error) return '#333'; // Default/error color
    if (sentimentResult.compound >= 0.05) return 'green'; // Positive
    if (sentimentResult.compound <= -0.05) return 'red'; // Negative
    return 'gray'; // Neutral
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Análise de Sentimentos da Aula</h1>
        <p>Como você se sentiu sobre a aula de hoje?</p>
        
        <form onSubmit={handleSubmit}>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Escreva seu feedback aqui..."
            rows="5"
            cols="50"
            required
          />
          <br />
          <button type="submit" disabled={isLoading}>
            {isLoading ? 'Analisando...' : 'Enviar Feedback'}
          </button>
        </form>

        {sentimentResult && (
          <div className="result-container">
            <h2>Resultado da Análise:</h2>
            <p style={{ color: getResultColor(), fontSize: '1.2em', fontWeight: 'bold' }}>
              {sentimentResult.error ? sentimentResult.error : `Sentimento Geral (Compound): ${sentimentResult.compound}`}
            </p>
            <pre>
              {JSON.stringify(sentimentResult, null, 2)}
            </pre>
          </div>
        )}
      </header>
    </div>
  );
}

export default App;