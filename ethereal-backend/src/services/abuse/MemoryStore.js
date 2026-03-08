// =========================================================
// STORE: MemoryStore — Async O(1) LRU wrapper
// =========================================================
// Wraps lru-cache with an async interface so the abuse engine
// can swap to RedisStore without rewriting consumers.
// =========================================================

const { LRUCache } = require('lru-cache');

class MemoryStore {
    constructor() {
        this.store = new LRUCache({
            max: 50000,
            ttl: 15 * 60 * 1000,
            allowStale: false
        });
    }

    async get(key) {
        return this.store.get(key);
    }

    async set(key, value) {
        this.store.set(key, value);
    }

    async delete(key) {
        this.store.delete(key);
    }

    async has(key) {
        return this.store.has(key);
    }
}

module.exports = MemoryStore;
