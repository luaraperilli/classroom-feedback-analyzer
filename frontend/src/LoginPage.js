import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const response = await fetch('http://127.0.0.1:5000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (response.ok) {
      const { access_token, user } = await response.json();
      login(access_token);
      if (user.role === 'professor') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } else {
      alert('Falha no login');
    }
  };

  return (
    <div className="auth-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuário" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default LoginPage;