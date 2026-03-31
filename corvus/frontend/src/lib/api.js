// URL del backend - en desarrollo usa proxy de Vite, en producción usa la URL de Railway
const API_URL = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`);
  }

  return data;
}

// ===== AI =====
export async function generateContent({ platform, profileId, contentType, topic }) {
  return request('/api/ai/generate', {
    method: 'POST',
    body: JSON.stringify({ platform, profileId, contentType, topic }),
  });
}

// ===== POSTS =====
export async function getPosts(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.platform) params.set('platform', filters.platform);
  if (filters.profileId) params.set('profileId', filters.profileId);
  const query = params.toString();
  return request(`/api/posts${query ? `?${query}` : ''}`);
}

export async function createPost(post) {
  return request('/api/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
}

export async function updatePost(id, updates) {
  return request(`/api/posts/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function deletePost(id) {
  return request(`/api/posts/${id}`, {
    method: 'DELETE',
  });
}

// ===== PROFILES =====
export async function getProfiles() {
  return request('/api/profiles');
}

export async function seedProfiles() {
  return request('/api/profiles/seed', { method: 'POST' });
}
