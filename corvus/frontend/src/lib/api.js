// URL del backend - en desarrollo usa proxy de Vite, en produccion usa la URL de Railway
const API_URL = import.meta.env.VITE_API_URL || '';

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  let data;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else {
    const text = await res.text().catch(() => '');
    data = { error: text || `Error ${res.status}` };
  }

  if (!res.ok) {
    const message = data?.error || data?.message || `Error ${res.status}`;
    throw new Error(message);
  }

  return data || { success: true };
}

async function request(path, options = {}) {
  const url = `${API_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  return parseResponse(res);
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

export async function updateProfile(profileId, updates) {
  return request(`/api/profiles/${encodeURIComponent(profileId)}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

export async function refineProfilePrompt(profileId, { platform, description }) {
  return request(`/api/profiles/${encodeURIComponent(profileId)}/refine`, {
    method: 'PATCH',
    body: JSON.stringify({ platform, description }),
  });
}

// ===== X =====
export async function getXAuthUrl(profileId) {
  return request(`/api/x/auth-url?profileId=${encodeURIComponent(profileId)}`);
}

export async function getXStatus(profileId) {
  return request(`/api/x/status/${encodeURIComponent(profileId)}`);
}

export async function disconnectX(profileId) {
  return request(`/api/x/disconnect/${encodeURIComponent(profileId)}`, {
    method: 'DELETE',
  });
}

export async function getXPreview(payload) {
  return request('/api/x/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function publishPostToX(postId) {
  return request(`/api/x/publish/${encodeURIComponent(postId)}`, {
    method: 'POST',
  });
}
