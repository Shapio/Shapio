const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('shapio_token');
}

export function saveToken(token) {
  localStorage.setItem('shapio_token', token);
}

export function clearToken() {
  localStorage.removeItem('shapio_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Erreur serveur');
  }

  return data;
}

// Auth
export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

// Items
export const items = {
  list: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/items${query ? '?' + query : ''}`);
  },
  get: (id) => request(`/items/${id}`),
  create: (data) => request('/items', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/items/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/items/${id}`, { method: 'DELETE' }),
};

// Users
export const users = {
  me: () => request('/users/me'),
  get: (id) => request(`/users/${id}`),
};

// Wallet
export const wallet = {
  get: () => request('/wallet'),
};

// Messages
export const messages = {
  conversations: () => request('/messages/conversations'),
  get: (userId) => request(`/messages/${userId}`),
  send: (userId, content) => request(`/messages/${userId}`, { method: 'POST', body: JSON.stringify({ content }) }),
};

// Loans
export const loans = {
  create: (itemId, days) => request('/loans', { method: 'POST', body: JSON.stringify({ item_id: itemId, days }) }),
  confirmReturn: (id) => request(`/loans/${id}/return`, { method: 'POST' }),
};
