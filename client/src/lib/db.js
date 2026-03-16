import { openDB } from 'idb';

const DB_NAME = 'afriscout';
const DB_VERSION = 1;

let db;

export async function getDB() {
  if (db) return db;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Offline datapoints queue
      if (!db.objectStoreNames.contains('datapoints')) {
        const dp = db.createObjectStore('datapoints', { keyPath: 'local_id' });
        dp.createIndex('synced', 'synced');
        dp.createIndex('market', 'market');
      }
      // Offline photos queue
      if (!db.objectStoreNames.contains('photos')) {
        const ph = db.createObjectStore('photos', { keyPath: 'local_id' });
        ph.createIndex('synced', 'synced');
      }
      // Sessions
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
      // Cached heatmap data
      if (!db.objectStoreNames.contains('heatmap')) {
        db.createObjectStore('heatmap', { keyPath: 'id' });
      }
      // Interview guidance cache
      if (!db.objectStoreNames.contains('guidance')) {
        db.createObjectStore('guidance', { keyPath: 'key' });
      }
      // Scout profile cache
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'key' });
      }
    },
  });
  return db;
}

// ── Datapoints ────────────────────────────────────────────────────────────────

export async function saveDatapointOffline(dp) {
  const db = await getDB();
  await db.put('datapoints', { ...dp, synced: 0, created_local: Date.now() });
}

export async function getUnsyncedDatapoints() {
  const db = await getDB();
  return db.getAllFromIndex('datapoints', 'synced', 0);
}

export async function markDatapointSynced(local_id) {
  const db = await getDB();
  const dp = await db.get('datapoints', local_id);
  if (dp) await db.put('datapoints', { ...dp, synced: 1 });
}

export async function getAllDatapoints() {
  const db = await getDB();
  return db.getAll('datapoints');
}

// ── Photos ────────────────────────────────────────────────────────────────────

export async function savePhotoOffline(photo) {
  const db = await getDB();
  await db.put('photos', { ...photo, synced: 0, created_local: Date.now() });
}

export async function getUnsyncedPhotos() {
  const db = await getDB();
  return db.getAllFromIndex('photos', 'synced', 0);
}

export async function markPhotoSynced(local_id) {
  const db = await getDB();
  const photo = await db.get('photos', local_id);
  if (photo) await db.put('photos', { ...photo, synced: 1 });
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function saveSession(session) {
  const db = await getDB();
  await db.put('sessions', session);
}

export async function getSession(id) {
  const db = await getDB();
  return db.get('sessions', id);
}

// ── Heatmap cache ─────────────────────────────────────────────────────────────

export async function cacheHeatmap(zones) {
  const db = await getDB();
  const tx = db.transaction('heatmap', 'readwrite');
  await tx.store.clear();
  for (const zone of zones) {
    await tx.store.put({ ...zone, id: `${zone.market}_${zone.market_section}_${zone.sector}` });
  }
  await tx.done;
}

export async function getCachedHeatmap() {
  const db = await getDB();
  return db.getAll('heatmap');
}

// ── Guidance cache ────────────────────────────────────────────────────────────

export async function cacheGuidance(market, sector, data) {
  const db = await getDB();
  await db.put('guidance', { key: `${market}_${sector}`, ...data });
}

export async function getCachedGuidance(market, sector) {
  const db = await getDB();
  return db.get('guidance', `${market}_${sector}`);
}

// ── Profile cache ─────────────────────────────────────────────────────────────

export async function cacheProfile(profile) {
  const db = await getDB();
  await db.put('profile', { key: 'scout', ...profile });
}

export async function getCachedProfile() {
  const db = await getDB();
  return db.get('profile', 'scout');
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function getOfflineStats() {
  const db = await getDB();
  const all = await db.getAll('datapoints');
  const unsynced = all.filter(d => !d.synced);
  const today = all.filter(d => {
    const collected = new Date(d.collected_at);
    const now = new Date();
    return collected.toDateString() === now.toDateString();
  });
  return {
    total_offline: all.length,
    unsynced: unsynced.length,
    today: today.length,
  };
}
