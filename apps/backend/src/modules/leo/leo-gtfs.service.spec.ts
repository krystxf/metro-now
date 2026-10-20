import type { Cache } from "cache-manager";

import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import type {
    LeoCatalog,
    LeoPlatform,
    LeoRoute,
    LeoStop,
} from "src/modules/leo/leo.types";

const platform = (
    id: string,
    routes: Array<{ id: string; name: string }>,
    stopId = `S-${id}`,
): LeoPlatform => ({
    id,
    latitude: 48,
    longitude: 17,
    name: `Platform ${id}`,
    isMetro: false,
    code: null,
    stopId,
    routes,
});

const stop = (id: string, platforms: LeoPlatform[]): LeoStop => ({
    id,
    gtfsStopId: id.replace(/^TLS:/, ""),
    name: `Stop ${id}`,
    avgLatitude: 48,
    avgLongitude: 17,
    normalizedName: id.toLowerCase(),
    platforms,
    entrances: [],
});

const route = (id: string, shortName: string): LeoRoute => ({
    id,
    shortName,
    longName: null,
    color: null,
    url: null,
    type: "100",
    directions: [],
    shapes: [],
});

const createServiceWithCatalog = (catalog: LeoCatalog) => {
    const cacheManager = {
        wrap: jest.fn(async (_key: string, callback: () => unknown) =>
            callback(),
        ),
    } as unknown as Cache;
    const service = new LeoGtfsService(cacheManager);
    jest.spyOn(service, "getCatalog").mockResolvedValue(catalog);
    return service;
};

describe("LeoGtfsService", () => {
    const sampleCatalog: LeoCatalog = {
        routes: [route("R1", "RJ 100"), route("R2", "RJ 200")],
        stops: [
            stop("TLS:a", [
                platform("P1", [
                    { id: "R1", name: "RJ 100" },
                    { id: "R2", name: "RJ 200" },
                ]),
            ]),
            stop("TLS:b", [
                platform("P2", [{ id: "R1", name: "RJ 100" }]),
                platform("P3", []),
            ]),
        ],
    };

    it("getStops returns all stops from the catalog", async () => {
        const service = createServiceWithCatalog(sampleCatalog);

        const stops = await service.getStops();

        expect(stops.map((s) => s.id)).toEqual(["TLS:a", "TLS:b"]);
    });

    it("getStopById returns null for unknown ids and the matching stop otherwise", async () => {
        const service = createServiceWithCatalog(sampleCatalog);

        expect(await service.getStopById("missing")).toBeNull();
        expect((await service.getStopById("TLS:a"))?.id).toBe("TLS:a");
    });

    it("getPlatformsByIds returns only platforms with matching ids across stops", async () => {
        const service = createServiceWithCatalog(sampleCatalog);

        const result = await service.getPlatformsByIds(["P1", "P3", "P_missing"]);

        expect(result.map((p) => p.id).sort()).toEqual(["P1", "P3"]);
    });

    it("getPlatformById returns null when no platform matches", async () => {
        const service = createServiceWithCatalog(sampleCatalog);

        expect(await service.getPlatformById("missing")).toBeNull();
        expect((await service.getPlatformById("P2"))?.id).toBe("P2");
    });

    it("getRoutesByIds returns the routes whose ids match", async () => {
        const service = createServiceWithCatalog(sampleCatalog);

        const result = await service.getRoutesByIds(["R2", "missing"]);

        expect(result.map((r) => r.id)).toEqual(["R2"]);
    });

    it("getRoutesByPlatformIds maps each requested platform to its full route objects, even when empty", async () => {
        const service = createServiceWithCatalog(sampleCatalog);

        const result = await service.getRoutesByPlatformIds([
            "P1",
            "P3",
            "P_missing",
        ]);

        expect([...result.keys()].sort()).toEqual([
            "P1",
            "P3",
            "P_missing",
        ]);
        expect(result.get("P1")?.map((r) => r.id)).toEqual(["R1", "R2"]);
        expect(result.get("P3")).toEqual([]);
        expect(result.get("P_missing")).toEqual([]);
    });

    it("getRouteIdsByShortName returns route ids sorted lexicographically", async () => {
        const catalog: LeoCatalog = {
            routes: [
                route("R_b", "RJ 100"),
                route("R_a", "RJ 100"),
                route("R_c", "RJ 200"),
            ],
            stops: [],
        };
        const service = createServiceWithCatalog(catalog);

        const result = await service.getRouteIdsByShortName("RJ 100");

        expect(result).toEqual(["R_a", "R_b"]);
    });
});
