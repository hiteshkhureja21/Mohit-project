/**
 * Government Data In-Memory TTL Cache
 * Prevents redundant upstream API calls to data.gov.in and respects rate limits.
 */

export class GovernmentCache {
  constructor(defaultTtlMs = 600000, maxSize = 200) { // 10 min default TTL, max 200 items
    this.defaultTtlMs = defaultTtlMs;
    this.maxSize = maxSize;
    this.cache = new Map();
  }

  generateKey(namespace, params = {}) {
    const sortedEntries = Object.entries(params)
      .filter(([_, v]) => v !== undefined && v !== null && v !== '')
      .sort(([a], [b]) => a.localeCompare(b));
    return `${namespace}:${JSON.stringify(sortedEntries)}`;
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    // Evict oldest if full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }

  invalidate(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  get size() {
    return this.cache.size;
  }
}

export const governmentCache = new GovernmentCache();
