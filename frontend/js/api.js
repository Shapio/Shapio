const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('shapio_token');
}

export function saveToken(token) {
  localStorage.setItem('shapio_token', token);
}

export function clearToken() {
  localStorage.removeItem('shapio_token');
  localStorage.removeItem('shapio_user_id');
}

export function saveUserId(id) {
  localStorage.setItem('shapio_user_id', id);
}

export function getUserId() {
  return Number(localStorage.getItem('shapio_user_id'));
}

export function isLoggedIn() {
  return !!getToken();
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

export const auth = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
};

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

export const users = {
  me: () => request('/users/me'),
  get: (id) => request(`/users/${id}`),
};

export const wallet = {
  get: () => request('/wallet'),
};

export const messages = {
  conversations: () => request('/messages/conversations'),
  get: (userId) => request(`/messages/${userId}`),
  send: (userId, content) => request(`/messages/${userId}`, { method: 'POST', body: JSON.stringify({ content }) }),
};

export const loans = {
  create: (itemId, days) => request('/loans', { method: 'POST', body: JSON.stringify({ item_id: itemId, days }) }),
  confirmReturn: (id) => request(`/loans/${id}/return`, { method: 'POST' }),
};

export const phone = {
  sendCode: (phoneNum) => request('/phone/send-code', { method: 'POST', body: JSON.stringify({ phone: phoneNum }) }),
  verify: (phoneNum, code) => request('/phone/verify', { method: 'POST', body: JSON.stringify({ phone: phoneNum, code }) }),
  confirm: (phoneNum) => request('/phone/confirm', { method: 'POST', body: JSON.stringify({ phone: phoneNum }) }),
};

export const swipes = {
  record: (itemId, direction) => request('/swipes', { method: 'POST', body: JSON.stringify({ item_id: itemId, direction }) }),
  unswiped: (category) => {
    const params = category && category !== 'Tout' ? `?category=${category}` : '';
    return request(`/swipes/unswiped${params}`);
  },
};
