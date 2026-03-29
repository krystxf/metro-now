import type { Cache } from "@nestjs/cache-manager";

import { uniqueStrings } from "src/constants/cache";

export const loadCachedBatch = async <Key extends string, Value>({
    cacheManager,
    getCacheKey,
    keys,
    loadMissing,
    ttlMs,
}: {
    cacheManager: Cache;
    getCacheKey: (key: Key) => string;
    keys: readonly Key[];
    loadMissing: (keys: readonly Key[]) => Promise<Map<Key, Value | null>>;
    ttlMs: number;
}): Promise<Map<Key, Value | null>> => {
    const uniqueKeys = uniqueStrings(keys);

    if (uniqueKeys.length === 0) {
        return new Map<Key, Value | null>();
    }

    const cacheEntries = uniqueKeys.map((key) => ({
        cacheKey: getCacheKey(key),
        key,
    }));
    const cachedValues = await cacheManager.mget<Value | null>(
        cacheEntries.map(({ cacheKey }) => cacheKey),
    );

    const valuesByKey = new Map<Key, Value | null>();
    const missingKeys: Key[] = [];

    for (const [index, { key }] of cacheEntries.entries()) {
        const value = cachedValues[index];

        if (value === undefined) {
            missingKeys.push(key);
            continue;
        }

        valuesByKey.set(key, value);
    }

    if (missingKeys.length === 0) {
        return valuesByKey;
    }

    const loadedValuesByKey = await loadMissing(missingKeys);

    const cacheWrites = missingKeys.map((key) => {
        const value = loadedValuesByKey.get(key) ?? null;
        valuesByKey.set(key, value);

        return {
            key: getCacheKey(key),
            ttl: ttlMs,
            value,
        };
    });

    if (cacheWrites.length > 0) {
        await cacheManager.mset(cacheWrites);
    }

    return valuesByKey;
};
