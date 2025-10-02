const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const request = async (endpoint, options = {}) => {
    const { body, ...customConfig } = options;
    const headers = { 'Content-Type': 'application/json' };

    if (options.token) {
        headers.Authorization = `Bearer ${options.token}`;
    }

    const config = {
        method: body ? 'POST' : 'GET',
        ...customConfig,
        headers: {
            ...headers,
            ...customConfig.headers,
        },
    };

    if (body) {
        config.body = JSON.stringify(body);
    }

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    } catch (e) {
        throw new Error("Erro de conexão. Verifique sua rede.");
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || data.message || `Erro ${response.status}`);
    }

    return data;
};

// Auth
export const login = (username, password) => request('/login', { body: { username, password } });
export const register = (username, password, role) => request('/register', { body: { username, password, role } });

// Feedbacks
export const analyzeFeedback = (text, subject_id, token) => request('/analyze', { body: { text, subject_id }, token });
export const getFeedbacks = async (subjectId, dateRange, token) => {
    const url = new URL(`${API_BASE_URL}/feedbacks`);
    if (subjectId) url.searchParams.append('subject_id', subjectId);
    if (dateRange?.startDate) url.searchParams.append('start_date', dateRange.startDate.toISOString());
    if (dateRange?.endDate) url.searchParams.append('end_date', dateRange.endDate.toISOString());

    const response = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Erro ao buscar feedbacks');
    return data;
};


// Subjects
export const getSubjects = (token) => request('/subjects', { token });

// Admin/Coordinator
export const createSubject = (name, token) => request('/admin/subjects', { body: { name }, token });
export const getProfessors = (token) => request('/admin/professors', { token });
export const assignSubjectToProfessor = (subjectId, professorId, token) => request(`/admin/subjects/${subjectId}/assign`, { body: { professor_id: professorId }, token });