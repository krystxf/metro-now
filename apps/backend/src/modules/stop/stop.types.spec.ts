import {
    getStopAggregateFromPlatforms,
    toGraphqlVehicleType,
    toLightGraphQLStop,
    toLightGraphQLStops,
} from "src/modules/stop/stop.types";
import { VehicleType } from "src/types/graphql.generated";

describe("stop.types", () => {
    it("maps database vehicle types to GraphQL values", () => {
        expect(toGraphqlVehicleType("METRO" as never)).toBe(VehicleType.SUBWAY);
        expect(toGraphqlVehicleType("SUBWAY" as never)).toBe(
            VehicleType.SUBWAY,
        );
        expect(toGraphqlVehicleType("BUS" as never)).toBe(VehicleType.BUS);
        expect(toGraphqlVehicleType("TROLLEYBUS" as never)).toBe(
            VehicleType.TROLLEYBUS,
        );
        expect(toGraphqlVehicleType(null)).toBeNull();
    });

    it("creates light GraphQL stop records", () => {
        const stop = {
            id: "U1",
            name: "Můstek",
            avgLatitude: 50.08,
            avgLongitude: 14.42,
            feed: "PID" as never,
        };

        expect(toLightGraphQLStop(stop)).toEqual({
            ...stop,
            entrances: [],
            platforms: [],
            isMetro: false,
            vehicleTypes: [],
        });
        expect(toLightGraphQLStops([stop])).toHaveLength(1);
    });

    it("aggregates isMetro and deduplicated vehicle types from platforms", () => {
        expect(
            getStopAggregateFromPlatforms([
                {
                    id: "P1",
                    stopId: "U1",
                    code: null,
                    direction: null,
                    isMetro: true,
                    latitude: 50,
                    longitude: 14,
                    name: "Můstek",
                    routes: [
                        {
                            id: "R1",
                            name: "A",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: "METRO" as never,
                        },
                        {
                            id: "R2",
                            name: "22",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: "TRAM" as never,
                        },
                    ],
                },
                {
                    id: "P2",
                    stopId: "U1",
                    code: null,
                    direction: null,
                    isMetro: false,
                    latitude: 50,
                    longitude: 14,
                    name: "Můstek",
                    routes: [
                        {
                            id: "R3",
                            name: "A",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: "METRO" as never,
                        },
                    ],
                },
            ]),
        ).toEqual({
            isMetro: true,
            vehicleTypes: [VehicleType.SUBWAY, VehicleType.TRAM],
        });
    });

    it("returns empty vehicleTypes and isMetro=false for empty platforms", () => {
        expect(getStopAggregateFromPlatforms([])).toEqual({
            isMetro: false,
            vehicleTypes: [],
        });
    });

    it("skips routes with null vehicleType", () => {
        expect(
            getStopAggregateFromPlatforms([
                {
                    id: "P1",
                    stopId: "U1",
                    code: null,
                    direction: null,
                    isMetro: false,
                    latitude: 50,
                    longitude: 14,
                    name: "Stop",
                    routes: [
                        {
                            id: "R1",
                            name: "X",
                            color: null,
                            feed: "PID" as never,
                            vehicleType: null,
                        },
                    ],
                },
            ]),
        ).toEqual({
            isMetro: false,
            vehicleTypes: [],
        });
    });

    it("sets isMetro=true from platform flag even when routes are empty", () => {
        expect(
            getStopAggregateFromPlatforms([
                {
                    id: "P1",
                    stopId: "U1",
                    code: null,
                    direction: null,
                    isMetro: true,
                    latitude: 50,
                    longitude: 14,
                    name: "Metro Stop",
                    routes: [],
                },
            ]),
        ).toEqual({
            isMetro: true,
            vehicleTypes: [],
        });
    });

    it("deduplicates the same vehicleType appearing across multiple platforms", () => {
        const busRoute = {
            id: "R1",
            name: "200",
            color: null,
            feed: "PID" as never,
            vehicleType: "BUS" as never,
        };

        expect(
            getStopAggregateFromPlatforms([
                {
                    id: "P1",
                    stopId: "U1",
                    code: null,
                    direction: null,
                    isMetro: false,
                    latitude: 50,
                    longitude: 14,
                    name: "Bus Stop",
                    routes: [busRoute],
                },
                {
                    id: "P2",
                    stopId: "U1",
                    code: null,
                    direction: null,
                    isMetro: false,
                    latitude: 50,
                    longitude: 14,
                    name: "Bus Stop",
                    routes: [{ ...busRoute, id: "R2" }],
                },
            ]),
        ).toEqual({
            isMetro: false,
            vehicleTypes: [VehicleType.BUS],
        });
    });

    it("toLightGraphQLStops returns empty array for empty input", () => {
        expect(toLightGraphQLStops([])).toEqual([]);
    });

    it("toGraphqlVehicleType returns null for undefined", () => {
        expect(toGraphqlVehicleType(undefined)).toBeNull();
    });
});
