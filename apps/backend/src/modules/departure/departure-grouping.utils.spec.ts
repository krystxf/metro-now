import { limitDeparturesPerRoute } from "src/modules/departure/departure-grouping.utils";
import type { DepartureSchema } from "src/modules/departure/schema/departure.schema";

const createDeparture = (
    overrides: Partial<DepartureSchema>,
): DepartureSchema => ({
    id: null,
    departure: {
        predicted: "2026-01-01T10:00:00.000Z",
        scheduled: "2026-01-01T10:00:00.000Z",
    },
    delay: 0,
    headsign: "Test",
    route: "A",
    routeId: null,
    platformCode: "1",
    platformId: "P1",
    isRealtime: true,
    ...overrides,
});

describe("limitDeparturesPerRoute", () => {
    it("limits departures independently for each platform and route", () => {
        const departures = [
            createDeparture({ id: "a-1", platformCode: "1", route: "A" }),
            createDeparture({ id: "a-2", platformCode: "1", route: "A" }),
            createDeparture({ id: "a-3", platformCode: "1", route: "A" }),
            createDeparture({ id: "b-1", platformCode: "2", route: "A" }),
            createDeparture({ id: "b-2", platformCode: "2", route: "A" }),
            createDeparture({ id: "c-1", platformCode: "1", route: "B" }),
        ];

        expect(
            limitDeparturesPerRoute(departures, 2).map(({ id }) => id),
        ).toEqual(["a-1", "a-2", "b-1", "b-2", "c-1"]);
    });

    it("returns an empty array when the limit is zero", () => {
        const departures = [
            createDeparture({ id: "a-1", platformCode: "1", route: "A" }),
        ];

        expect(limitDeparturesPerRoute(departures, 0)).toEqual([]);
    });
});
