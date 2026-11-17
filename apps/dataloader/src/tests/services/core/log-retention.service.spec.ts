import assert from "node:assert/strict";
import test from "node:test";

import type { DatabaseClient } from "@metro-now/database";

import { LogRetentionService } from "../../../services/core/log-retention.service";

type DeleteCall = { table: string; cutoff: Date };

const createMockDb = (
    logDeleted: number,
    requestLogDeleted: number,
): { db: DatabaseClient; calls: DeleteCall[] } => {
    const calls: DeleteCall[] = [];

    const chainFor = (table: string, numDeletedRows: bigint) => ({
        where: (_column: string, _op: string, cutoff: Date) => {
            calls.push({ table, cutoff });
            return {
                executeTakeFirst: async () => ({ numDeletedRows }),
            };
        },
    });

    const db = {
        deleteFrom: (table: string) => {
            if (table === "Log") {
                return chainFor(table, BigInt(logDeleted));
            }
            if (table === "RequestLog") {
                return chainFor(table, BigInt(requestLogDeleted));
            }
            throw new Error(`Unexpected table: ${table}`);
        },
    } as unknown as DatabaseClient;

    return { db, calls };
};

test("LogRetentionService deletes rows older than the retention window", async () => {
    const { db, calls } = createMockDb(12, 34);
    const service = new LogRetentionService(db, 30);
    const now = new Date("2026-04-22T00:00:00.000Z");

    const result = await service.purgeOldLogs(now);

    assert.equal(result.deletedLogs, 12);
    assert.equal(result.deletedRequestLogs, 34);
    assert.equal(
        result.cutoff.toISOString(),
        "2026-03-23T00:00:00.000Z",
        "cutoff should be exactly retentionDays before `now`",
    );

    const tables = calls.map((call) => call.table).sort();
    assert.deepEqual(tables, ["Log", "RequestLog"]);

    for (const call of calls) {
        assert.equal(
            call.cutoff.toISOString(),
            result.cutoff.toISOString(),
            `${call.table} query should use the computed cutoff`,
        );
    }
});

test("LogRetentionService tolerates empty delete results", async () => {
    const { db } = createMockDb(0, 0);
    const service = new LogRetentionService(db, 7);

    const result = await service.purgeOldLogs(new Date("2026-04-22T00:00:00Z"));

    assert.equal(result.deletedLogs, 0);
    assert.equal(result.deletedRequestLogs, 0);
});
