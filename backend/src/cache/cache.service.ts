import { Injectable, Logger } from '@nestjs/common';

export interface CacheOptions {
    ttl?: number; // Time to live in milliseconds
    key: string;
}

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

@Injectable()
export class CacheService {
    private readonly logger = new Logger(CacheService.name);
    private cache = new Map<string, CacheEntry<any>>();
    private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes

    /**
     * Get value from cache
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check if expired
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired for key: ${key}`);
            return null;
        }

        this.logger.debug(`Cache hit for key: ${key}`);
        return entry.data as T;
    }

    /**
     * Set value in cache
     */
    set<T>(key: string, data: T, ttl?: number): void {
        const expiresAt = Date.now() + (ttl || this.defaultTTL);

        this.cache.set(key, {
            data,
            expiresAt,
        });

        this.logger.debug(`Cache set for key: ${key}, TTL: ${ttl || this.defaultTTL}ms`);
    }

    /**
     * Delete a specific key
     */
    delete(key: string): void {
        this.cache.delete(key);
        this.logger.debug(`Cache deleted for key: ${key}`);
    }

    /**
     * Delete all keys matching a pattern
     */
    deletePattern(pattern: string): void {
        const regex = new RegExp(pattern);
        let deletedCount = 0;

        for (const key of this.cache.keys()) {
            if (regex.test(key)) {
                this.cache.delete(key);
                deletedCount++;
            }
        }

        this.logger.debug(`Cache pattern deleted: ${pattern}, count: ${deletedCount}`);
    }

    /**
     * Clear all cache
     */
    clear(): void {
        const size = this.cache.size;
        this.cache.clear();
        this.logger.debug(`Cache cleared: ${size} entries`);
    }

    /**
     * Get or set pattern - fetch from cache or execute function and cache result
     */
    async getOrSet<T>(
        key: string,
        fetchFunction: () => Promise<T>,
        ttl?: number,
    ): Promise<T> {
        // Try to get from cache
        const cached = this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        // Not in cache, fetch and store
        this.logger.debug(`Cache miss for key: ${key}, fetching...`);
        const data = await fetchFunction();
        this.set(key, data, ttl);

        return data;
    }

    /**
     * Get cache statistics
     */
    getStats() {
        let validEntries = 0;
        let expiredEntries = 0;
        const now = Date.now();

        for (const entry of this.cache.values()) {
            if (now > entry.expiresAt) {
                expiredEntries++;
            } else {
                validEntries++;
            }
        }

        return {
            totalEntries: this.cache.size,
            validEntries,
            expiredEntries,
            defaultTTL: this.defaultTTL,
        };
    }

    /**
     * Clean up expired entries
     */
    cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            this.logger.debug(`Cache cleanup: ${cleaned} expired entries removed`);
        }
    }
}
