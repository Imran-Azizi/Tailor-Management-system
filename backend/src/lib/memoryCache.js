/**
 * Lightweight in-memory TTL cache for hot-path lookups (tenant host, RBAC).
 * Not shared across PM2 cluster instances — each process has its own cache.
 */

const stores = new Map();

function getStore(name) {
  if (!stores.has(name)) stores.set(name, new Map());
  return stores.get(name);
}

export function cacheGet(name, key) {
  const store = getStore(name);
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value;
}

export function cacheSet(name, key, value, ttlMs) {
  getStore(name).set(key, { value, expiresAt: Date.now() + ttlMs });
}

export function cacheDelete(name, key) {
  getStore(name).delete(key);
}

export function cacheDeleteByPrefix(name, prefix) {
  const store = getStore(name);
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export function cacheClear(name) {
  getStore(name).clear();
}
