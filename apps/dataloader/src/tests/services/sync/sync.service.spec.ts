import assert from "node:assert/strict";
import test from "node:test";

import type { DatabaseClient } from "@metro-now/database";

import { SyncService } from "../../../services/sync/sync.service";
import type { SyncRunResult } from "../../../types/sync.types";

const makeStubResult = (
    overrides: Partial<SyncRunResult> = {},
): SyncRunResult => ({
    status: "success",
    trigger: "manual",
    startedAt: new Date("2026-01-01T00:00:00Z"),
    finishedAt: new Date("2026-01-01T00:00:01Z"),
    durationMs: 1000,
    counts: {
        stops: 0,
        platforms: 0,
        platformRoutes: 0,
        gtfsRoutes: 0,
        gtfsRouteStops: 0,
        gtfsRouteShapes: 0,
        gtfsStationEntrances: 0,
        gtfsTrips: 0,
        gtfsStopTimes: 0,
        gtfsCalendars: 0,
        gtfsCalendarDates: 0,
        gtfsTransfers: 0,
        gtfsFrequencies: 0,
    },
    changedEntities: [],
    ...overrides,
});

const createServiceWithMockExecute = (
    impl: () => Promise<SyncRunResult>,
): { service: SyncService; calls: { count: number } } => {
    const calls = { count: 0 };
    const fakeDb = {} as unknown as DatabaseClient;
    const service = new SyncService(fakeDb);
    (
        service as unknown as {
            executeSync: () => Promise<SyncRunResult>;
        }
    ).executeSync = async () => {
        calls.count += 1;
        return impl();
    };
    return { service, calls };
};

test("syncEverything serializes concurrent calls by reusing the active run", async () => {
    let release: () => void = () => {};
    const inFlight = new Promise<void>((resolve) => {
        release = resolve;
    });
    const { service, calls } = createServiceWithMockExecute(async () => {
        await inFlight;
        return makeStubResult();
    });

    const first = service.syncEverything("manual");
    const second = service.syncEverything("cron");
    release();
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(calls.count, 1);
    assert.equal(firstResult, secondResult);
});

test("syncEverything allows a second run after the first one settles", async () => {
    const { service, calls } = createServiceWithMockExecute(async () =>
        makeStubResult(),
    );

    await service.syncEverything("startup");
    await service.syncEverything("cron");

    assert.equal(calls.count, 2);
});

test("getStatus reports running=true while a sync is in flight", async () => {
    let release: () => void = () => {};
    const inFlight = new Promise<void>((resolve) => {
        release = resolve;
    });
    const { service } = createServiceWithMockExecute(async () => {
        await inFlight;
        return makeStubResult();
    });

    const pending = service.syncEverything("manual");
    assert.equal(service.getStatus().running, true);
    release();
    await pending;
    assert.equal(service.getStatus().running, false);
});
