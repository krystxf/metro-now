import type { Cache } from "@nestjs/cache-manager";

import { loadCachedBatch } from "src/utils/cache-batch";

describe("loadCachedBatch", () => {
    const createCacheManager = (store: Map<string, unknown>) => ({
        mget: jest.fn(async (keys: string[]) =>
            keys.map((key) => (store.has(key) ? store.get(key) : undefined)),
        ),
        mset: jest.fn(
            async (entries: Array<{ key: string; value: unknown }>) => {
                for (const entry of entries) {
                    store.set(entry.key, entry.value);
                }

                return entries;
            },
        ),
    });

    it("reuses cached values and only loads misses", async () => {
        const store = new Map<string, unknown>([
            ["platform.getGraphQLById.A", { id: "A", name: "Alpha" }],
        ]);
        const cacheManager = createCacheManager(store);
        const loadMissing = jest.fn(async (keys: readonly string[]) => {
            return new Map(keys.map((key) => [key, { id: key, name: key }]));
        });

        const valuesByKey = await loadCachedBatch({
            cacheManager: cacheManager as unknown as Cache,
            getCacheKey: (key) => `platform.getGraphQLById.${key}`,
            keys: ["A", "B", "A"],
            loadMissing,
            ttlMs: 60_000,
        });

        expect(loadMissing).toHaveBeenCalledWith(["B"]);
        expect(valuesByKey.get("A")).toEqual({ id: "A", name: "Alpha" });
        expect(valuesByKey.get("B")).toEqual({ id: "B", name: "B" });
        expect(store.get("platform.getGraphQLById.B")).toEqual({
            id: "B",
            name: "B",
        });
    });

    it("caches explicit null results to avoid repeated misses", async () => {
        const store = new Map<string, unknown>();
        const cacheManager = createCacheManager(store);

        const valuesByKey = await loadCachedBatch({
            cacheManager: cacheManager as unknown as Cache,
            getCacheKey: (key) => `stop.getGraphQLById.${key}`,
            keys: ["missing-stop"],
            loadMissing: async () => new Map([["missing-stop", null]]),
            ttlMs: 60_000,
        });

        expect(valuesByKey.get("missing-stop")).toBeNull();
        expect(store.get("stop.getGraphQLById.missing-stop")).toBeNull();
    });
});
