import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Test, type TestingModule } from "@nestjs/testing";

import { DatabaseService } from "src/modules/database/database.service";
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
        it("returns true for tram night route 91", () => {
            expect(service.isNight("91")).toBe(true);
        });

        it("returns true for tram night route 99", () => {
            expect(service.isNight("99")).toBe(true);
        });

        it("returns true for bus night route 910", () => {
            expect(service.isNight("910")).toBe(true);
        });

        it("returns true for bus night route 999", () => {
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

        it("returns false for route 90 (boundary)", () => {
            expect(service.isNight("90")).toBe(true);
        });

        it("returns false for route 89", () => {
            expect(service.isNight("89")).toBe(false);
        });
    });

    describe("getVehicleTypeForRoute", () => {
        it("returns TRAM for numeric route under 100", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "22" }),
            ).toBe(VehicleType.TRAM);
        });

        it("returns BUS for numeric route 100+", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "119" }),
            ).toBe(VehicleType.BUS);
        });

        it("returns TROLLEYBUS for route 58", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "58" }),
            ).toBe(VehicleType.TROLLEYBUS);
        });

        it("returns TROLLEYBUS for route 59", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "59" }),
            ).toBe(VehicleType.TROLLEYBUS);
        });

        it("returns SUBWAY for metro line A", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "A" }),
            ).toBe(VehicleType.SUBWAY);
        });

        it("returns SUBWAY for metro line B", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "B" }),
            ).toBe(VehicleType.SUBWAY);
        });

        it("returns FERRY for P-prefixed route", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "P1" }),
            ).toBe(VehicleType.FERRY);
        });

        it("returns FUNICULAR for LD", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "LD" }),
            ).toBe(VehicleType.FUNICULAR);
        });

        it("returns TRAIN for S-prefixed route", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "S9" }),
            ).toBe(VehicleType.TRAIN);
        });

        it("returns TRAIN for R-prefixed route", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "R10" }),
            ).toBe(VehicleType.TRAIN);
        });

        it("returns BUS for AE-prefixed route", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "AE" }),
            ).toBe(VehicleType.BUS);
        });

        it("strips X prefix for substitute routes", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "X22" }),
            ).toBe(VehicleType.TRAM);
        });

        it("prefers gtfsRouteType when provided", () => {
            expect(
                service.getVehicleTypeForRoute({
                    routeName: "22",
                    gtfsRouteType: "3",
                }),
            ).toBe(VehicleType.BUS);
        });

        it("falls back to route name when gtfsRouteType is null", () => {
            expect(
                service.getVehicleTypeForRoute({
                    routeName: "A",
                    gtfsRouteType: null,
                }),
            ).toBe(VehicleType.SUBWAY);
        });

        it("defaults to BUS for unknown route names", () => {
            expect(
                service.getVehicleTypeForRoute({ routeName: "ZZZ" }),
            ).toBe(VehicleType.BUS);
        });
    });
});
