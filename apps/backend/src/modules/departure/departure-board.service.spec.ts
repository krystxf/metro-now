import type { DatabaseService } from "src/modules/database/database.service";
import { DepartureBoardService } from "src/modules/departure/departure-board.service";
import type { GolemioService } from "src/modules/golemio/golemio.service";

type MockQueryBuilder = {
    select: jest.Mock;
    where: jest.Mock;
    execute: jest.Mock;
};

const makeQueryBuilder = (rows: Array<{ id: string }>): MockQueryBuilder => {
    const builder: MockQueryBuilder = {
        select: jest.fn(),
        where: jest.fn(),
        execute: jest.fn(async () => rows),
    };
    builder.select.mockReturnValue(builder);
    builder.where.mockReturnValue(builder);
    return builder;
};

const makeService = (rowsByCall: Array<Array<{ id: string }>>) => {
    const builders = rowsByCall.map((rows) => makeQueryBuilder(rows));
    const selectFrom = jest.fn();
    builders.forEach((builder) => {
        selectFrom.mockReturnValueOnce(builder);
    });
    const database = { db: { selectFrom } } as unknown as DatabaseService;
    const golemioService = {
        getGolemioData: jest.fn(),
    } as unknown as GolemioService;
    const service = new DepartureBoardService(database, golemioService);
    return { service, database, golemioService, builders, selectFrom };
};

describe("DepartureBoardService", () => {
    describe("resolvePlatformIds", () => {
        it("returns empty when both platformIds and stopIds are empty", async () => {
            const { service, selectFrom } = makeService([]);

            const result = await service.resolvePlatformIds({
                platformIds: [],
                stopIds: [],
            });

            expect(result).toEqual([]);
            expect(selectFrom).not.toHaveBeenCalled();
        });

        it("merges direct platform ids and stop-resolved platform ids and deduplicates", async () => {
            const { service } = makeService([
                [{ id: "P1" }, { id: "P2" }],
                [{ id: "P2" }, { id: "P3" }],
            ]);

            const result = await service.resolvePlatformIds({
                platformIds: ["P1", "P2"],
                stopIds: ["S1"],
            });

            expect(result).toEqual(["P1", "P2", "P3"]);
        });

        it("filters by isMetro when metroOnly is provided", async () => {
            const { service, builders } = makeService([[{ id: "M1" }], []]);

            await service.resolvePlatformIds({
                platformIds: ["any"],
                stopIds: [],
                metroOnly: true,
            });

            const firstBuilder = builders[0];
            if (!firstBuilder) throw new Error("builder missing");
            const whereCalls = firstBuilder.where.mock.calls;
            expect(whereCalls).toContainEqual(["isMetro", "=", true]);
        });

        it("does not filter by isMetro when metroOnly is undefined", async () => {
            const { service, builders } = makeService([[{ id: "P1" }], []]);

            await service.resolvePlatformIds({
                platformIds: ["P1"],
                stopIds: [],
            });

            const firstBuilder = builders[0];
            if (!firstBuilder) throw new Error("builder missing");
            const hasMetroFilter = firstBuilder.where.mock.calls.some(
                (call) => call[0] === "isMetro",
            );
            expect(hasMetroFilter).toBe(false);
        });

        it("respects the limit parameter", async () => {
            const manyRows = Array.from({ length: 10 }, (_, i) => ({
                id: `P${i}`,
            }));
            const { service } = makeService([manyRows, []]);

            const result = await service.resolvePlatformIds({
                platformIds: manyRows.map((row) => row.id),
                stopIds: [],
                limit: 3,
            });

            expect(result).toHaveLength(3);
        });
    });

    describe("fetchDepartureBoard", () => {
        it("short-circuits when no platform ids are provided", async () => {
            const { service, golemioService } = makeService([]);

            const result = await service.fetchDepartureBoard({
                platformIds: [],
                params: {},
            });

            expect(result).toEqual({
                stops: [],
                departures: [],
                infotexts: [],
            });
            expect(golemioService.getGolemioData).not.toHaveBeenCalled();
        });

        it("builds the Golemio URL with deduplicated platform ids and params", async () => {
            const { service, golemioService } = makeService([]);
            (golemioService.getGolemioData as jest.Mock).mockResolvedValue({
                stops: [],
                departures: [],
                infotexts: [],
            });

            await service.fetchDepartureBoard({
                platformIds: ["P2", "P1", "P2"],
                params: { minutesBefore: 0, ignored: null, mode: "metro" },
            });

            const call = (golemioService.getGolemioData as jest.Mock).mock
                .calls[0]?.[0];
            expect(typeof call).toBe("string");
            const url = new URL(`https://example.test${call as string}`);
            expect(url.pathname).toBe("/v2/pid/departureboards");
            expect(url.searchParams.getAll("ids")).toEqual(["P1", "P2"]);
            expect(url.searchParams.get("minutesBefore")).toBe("0");
            expect(url.searchParams.get("mode")).toBe("metro");
            expect(url.searchParams.has("ignored")).toBe(false);
        });
    });
});
