export class FastMemoryCache {
  private static store = new Map<string, { value: any; expiresAt: number }>();

  static get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  static set(key: string, value: any, ttlMs: number = 60000): void {
    // Keep map bounded to prevent memory leaks
    if (this.store.size > 20000) {
      const now = Date.now();
      for (const [k, v] of this.store.entries()) {
        if (now > v.expiresAt) this.store.delete(k);
      }
    }
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  static del(key: string): void {
    this.store.delete(key);
  }

  static delPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  static clear(): void {
    this.store.clear();
  }
}

