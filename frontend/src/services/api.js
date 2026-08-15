import API_BASE_URL from '../config';

const TIMEOUT_PADRAO = 30000;
// O LIME avalia 5.000 perturbações do texto; a espera é de dezenas de segundos.
const TIMEOUT_ANALISE = 180000;

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// Ponte com o AuthContext: permite renovar o token e repetir a requisição sem
// que cada tela precise tratar 401 por conta própria.
let auth = {
  getToken: () => null,
  refresh: async () => null,
  onAuthFailure: () => {},
};

export const registerAuthHandlers = (handlers) => {
  auth = { ...auth, ...handlers };
};

const lerCorpo = async (response) => {
  const texto = await response.text();
  if (!texto) return null;
  try {
    return JSON.parse(texto);
  } catch {
    // 502/504 do proxy voltam em HTML; sem isso o usuário via "Unexpected token '<'".
    return null;
  }
};

const enviar = async (endpoint, { body, token, method, timeoutMs }) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${API_BASE_URL}${endpoint}`, {
      method: method || (body ? 'POST' : 'GET'),
      headers,
      signal: controller.signal,
      body: body ? JSON.stringify(body) : undefined,
    });
  } finally {
    clearTimeout(timer);
  }
};

const request = async (endpoint, options = {}) => {
  const { body, method, timeoutMs = TIMEOUT_PADRAO, semRetry = false } = options;
  // O token vem sempre da fonte viva: o das telas pode estar velho por closure.
  const token = auth.getToken() ?? options.token ?? null;

  let response;
  try {
    response = await enviar(endpoint, { body, token, method, timeoutMs });
  } catch (erro) {
    if (erro.name === 'AbortError') {
      throw new ApiError('O servidor está demorando mais que o normal. Tente novamente.', 0);
    }
    throw new ApiError('Erro de conexão. Verifique sua rede.', 0);
  }

  if (response.status === 401 && !semRetry) {
    const novoToken = await auth.refresh();
    if (!novoToken) {
      auth.onAuthFailure();
      throw new ApiError('Sua sessão expirou. Entre novamente.', 401);
    }
    return request(endpoint, { ...options, token: novoToken, semRetry: true });
  }

  const data = await lerCorpo(response);

  if (!response.ok) {
    throw new ApiError(data?.error || data?.message || `Erro ${response.status}`, response.status);
  }

  return data;
};

const comQuery = (path, params = {}) => {
  const query = Object.entries(params)
    .filter(([, valor]) => valor !== null && valor !== undefined && valor !== '')
    .map(([chave, valor]) => `${chave}=${encodeURIComponent(valor)}`)
    .join('&');
  return query ? `${path}?${query}` : path;
};

export const login = (username, password) =>
  request('/login', { body: { username, password }, semRetry: true });

export const register = (username, password, role, firstName, lastName) =>
  request('/register', {
    body: { username, password, role, first_name: firstName, last_name: lastName },
    semRetry: true,
  });

export const encerrarSessao = (token, refreshToken) =>
  request('/logout', { body: { refresh_token: refreshToken }, token, semRetry: true });

export const getProfile = (token) => request('/profile', { token });

export const updateProfile = (data, token) =>
  request('/profile', { method: 'PUT', body: data, token });

// Troca obrigatória de senha no 1º acesso do aluno pré-cadastrado.
export const changeInitialPassword = (newPassword, token) =>
  request('/change-initial-password', { body: { new_password: newPassword }, token });

export const getTermoConsentimento = () => request('/termo-consentimento', { semRetry: true });

export const registrarConsentimento = (token) => request('/consentimento', { body: {}, token });

// Direito de eliminação: retira o consentimento e apaga feedbacks e análises.
export const apagarMeusDados = (token) =>
  request('/meus-dados', { method: 'DELETE', token });

// Apaga um feedback do próprio aluno (ex.: enviado por engano).
export const deleteMyFeedback = (feedbackId, token) =>
  request(`/my-feedbacks/${feedbackId}`, { method: 'DELETE', token });

export const analyzeFeedback = (feedbackData, token) =>
  request('/analyze', { body: feedbackData, token, timeoutMs: TIMEOUT_ANALISE });

export const getFeedbacks = (subjectId, dateRange, token) =>
  request(
    comQuery('/feedbacks', {
      subject_id: subjectId,
      start_date: dateRange?.startDate?.toISOString(),
      end_date: dateRange?.endDate?.toISOString(),
    }),
    { token }
  );

export const getMyFeedbacks = (subjectId, token) =>
  request(comQuery('/my-feedbacks', { subject_id: subjectId }), { token });

export const getStudentsAtRisk = (subjectId, minRisk, token) =>
  request(comQuery('/students-at-risk', { subject_id: subjectId, min_risk: minRisk }), { token });

export const getStudentProgress = (studentId, subjectId, token) =>
  request(comQuery(`/student-progress/${studentId}`, { subject_id: subjectId }), { token });

export const getGlobalShap = (subjectId, token) =>
  request(comQuery('/global-shap', { subject_id: subjectId }), { token });

export const getSubjects = (token) => request('/subjects', { token });

export const createSubject = (name, token) =>
  request('/admin/subjects', { body: { name }, token });

export const getProfessors = (token) => request('/admin/professors', { token });

export const assignSubjectToProfessor = (subjectId, professorId, token) =>
  request(`/admin/subjects/${subjectId}/assign`, { body: { professor_id: professorId }, token });
