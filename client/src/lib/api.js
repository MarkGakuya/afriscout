const API = import.meta.env.VITE_API_URL || 'https://afriscout-api.onrender.com';

function getToken() {
  return localStorage.getItem('afriscout_token');
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('afriscout_token', data.token);
  localStorage.setItem('afriscout_scout', JSON.stringify(data.scout));
  return data;
}

export function logout() {
  localStorage.removeItem('afriscout_token');
  localStorage.removeItem('afriscout_scout');
}

export function getStoredScout() {
  const s = localStorage.getItem('afriscout_scout');
  return s ? JSON.parse(s) : null;
}

export function isLoggedIn() {
  return !!getToken();
}

export async function getProfile() {
  return request('/scout/profile');
}

// ── Map & Guidance ────────────────────────────────────────────────────────────

export async function getHeatmap() {
  return request('/map/heatmap');
}

export async function getMissions() {
  return request('/map/missions');
}

export async function getGuidance(market, sector) {
  return request(`/map/guidance/${encodeURIComponent(market)}/${encodeURIComponent(sector)}`);
}

// ── Scout ─────────────────────────────────────────────────────────────────────

export async function startSession(data) {
  return request('/scout/session/start', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function endSession(id) {
  return request(`/scout/session/${id}/end`, { method: 'POST' });
}

export async function getLeaderboard() {
  return request('/scout/leaderboard');
}

export async function getMyDatapoints(limit = 20) {
  return request(`/scout/datapoints?limit=${limit}`);
}

// ── Sync Engine ───────────────────────────────────────────────────────────────

import {
  getUnsyncedDatapoints, getUnsyncedPhotos,
  markDatapointSynced, markPhotoSynced,
  cacheHeatmap, cacheProfile, cacheGuidance
} from './db';

export async function syncAll(onProgress) {
  if (!navigator.onLine) return { success: false, reason: 'offline' };

  try {
    const datapoints = await getUnsyncedDatapoints();
    const photos = await getUnsyncedPhotos();

    if (datapoints.length === 0 && photos.length === 0) {
      // Still refresh cached data
      await refreshCaches();
      return { success: true, synced: 0, photos: 0 };
    }

    onProgress?.(`Syncing ${datapoints.length} datapoints...`);

    const result = await request('/sync', {
      method: 'POST',
      body: JSON.stringify({ datapoints, photos }),
    });

    // Mark all as synced locally
    for (const dp of datapoints) await markDatapointSynced(dp.local_id);
    for (const ph of photos) await markPhotoSynced(ph.local_id);

    onProgress?.('Refreshing maps...');
    await refreshCaches();

    return { success: true, synced: result.synced_datapoints, photos: result.synced_photos };
  } catch (err) {
    console.error('Sync failed:', err);
    return { success: false, reason: err.message };
  }
}

async function refreshCaches() {
  try {
    const [heatmap, profile] = await Promise.all([getHeatmap(), getProfile()]);
    await cacheHeatmap(heatmap);
    await cacheProfile(profile);
  } catch {
    // Offline — use cached data
  }
}

export { refreshCaches };
