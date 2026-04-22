import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test } from "@nestjs/testing";

import { TransitlandService } from "src/modules/transitland/transitland.service";

const validResponse = {
    stops: [
        {
            stop_id: "STOP_1",
            stop_name: "Stop 1",
            platform_code: "1",
            departures: [
                {
                    date: "2026-01-01",
                    service_date: "20260101",
                    departure_time: "10:00:00",
                    stop_sequence: 1,
                    schedule_relationship: "SCHEDULED",
                    departure: {
                        scheduled_local: "2026-01-01T10:00:00+01:00",
                        scheduled_utc: "2026-01-01T09:00:00Z",
                        estimated_local: null,
                        estimated_utc: null,
                    },
                    trip: {
                        id: "1",
                        direction_id: 0,
                        trip_headsign: "Praha",
                        trip_id: "trip-1",
                        trip_short_name: null,
                        route: {
                            route_id: "route-1",
                            route_short_name: "LEO",
                            route_long_name: "Leo Express",
                            route_type: 2,
                        },
                    },
                },
            ],
        },
    ],
};

describe("TransitlandService", () => {
    const originalApiKey = process.env.TRANSIT_LAND_API_KEY;

    afterEach(() => {
        if (originalApiKey === undefined) {
            Reflect.deleteProperty(process.env, "TRANSIT_LAND_API_KEY");
        } else {
            process.env.TRANSIT_LAND_API_KEY = originalApiKey;
        }
        jest.restoreAllMocks();
    });

    it("fetches and caches stop departures", async () => {
        process.env.TRANSIT_LAND_API_KEY = "secret";
        const cacheManager = {
            wrap: jest.fn(async (_key, callback) => callback()),
        };
        const fetchMock = jest.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: async () => validResponse,
        } as Response);
        const moduleRef = await Test.createTestingModule({
            providers: [
                TransitlandService,
                {
                    provide: CACHE_MANAGER,
                    useValue: cacheManager,
                },
            ],
        }).compile();
        const service = moduleRef.get(TransitlandService);

        await expect(
            service.getStopDepartures({
                stopKey: "leo:station/1",
                params: {
                    limit: 2,
                    realtime: true,
                    skip: null,
                },
            }),
        ).resolves.toEqual(validResponse);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://transit.land/api/v2/rest/stops/leo%3Astation%2F1/departures?apikey=secret&limit=2&realtime=true",
        );
        expect(cacheManager.wrap).toHaveBeenCalled();
    });

    it("throws when the API key is missing", async () => {
        Reflect.deleteProperty(process.env, "TRANSIT_LAND_API_KEY");
        const moduleRef = await Test.createTestingModule({
            providers: [
                TransitlandService,
                {
                    provide: CACHE_MANAGER,
                    useValue: { wrap: jest.fn() },
                },
            ],
        }).compile();
        const service = moduleRef.get(TransitlandService);

        await expect(
            service.getStopDepartures({
                stopKey: "stop",
                params: {},
            }),
        ).rejects.toThrow(
            "TRANSIT_LAND_API_KEY is required for Leo departures",
        );
    });

    it("throws when Transitland returns a non-OK response", async () => {
        process.env.TRANSIT_LAND_API_KEY = "secret";
        jest.spyOn(global, "fetch").mockResolvedValue({
            ok: false,
            status: 502,
            statusText: "Bad Gateway",
        } as Response);
        const moduleRef = await Test.createTestingModule({
            providers: [
                TransitlandService,
                {
                    provide: CACHE_MANAGER,
                    useValue: {
                        wrap: jest.fn(async (_key, callback) => callback()),
                    },
                },
            ],
        }).compile();
        const service = moduleRef.get(TransitlandService);

        await expect(
            service.getStopDepartures({
                stopKey: "stop",
                params: {},
            }),
        ).rejects.toThrow("Failed to fetch Transitland data: 502 Bad Gateway");
    });
});
