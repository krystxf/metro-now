import type { DatabaseService } from "src/modules/database/database.service";
import { GtfsFallbackDepartureService } from "src/modules/departure/gtfs-fallback-departure.service";

const makeMissingTableError = () => {
    const error = new Error('relation "GtfsStopTime" does not exist') as Error & {
        code: string;
    };
    error.code = "42P01";
    return error;
};

const createService = (executeImpl: () => Promise<unknown[]>) => {
    const builder = {
        select: jest.fn().mockReturnThis(),
        distinct: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn(executeImpl),
    };
    const database = {
        db: { selectFrom: jest.fn(() => builder) },
    } as unknown as DatabaseService;
    return {
        service: new GtfsFallbackDepartureService(database),
        builder,
        database,
    };
};

describe("GtfsFallbackDepartureService", () => {
    it("short-circuits when platformIds is empty", async () => {
        const { service, database } = createService(async () => []);

        const result = await service.loadDepartures({
            platformIds: [],
            minutesBefore: 0,
            minutesAfter: 120,
            totalLimit: 10,
        });

        expect(result).toEqual([]);
        expect(database.db.selectFrom).not.toHaveBeenCalled();
    });

    it("returns [] without querying when no non-PID feed exists for the requested platforms", async () => {
        const { service, database } = createService(async () => []);

        const result = await service.loadDepartures({
            platformIds: ["LP:1"],
            minutesBefore: 0,
            minutesAfter: 120,
            totalLimit: 10,
        });

        expect(result).toEqual([]);
        // First call: feedId distinct query — returns no rows → early return.
        expect(database.db.selectFrom).toHaveBeenCalledTimes(1);
    });

    it("logs a warning and disables fallback when a missing-table postgres error is raised", async () => {
        const { service } = createService(async () => {
            throw makeMissingTableError();
        });
        const warnSpy = jest
            .spyOn(
                (service as unknown as { logger: { warn: jest.Mock } }).logger,
                "warn",
            )
            .mockImplementation(() => {});

        const first = await service.loadDepartures({
            platformIds: ["LP:1"],
            minutesBefore: 0,
            minutesAfter: 120,
            totalLimit: 10,
        });
        const second = await service.loadDepartures({
            platformIds: ["LP:1"],
            minutesBefore: 0,
            minutesAfter: 120,
            totalLimit: 10,
        });

        expect(first).toEqual([]);
        expect(second).toEqual([]);
        // After the first call, fallbackAvailable should be false so the
        // second call exits before querying again.
        expect(warnSpy).toHaveBeenCalledTimes(1);
        expect(warnSpy.mock.calls[0]?.[0]).toContain(
            "GTFS timetable fallback disabled",
        );
        expect(warnSpy.mock.calls[0]?.[0]).toContain("LP:1");
    });

    it("rethrows non-postgres errors", async () => {
        const { service } = createService(async () => {
            throw new Error("network down");
        });

        await expect(
            service.loadDepartures({
                platformIds: ["LP:1"],
                minutesBefore: 0,
                minutesAfter: 120,
                totalLimit: 10,
            }),
        ).rejects.toThrow("network down");
    });
});
