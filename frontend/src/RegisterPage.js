import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('aluno');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://127.0.0.1:5000/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      });

      if (response.ok) {
        alert('Cadastro realizado com sucesso!');
        navigate('/login');
      } else {
        const data = await response.json();
        alert(`Falha no registro: ${data.error || 'Erro desconhecido.'}`);
      }
    } catch (error) {
      console.error('Erro de conexão ou CORS:', error);
      alert('Erro ao tentar se conectar com o servidor. Verifique o console do navegador para mais detalhes (F12).');
    }
  };

  return (
    <div className="auth-container">
      <h2>Criar Cadastro</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Usuário" required />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" required />
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="aluno">Sou Aluno</option>
          <option value="professor">Sou Professor</option>
        </select>
        <button type="submit">Registrar</button>
      </form>
    </div>
  );
}

export default RegisterPage;