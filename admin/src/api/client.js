async function parseJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function request(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const data = await parseJson(res);
  if (!res.ok) {
    const error = new Error(data.error || `Erreur ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

export function fetchMe() {
  return request('/api/auth/me');
}

export function logout() {
  return request('/api/auth/logout', { method: 'POST' });
}

export function fetchAdminStats() {
  return request('/api/admin/stats');
}

export function fetchAdminCards() {
  return request('/api/admin/cards?limit=100');
}

export function deleteAdminCard(slug) {
  return request(`/api/admin/cards/${encodeURIComponent(slug)}`, {
    method: 'DELETE'
  });
}

export function fetchAdminUsers() {
  return request('/api/admin/users');
}

export function updateUserRole(userId, role) {
  return request(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
}
