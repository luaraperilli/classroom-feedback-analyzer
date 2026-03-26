const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

const request = async (endpoint, options = {}) => {
  const { body, token, ...customConfig } = options;
  const headers = { 'Content-Type': 'application/json' };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    method: body ? 'POST' : 'GET',
    ...customConfig,
    headers: { ...headers, ...customConfig.headers },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  } catch {
    throw new Error('Erro de conexão. Verifique sua rede.');
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || data.message || `Erro ${response.status}`);
  }

  return data;
};

const buildUrl = (path, params = {}) => {
  const url = new URL(`${API_BASE_URL}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      url.searchParams.append(key, value);
    }
  });
  return url.toString();
};

export const login = (username, password) =>
  request('/login', { body: { username, password } });

export const register = (username, password, role) =>
  request('/register', { body: { username, password, role } });

export const analyzeFeedback = (feedbackData, token) =>
  request('/analyze', { body: feedbackData, token });

export const getFeedbacks = (subjectId, dateRange, token) =>
  request(
    `/feedbacks?${new URLSearchParams({
      ...(subjectId ? { subject_id: subjectId } : {}),
      ...(dateRange?.startDate ? { start_date: dateRange.startDate.toISOString() } : {}),
      ...(dateRange?.endDate ? { end_date: dateRange.endDate.toISOString() } : {}),
    })}`,
    { token }
  );

export const getMyFeedbacks = (subjectId, token) =>
  request(
    `/my-feedbacks${subjectId ? `?subject_id=${subjectId}` : ''}`,
    { token }
  );

export const getStudentsAtRisk = (subjectId, minRisk, token) =>
  request(
    buildUrl('/students-at-risk', {
      subject_id: subjectId || undefined,
      min_risk: minRisk || undefined,
    }).replace(API_BASE_URL, ''),
    { token }
  );

export const getStudentProgress = (studentId, subjectId, token) =>
  request(
    buildUrl(`/student-progress/${studentId}`, {
      subject_id: subjectId || undefined,
    }).replace(API_BASE_URL, ''),
    { token }
  );

export const getSubjects = (token) => request('/subjects', { token });

export const createSubject = (name, token) =>
  request('/admin/subjects', { body: { name }, token });

export const getProfessors = (token) => request('/admin/professors', { token });

export const assignSubjectToProfessor = (subjectId, professorId, token) =>
  request(`/admin/subjects/${subjectId}/assign`, { body: { professor_id: professorId }, token });
