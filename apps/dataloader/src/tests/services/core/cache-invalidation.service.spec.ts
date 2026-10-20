import assert from "node:assert/strict";
import test from "node:test";

import { CacheInvalidationService } from "../../../services/core/cache-invalidation.service";

type FakeRedis = {
    scan: (
        cursor: string,
        match: "MATCH",
        pattern: string,
        count: "COUNT",
        batch: number,
    ) => Promise<[string, string[]]>;
    del: (...keys: string[]) => Promise<number>;
    scanCalls: string[];
    delCalls: string[][];
};

const makeFakeRedis = (
    keysByPattern: Record<string, string[]> = {},
): FakeRedis => {
    const scanCalls: string[] = [];
    const delCalls: string[][] = [];

    return {
        scanCalls,
        delCalls,
        async scan(_cursor, _match, pattern, _count, _batch) {
            scanCalls.push(pattern);
            return ["0", keysByPattern[pattern] ?? []];
        },
        async del(...keys: string[]) {
            delCalls.push(keys);
            return keys.length;
        },
    };
};

const attachRedis = (
    service: CacheInvalidationService,
    fakeRedis: FakeRedis,
): void => {
    (service as unknown as { redis: FakeRedis }).redis = fakeRedis;
};

test("invalidateForChangedEntities returns 0 when redis is not connected", async () => {
    const service = new CacheInvalidationService("localhost", 6379);

    const result = await service.invalidateForChangedEntities(["stops"]);

    assert.equal(result, 0);
});

test("invalidateForChangedEntities returns 0 when no entities map to cache groups", async () => {
    const service = new CacheInvalidationService("localhost", 6379);
    attachRedis(service, makeFakeRedis());

    const result = await service.invalidateForChangedEntities(["unknown-entity"]);

    assert.equal(result, 0);
});

test("invalidateForChangedEntities deletes matching keys for a single entity group", async () => {
    const service = new CacheInvalidationService("localhost", 6379);
    const fakeRedis = makeFakeRedis({
        "keyv:stop.*": ["keyv:stop.byId.U1", "keyv:stop.all.metro"],
    });
    attachRedis(service, fakeRedis);

    const result = await service.invalidateForChangedEntities(["stops"]);

    assert.equal(result, 2);
    assert.deepEqual(fakeRedis.scanCalls, ["keyv:stop.*"]);
    assert.equal(fakeRedis.delCalls.length, 1);
    assert.equal(fakeRedis.delCalls[0]?.length, 2);
});

test("invalidateForChangedEntities unions cache groups across multiple entities", async () => {
    const service = new CacheInvalidationService("localhost", 6379);
    const fakeRedis = makeFakeRedis({
        "keyv:stop.*": ["keyv:stop.x"],
        "keyv:platform.*": ["keyv:platform.y"],
        "keyv:route.*": ["keyv:route.z"],
    });
    attachRedis(service, fakeRedis);

    const result = await service.invalidateForChangedEntities([
        "platformRoutes",
        "gtfsRouteStops",
    ]);

    assert.equal(result, 3);
    assert.deepEqual(fakeRedis.scanCalls.sort(), [
        "keyv:platform.*",
        "keyv:route.*",
        "keyv:stop.*",
    ]);
});

test("invalidateForChangedEntities returns 0 when scan finds nothing", async () => {
    const service = new CacheInvalidationService("localhost", 6379);
    const fakeRedis = makeFakeRedis();
    attachRedis(service, fakeRedis);

    const result = await service.invalidateForChangedEntities(["stops"]);

    assert.equal(result, 0);
    assert.equal(fakeRedis.delCalls.length, 0);
});
