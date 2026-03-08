// =========================================================
// STORE: RateLimitStore — Async Factory / Facade (Singleton)
// =========================================================
// Delegates to MemoryStore today.
// Future: swap this.impl = new RedisStore() — zero consumer changes.
// =========================================================

const MemoryStore = require('./MemoryStore');

class RateLimitStore {
    constructor() {
        this.impl = new MemoryStore();
    }

    async get(key) {
        return this.impl.get(key);
    }

    async set(key, value) {
        return this.impl.set(key, value);
    }

    async delete(key) {
        return this.impl.delete(key);
    }

    async has(key) {
        return this.impl.has(key);
    }
}

module.exports = new RateLimitStore();
