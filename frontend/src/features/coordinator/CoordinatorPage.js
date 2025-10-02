import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import '../../App.css';
import { translateSubject } from '../../utils/translations';
import { getSubjects, getProfessors, createSubject, assignSubjectToProfessor } from '../../services/api';

function CoordinatorPage() {
    const [subjectName, setSubjectName] = useState('');
    const [subjects, setSubjects] = useState([]);
    const [professors, setProfessors] = useState([]);
    const [selectedProfessor, setSelectedProfessor] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const { accessToken } = useAuth();

    const fetchInitialData = useCallback(async () => {
        try {
            const [subjectsData, professorsData] = await Promise.all([
                getSubjects(accessToken),
                getProfessors(accessToken)
            ]);
            setSubjects(subjectsData);
            setProfessors(professorsData);
        } catch (e) {
            setError('Falha ao carregar dados iniciais.');
        }
    }, [accessToken]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const data = await createSubject(subjectName, accessToken);
            setMessage(`Matéria "${data.name}" criada com sucesso!`);
            setSubjectName('');
            fetchInitialData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAssignSubject = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        try {
            const data = await assignSubjectToProfessor(selectedSubject, selectedProfessor, accessToken);
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
                <h2>Vincular Professor a uma Matéria</h2>
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