import type { DatabaseService } from "src/modules/database/database.service";
import { DepartureServiceV2 } from "src/modules/departure/departure-v2.service";
import type { DepartureBoardService } from "src/modules/departure/departure-board.service";
import type { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import type { LeoStopMatcherService } from "src/modules/leo/leo-stop-matcher.service";

describe("DepartureServiceV2", () => {
    const createService = () => {
        const departureBoardService = {
            resolvePlatformIds: jest.fn(async () => []),
            fetchDepartureBoard: jest.fn(async () => ({
                departures: [],
                infotexts: [],
                stops: [],
            })),
        } as unknown as DepartureBoardService;
        const mockQueryBuilder = () => ({
            select: jest.fn().mockReturnThis(),
            distinct: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            leftJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn(async () => []),
        });
        const database = {
            db: {
                selectFrom: jest.fn(() => mockQueryBuilder()),
            },
        } as unknown as DatabaseService;
        const leoGtfsService = {
            getStops: jest.fn(async () => [
                {
                    id: "TLS:station-a",
                    gtfsStopId: "station-a",
                    name: "Station A",
                    avgLatitude: 50,
                    avgLongitude: 14,
                    normalizedName: "station a",
                    entrances: [],
                    platforms: [
                        {
                            id: "TLP:platform-a",
                            latitude: 50,
                            longitude: 14,
                            name: "Station A",
                            isMetro: false,
                            code: null,
                            stopId: "TLS:station-a",
                            routes: [
                                {
                                    id: "LTL:route-a",
                                    name: "LE 100",
                                },
                            ],
                        },
                    ],
                },
            ]),
            getRoutes: jest.fn(async () => [
                {
                    id: "LTL:route-a",
                    shortName: "LE 100",
                    longName: "Leo Route",
                    color: null,
                    url: null,
                    type: "100",
                    directions: [],
                    shapes: [],
                },
            ]),
        } as unknown as LeoGtfsService;
        const leoStopMatcherService = {
            getMatchedLeoStopByLocalStopId: jest.fn(async () => new Map()),
        } as unknown as LeoStopMatcherService;

        return {
            service: new DepartureServiceV2(
                departureBoardService,
                database,
                leoGtfsService,
                leoStopMatcherService,
            ),
            leoGtfsService,
        };
    };

    it("resolves Leo platform IDs from Leo stops and queries GTFS timetable", async () => {
        const { service, leoGtfsService } = createService();

        const departures = await service.getDepartures({
            stopIds: ["TLS:station-a"],
            platformIds: [],
            vehicleType: "all",
            excludeVehicleType: null,
            limit: null,
            totalLimit: 10,
            minutesBefore: 0,
            minutesAfter: 120,
        });

        expect(leoGtfsService.getStops).toHaveBeenCalled();
        expect(departures).toEqual([]);
    });

    it("excludes Leo departures when metro-only filtering is requested", async () => {
        const { service, leoGtfsService } = createService();

        const departures = await service.getDepartures({
            stopIds: ["TLS:station-a"],
            platformIds: [],
            vehicleType: "metro",
            excludeVehicleType: null,
            limit: null,
            totalLimit: 10,
            minutesBefore: 0,
            minutesAfter: 120,
        });

        expect(departures).toEqual([]);
        expect(leoGtfsService.getStops).not.toHaveBeenCalled();
    });
});
