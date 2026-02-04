// Simple in-memory cache with TTL for server-side use.
// Survives across API requests within the same server process,
// but resets on server restart (which is fine for this use case).

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidatePrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

// Singleton instance shared across all API routes in the same process
export const cache = new MemoryCache();

// Common TTLs
export const CACHE_TTL = {
  OWNERS: 10 * 60 * 1000,        // 10 minutes
  PROPERTIES: 30 * 60 * 1000,    // 30 minutes
  CONNECTION: 5 * 60 * 1000,     // 5 minutes
  COMPANY_SEARCH: 60 * 1000,     // 1 minute (during sync batches)
} as const;

// Cache keys
export const CACHE_KEYS = {
  HUBSPOT_OWNERS: 'hubspot:owners',
  HUBSPOT_PROPERTIES: 'hubspot:properties',
  HUBSPOT_CONNECTION: 'hubspot:connection',
  companyDomain: (domain: string) => `company:domain:${domain.toLowerCase()}`,
  companyName: (name: string) => `company:name:${name.toLowerCase()}`,
} as const;
