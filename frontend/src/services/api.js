import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const signup = async (email, password, name) => {
  const response = await api.post('/walker/Signup', {
    email,
    password,
    name,
  });
  // Extract user_id from Jac response structure
  const jacResponse = response.data;
  if (jacResponse.ok && jacResponse.data.reports && jacResponse.data.reports.length > 0) {
    return jacResponse.data.reports[0]; // Returns { user_id: "..." }
  }
  return { error: 'Signup failed' };
};

export const login = async (email, password) => {
  const response = await api.post('/walker/Login', {
    email,
    password,
  });
  // Extract token from Jac response structure
  const jacResponse = response.data;
  if (jacResponse.ok && jacResponse.data.reports && jacResponse.data.reports.length > 0) {
    return jacResponse.data.reports[0]; // Returns { token: "..." }
  }
  return { error: 'Login failed' };
};

export const getMe = async (token) => {
  const response = await api.post('/walker/Me', {
    token,
  });
  // Extract user data from Jac response structure
  const jacResponse = response.data;
  if (jacResponse.ok && jacResponse.data.reports && jacResponse.data.reports.length > 0) {
    return jacResponse.data.reports[0]; // Returns user object
  }
  return { error: 'Failed to fetch user' };
};

export const updatePreferences = async (token, preferences) => {
  const response = await api.post('/walker/UpdatePreferences', {
    token,
    ...preferences,
  });
  return response.data;
};

// Career Fair endpoints
export const listEvents = async () => {
  const response = await api.post('/walker/ListEvents', {});
  return response.data;
};

export const listCompanies = async (filters) => {
  const response = await api.post('/walker/ListCompanies', filters);
  return response.data;
};

export const getCompany = async (event_id, company_id) => {
  const response = await api.post('/walker/GetCompany', {
    event_id,
    company_id,
  });
  return response.data;
};

export const uploadResume = async (token, filename, raw_text) => {
  const response = await api.post('/walker/ResumeUpload', {
    token,
    filename,
    raw_text,
  });

  const jacResponse = response.data;
  if (jacResponse.ok && jacResponse.data.reports && jacResponse.data.reports.length > 0) {
    return jacResponse.data.reports[0];
  }

  return { error: 'Resume upload failed' };
};


export default api;
