import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import './App.css';
import { translateSubject } from './utils/translations';

function CoordinatorPage() {
    const [subjectName, setSubjectName] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [selectedProfessor, setSelectedProfessor] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { accessToken, API_BASE_URL } = useAuth();

    const fetchSubjectsAndProfessors = useCallback(async () => {
        try {
            const [subjectsRes, professorsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/subjects`, { headers: { 'Authorization': `Bearer ${accessToken}` } }),
                fetch(`${API_BASE_URL}/admin/professors`, { headers: { 'Authorization': `Bearer ${accessToken}` } })
            ]);
            const subjectsData = await subjectsRes.json();
            const professorsData = await professorsRes.json();
            setSubjects(subjectsData);
            setProfessors(professorsData);
        } catch (e) {
            setError('Falha ao carregar dados.');
        }
    }, [accessToken, API_BASE_URL]);

    useEffect(() => {
        fetchSubjectsAndProfessors();
    }, [fetchSubjectsAndProfessors]);

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/subjects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ name: subjectName }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro desconhecido');
            setMessage(`Matéria "${data.name}" criada com sucesso!`);
            setSubjectName('');
            fetchSubjectsAndProfessors();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/subjects/${selectedSubject}/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
                body: JSON.stringify({ professor_id: selectedProfessor }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Erro desconhecido');
            setMessage(data.message);
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="coordinator-page">
            <h1>Área do Coordenador</h1>
            {message && <p className="success-message">{message}</p>}
            {error && <p className="error-message">{error}</p>}
            
            <div className="management-section">
                <h2>Cadastrar Nova Matéria</h2>
                <form onSubmit={handleCreateSubject}>
                    <input
                        type="text"
                        value={subjectName}
                        onChange={(e) => setSubjectName(e.target.value)}
                        placeholder="Nome da Matéria"
                        required
                    />
                    <button type="submit">Criar Matéria</button>
                </form>
            </div>

            <div className="management-section">
                <h2>Vincular Professor</h2>
                <form onSubmit={handleAssignSubject}>
                    <select value={selectedProfessor} onChange={(e) => setSelectedProfessor(e.target.value)} required>
                        <option value="" disabled>Selecione um professor</option>
                        {professors.map(p => <option key={p.id} value={p.id}>{p.username}</option>)}
                    </select>
                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} required>
                        <option value="" disabled>Selecione uma matéria</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{translateSubject(s.name)}</option>)}
                    </select>
                    <button type="submit">Vincular Matéria</button>
                </form>
            </div>
        </div>
    );
}

export default CoordinatorPage;