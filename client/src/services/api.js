const API_BASE = import.meta.env.VITE_API_BASE
  || (window.location.port === '5173' ? 'http://localhost:3001/api' : '/api');

let authToken = window.localStorage.getItem('examScheduleToken') || '';

async function request(path, options = {}) {
  const headers = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = `Request failed with ${response.status}`;
    try {
      const body = await response.json();
      message = body.error || message;
    } catch {
      // Keep the generic message when the response body is not JSON.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  setToken: (token) => {
    authToken = token || '';
    if (authToken) {
      window.localStorage.setItem('examScheduleToken', authToken);
    } else {
      window.localStorage.removeItem('examScheduleToken');
    }
  },
  getToken: () => authToken,
  getMe: () => request('/auth/me'),
  signup: (payload) =>
    request('/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  getCurrentSchedule: () => request('/schedules/current'),
  searchRows: (query) => request(`/schedules/rows?query=${encodeURIComponent(query)}`),
  uploadSchedule: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/schedules/upload', {
      method: 'POST',
      body: formData
    });
  },
  reparseSchedule: (payload) =>
    request('/schedules/reparse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }),
  replaceSchedule: () => request('/schedules/current', { method: 'DELETE' }),
  getSelections: () => request('/selections'),
  addSelection: (scheduleRowId) =>
    request('/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleRowId })
    }),
  removeSelection: (selectionId) => request(`/selections/${selectionId}`, { method: 'DELETE' }),
  clearSelections: () => request('/selections', { method: 'DELETE' })
};
