import { GtfsFeedId } from "@metro-now/database";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseService } from "src/modules/database/database.service";
import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import { RouteService } from "src/modules/route/route.service";
import { VehicleType } from "src/types/graphql.generated";

describe("RouteService", () => {
    let service: RouteService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteService,
                {
                    provide: DatabaseService,
                    useValue: { db: {} },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        get: jest.fn(),
                        set: jest.fn(),
                        wrap: jest.fn(),
                    },
                },
                {
                    provide: LeoGtfsService,
                    useValue: {
                        getRouteById: jest.fn(),
                        getRoutesByIds: jest.fn(),
                    },
                },
            ],
        }).compile();

        service = module.get<RouteService>(RouteService);
    });

    describe("isSubstitute", () => {
        it("returns true for X-prefixed routes", () => {
            expect(service.isSubstitute("X22")).toBe(true);
        });

        it("returns false for regular routes", () => {
            expect(service.isSubstitute("22")).toBe(false);
        });

        it("returns false for empty string", () => {
            expect(service.isSubstitute("")).toBe(false);
        });
    });

    describe("isNight", () => {
        it("returns true for PID tram night route 91", () => {
            expect(service.isNight("91")).toBe(true);
        });

        it("returns true for PID tram night route 99", () => {
            expect(service.isNight("99")).toBe(true);
        });

        it("returns true for PID bus night route 910", () => {
            expect(service.isNight("910")).toBe(true);
        });

        it("returns true for PID bus night route 999", () => {
            expect(service.isNight("999")).toBe(true);
        });

        it("returns false for day tram route 22", () => {
            expect(service.isNight("22")).toBe(false);
        });

        it("returns false for day bus route 100", () => {
            expect(service.isNight("100")).toBe(false);
        });

        it("returns false for non-numeric route A", () => {
            expect(service.isNight("A")).toBe(false);
        });

        it("strips X prefix before checking", () => {
            expect(service.isNight("X91")).toBe(true);
        });

        it("returns true for route 90 (boundary)", () => {
            expect(service.isNight("90")).toBe(true);
        });

        it("returns false for route 89", () => {
            expect(service.isNight("89")).toBe(false);
        });

        it("returns true for Bratislava night route N21", () => {
            expect(service.isNight("N21", GtfsFeedId.BRATISLAVA)).toBe(true);
        });

        it("returns true for Brno night route N89", () => {
            expect(service.isNight("N89", GtfsFeedId.BRNO)).toBe(true);
        });

        it("returns false for non-night Brno tram route 8", () => {
            expect(service.isNight("8", GtfsFeedId.BRNO)).toBe(false);
        });
    });

    describe("getVehicleTypeForRoute", () => {
        it("returns TRAM for PID numeric route under 100", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "22" })).toBe(
                VehicleType.TRAM,
            );
        });

        it("returns BUS for PID numeric route 100+", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "119" })).toBe(
                VehicleType.BUS,
            );
        });

        it("returns TROLLEYBUS for PID route 58", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "58" })).toBe(
                VehicleType.TROLLEYBUS,
            );
        });

        it("returns TROLLEYBUS for PID route 59", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "59" })).toBe(
                VehicleType.TROLLEYBUS,
            );
        });

        it("returns SUBWAY for metro line A", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "A" })).toBe(
                VehicleType.SUBWAY,
            );
        });

        it("returns SUBWAY for metro line B", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "B" })).toBe(
                VehicleType.SUBWAY,
            );
        });

        it("returns FERRY for P-prefixed route", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "P1" })).toBe(
                VehicleType.FERRY,
            );
        });

        it("returns FUNICULAR for LD", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "LD" })).toBe(
                VehicleType.FUNICULAR,
            );
        });

        it("returns TRAIN for S-prefixed route", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "S9" })).toBe(
                VehicleType.TRAIN,
            );
        });

        it("returns TRAIN for R-prefixed route", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "R10" })).toBe(
                VehicleType.TRAIN,
            );
        });

        it("returns BUS for AE-prefixed route", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "AE" })).toBe(
                VehicleType.BUS,
            );
        });

        it("strips X prefix for substitute routes", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "X22" })).toBe(
                VehicleType.TRAM,
            );
        });

        it("uses feed-aware rules for Brno trams", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.BRNO,
                    routeName: "8",
                }),
            ).toBe(VehicleType.TRAM);
        });

        it("uses feed-aware rules for Brno trolleybuses", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.BRNO,
                    routeName: "25",
                }),
            ).toBe(VehicleType.TROLLEYBUS);
        });

        it("uses feed-aware rules for Brno rail replacements", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.BRNO,
                    routeName: "xS3",
                }),
            ).toBe(VehicleType.TRAIN);
        });

        it("uses feed-aware rules for Bratislava trams", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.BRATISLAVA,
                    routeName: "5",
                }),
            ).toBe(VehicleType.TRAM);
        });

        it("uses GTFS route_type to distinguish Bratislava trolleybuses", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.BRATISLAVA,
                    routeName: "201",
                    gtfsRouteType: "11",
                }),
            ).toBe(VehicleType.TROLLEYBUS);
        });

        it("uses GTFS route_type to distinguish Bratislava buses", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.BRATISLAVA,
                    routeName: "201",
                    gtfsRouteType: "3",
                }),
            ).toBe(VehicleType.BUS);
        });

        it("keeps Liberec line 11 as tram even when route_type is 11", () => {
            expect(
                service.getVehicleTypeForRoute({
                    feedId: GtfsFeedId.LIBEREC,
                    routeName: "11",
                    gtfsRouteType: "11",
                }),
            ).toBe(VehicleType.TRAM);
        });

        it("falls back to PID route name heuristics when gtfsRouteType is null", () => {
            expect(
                service.getVehicleTypeForRoute({
                    routeName: "A",
                    gtfsRouteType: null,
                }),
            ).toBe(VehicleType.SUBWAY);
        });

        it("defaults to BUS for unknown route names", () => {
            expect(service.getVehicleTypeForRoute({ routeName: "ZZZ" })).toBe(
                VehicleType.BUS,
            );
        });
    });
});

describe("RouteService platform route lookup", () => {
    it("keeps route IDs that contain a colon (non-PID feeds)", async () => {
        const routeLinks = [
            { feedId: GtfsFeedId.BRNO, routeId: "BRR:123", platformId: "P1" },
            { feedId: GtfsFeedId.PID, routeId: "L991", platformId: "P1" },
            { feedId: GtfsFeedId.BRNO, routeId: "BRR:123", platformId: "P2" },
        ];
        const query = {
            select: jest.fn().mockReturnThis(),
            distinct: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(routeLinks),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteService,
                {
                    provide: DatabaseService,
                    useValue: { db: { selectFrom: jest.fn(() => query) } },
                },
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        get: jest.fn(),
                        set: jest.fn(),
                        wrap: jest.fn(),
                    },
                },
                {
                    provide: LeoGtfsService,
                    useValue: {
                        getRouteById: jest.fn(),
                        getRoutesByIds: jest.fn(),
                    },
                },
            ],
        }).compile();
        const service = module.get<RouteService>(RouteService);
        const getOne = jest
            .spyOn(service, "getOneGraphQL")
            .mockImplementation(async (id, feed) =>
                feed === GtfsFeedId.BRNO
                    ? ({ id: "BRR:123", feed: GtfsFeedId.BRNO } as never)
                    : ({ id: "991", feed: GtfsFeedId.PID } as never),
            );

        const routesByPlatform = await (
            service as unknown as {
                loadGraphQLRoutesByPlatformIds: (
                    ids: string[],
                ) => Promise<Map<string, { id: string }[]>>;
            }
        ).loadGraphQLRoutesByPlatformIds(["P1", "P2"]);

        expect(getOne).toHaveBeenCalledTimes(2);
        expect(getOne).toHaveBeenCalledWith("BRR:123", GtfsFeedId.BRNO);
        expect(getOne).toHaveBeenCalledWith("L991", GtfsFeedId.PID);
        expect(routesByPlatform.get("P1")?.map((route) => route.id)).toEqual([
            "BRR:123",
            "991",
        ]);
        expect(routesByPlatform.get("P2")?.map((route) => route.id)).toEqual([
            "BRR:123",
        ]);
    });
});

describe("RouteService Leo fallback", () => {
    const createService = async () => {
        const getRouteById = jest.fn().mockResolvedValue(null);
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RouteService,
                { provide: DatabaseService, useValue: { db: {} } },
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        get: jest.fn(),
                        set: jest.fn(),
                        wrap: jest.fn((_key: string, load: () => unknown) =>
                            load(),
                        ),
                    },
                },
                {
                    provide: LeoGtfsService,
                    useValue: { getRouteById, getRoutesByIds: jest.fn() },
                },
            ],
        }).compile();
        const service = module.get<RouteService>(RouteService);
        jest.spyOn(
            service as unknown as {
                loadGraphQLRoutesByIds: () => Promise<unknown[]>;
            },
            "loadGraphQLRoutesByIds",
        ).mockResolvedValue([]);

        return { service, getRouteById };
    };

    it("skips the Leo feed when another feed is requested", async () => {
        const { service, getRouteById } = await createService();

        await expect(
            service.getOneGraphQL("LTL:2111", GtfsFeedId.PID),
        ).resolves.toBeNull();
        expect(getRouteById).not.toHaveBeenCalled();
    });

    it("uses the Leo feed for unscoped and Leo-scoped requests", async () => {
        const { service, getRouteById } = await createService();

        await service.getOneGraphQL("LTL:2111");
        await service.getOneGraphQL("LTL:2111", GtfsFeedId.LEO);
        expect(getRouteById).toHaveBeenCalledTimes(2);
    });
});
