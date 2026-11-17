import {
    buildLogicalStops,
    chooseDominantPattern,
    normalizeStopName,
    parseRoute,
    parseStop,
    parseStopTime,
    parseTrip,
    toOptionalString,
} from "src/modules/leo/leo-gtfs-parsers.utils";

describe("toOptionalString", () => {
    it("returns null for undefined", () => {
        expect(toOptionalString(undefined)).toBeNull();
    });

    it("returns null for empty string", () => {
        expect(toOptionalString("")).toBeNull();
    });

    it("returns null for whitespace-only string", () => {
        expect(toOptionalString("   ")).toBeNull();
    });

    it("returns trimmed value for non-empty string", () => {
        expect(toOptionalString("  hello  ")).toBe("hello");
    });

    it("returns value unchanged when no surrounding whitespace", () => {
        expect(toOptionalString("value")).toBe("value");
    });
});

describe("normalizeStopName", () => {
    it("lowercases the name", () => {
        expect(normalizeStopName("Praha")).toBe("praha");
    });

    it("strips diacritics", () => {
        expect(normalizeStopName("Náměstí")).toBe("namesti");
    });

    it("replaces non-alphanumeric runs with a single space", () => {
        expect(normalizeStopName("A/B - C")).toBe("a b c");
    });

    it("collapses multiple spaces", () => {
        expect(normalizeStopName("hello   world")).toBe("hello world");
    });

    it("trims leading/trailing whitespace", () => {
        expect(normalizeStopName("  test  ")).toBe("test");
    });
});

describe("parseStop", () => {
    const baseRow = {
        stop_id: "s-1",
        stop_name: "Station One",
        stop_lat: "50.0",
        stop_lon: "14.0",
    };

    it("parses a minimal stop row", () => {
        const result = parseStop(baseRow);

        expect(result).toEqual({
            id: "s-1",
            name: "Station One",
            latitude: 50.0,
            longitude: 14.0,
            locationType: "0",
            parentStationId: null,
            platformCode: null,
        });
    });

    it("parses location_type, parent_station and platform_code when present", () => {
        const result = parseStop({
            ...baseRow,
            location_type: "4",
            parent_station: "s-parent",
            platform_code: "A",
        });

        expect(result.locationType).toBe("4");
        expect(result.parentStationId).toBe("s-parent");
        expect(result.platformCode).toBe("A");
    });

    it("defaults locationType to '0' when location_type is empty string", () => {
        const result = parseStop({ ...baseRow, location_type: "" });

        expect(result.locationType).toBe("0");
    });

    it("trims stop_name whitespace", () => {
        const result = parseStop({ ...baseRow, stop_name: "  Trimmed  " });

        expect(result.name).toBe("Trimmed");
    });

    it("throws for non-finite coordinates", () => {
        expect(() => parseStop({ ...baseRow, stop_lat: "NaN" })).toThrow(
            /Invalid Leo GTFS stop coordinates/,
        );
    });
});

describe("parseRoute", () => {
    const baseRow = {
        route_id: "r-1",
        agency_id: "a-1",
        route_short_name: "LE 100",
        route_type: "100",
    };

    it("parses a minimal route row", () => {
        const result = parseRoute(baseRow);

        expect(result).toEqual({
            id: "r-1",
            agencyId: "a-1",
            shortName: "LE 100",
            longName: null,
            type: "100",
            url: null,
            color: null,
        });
    });

    it("parses optional long name, url, and color", () => {
        const result = parseRoute({
            ...baseRow,
            route_long_name: "Leo Express 100",
            route_url: "https://leo.cz",
            route_color: "FF0000",
        });

        expect(result.longName).toBe("Leo Express 100");
        expect(result.url).toBe("https://leo.cz");
        expect(result.color).toBe("FF0000");
    });

    it("trims short name whitespace", () => {
        const result = parseRoute({ ...baseRow, route_short_name: "  LE  " });

        expect(result.shortName).toBe("LE");
    });
});

describe("parseTrip", () => {
    const baseRow = {
        trip_id: "t-1",
        route_id: "r-1",
    };

    it("parses a minimal trip row with default directionId '0'", () => {
        const result = parseTrip(baseRow);

        expect(result).toEqual({
            id: "t-1",
            routeId: "r-1",
            headsign: null,
            shortName: null,
            directionId: "0",
        });
    });

    it("parses optional headsign, short name, and direction_id", () => {
        const result = parseTrip({
            ...baseRow,
            trip_headsign: "Praha",
            trip_short_name: "T1",
            direction_id: "1",
        });

        expect(result.headsign).toBe("Praha");
        expect(result.shortName).toBe("T1");
        expect(result.directionId).toBe("1");
    });

    it("defaults directionId to '0' when direction_id is blank", () => {
        const result = parseTrip({ ...baseRow, direction_id: "" });

        expect(result.directionId).toBe("0");
    });
});

describe("parseStopTime", () => {
    it("parses a valid stop time row", () => {
        const result = parseStopTime({
            trip_id: "t-1",
            stop_id: "s-1",
            stop_sequence: "3",
        });

        expect(result).toEqual({
            tripId: "t-1",
            stopId: "s-1",
            stopSequence: 3,
        });
    });

    it("throws for non-integer stop sequence", () => {
        expect(() =>
            parseStopTime({
                trip_id: "t-1",
                stop_id: "s-1",
                stop_sequence: "1.5",
            }),
        ).toThrow(/Invalid Leo GTFS stop sequence/);
    });
});

describe("buildLogicalStops", () => {
    const makeStop = (
        id: string,
        overrides: Partial<{
            locationType: string;
            parentStationId: string | null;
            platformCode: string | null;
        }> = {},
    ) => ({
        id,
        name: `Stop ${id}`,
        latitude: 50.0 + Number.parseFloat(id.replace(/\D/g, "")) * 0.001,
        longitude: 14.0,
        locationType: "0",
        parentStationId: null,
        platformCode: null,
        ...overrides,
    });

    it("returns empty results for an empty input set", () => {
        const result = buildLogicalStops({
            referencedStopIds: new Set(),
            stopsById: new Map(),
        });

        expect(result.logicalStops).toEqual([]);
        expect(result.platformById.size).toBe(0);
        expect(result.publicStopIdByPlatformId.size).toBe(0);
    });

    it("creates a standalone logical stop from a platform-type stop", () => {
        const stop = makeStop("1");
        const stopsById = new Map([["1", stop]]);
        const result = buildLogicalStops({
            referencedStopIds: new Set(["1"]),
            stopsById,
        });

        expect(result.logicalStops).toHaveLength(1);
        expect(result.logicalStops[0]?.id).toBe("TLS:1");
        expect(result.logicalStops[0]?.platforms).toHaveLength(1);
        expect(result.logicalStops[0]?.platforms[0]?.id).toBe("TLP:1");
    });

    it("groups child platforms under their parent station", () => {
        const parent = makeStop("station", { locationType: "1" });
        const p1 = makeStop("p1", {
            locationType: "0",
            parentStationId: "station",
        });
        const p2 = makeStop("p2", {
            locationType: "0",
            parentStationId: "station",
        });
        const stopsById = new Map([
            ["station", parent],
            ["p1", p1],
            ["p2", p2],
        ]);

        const result = buildLogicalStops({
            referencedStopIds: new Set(["p1", "p2"]),
            stopsById,
        });

        expect(result.logicalStops).toHaveLength(1);
        expect(result.logicalStops[0]?.id).toBe("TLS:station");
        expect(result.logicalStops[0]?.platforms.map((p) => p.id)).toEqual([
            "TLP:p1",
            "TLP:p2",
        ]);
    });

    it("sets normalizedName on each logical stop", () => {
        const stop = makeStop("1");
        stop.name = "Náměstí Republiky";
        const stopsById = new Map([["1", stop]]);
        const result = buildLogicalStops({
            referencedStopIds: new Set(["1"]),
            stopsById,
        });

        expect(result.logicalStops[0]?.normalizedName).toBe(
            "namesti republiky",
        );
    });

    it("averages coordinates from multiple platforms", () => {
        const parent = makeStop("s", { locationType: "1" });
        const p1 = {
            ...makeStop("p1", { locationType: "0", parentStationId: "s" }),
            latitude: 50.0,
            longitude: 14.0,
        };
        const p2 = {
            ...makeStop("p2", { locationType: "0", parentStationId: "s" }),
            latitude: 51.0,
            longitude: 15.0,
        };
        const stopsById = new Map([
            ["s", parent],
            ["p1", p1],
            ["p2", p2],
        ]);

        const result = buildLogicalStops({
            referencedStopIds: new Set(["p1"]),
            stopsById,
        });

        expect(result.logicalStops[0]?.avgLatitude).toBeCloseTo(50.5);
        expect(result.logicalStops[0]?.avgLongitude).toBeCloseTo(14.5);
    });

    it("populates platformById and publicStopIdByPlatformId", () => {
        const stop = makeStop("42");
        const stopsById = new Map([["42", stop]]);
        const result = buildLogicalStops({
            referencedStopIds: new Set(["42"]),
            stopsById,
        });

        expect(result.platformById.has("TLP:42")).toBe(true);
        expect(result.publicStopIdByPlatformId.get("TLP:42")).toBe("TLS:42");
    });

    it("ignores stop IDs that are not in stopsById", () => {
        const result = buildLogicalStops({
            referencedStopIds: new Set(["missing"]),
            stopsById: new Map(),
        });

        expect(result.logicalStops).toHaveLength(0);
    });
});

describe("chooseDominantPattern", () => {
    it("returns null for an empty patterns map", () => {
        expect(chooseDominantPattern(new Map())).toBeNull();
    });

    it("returns the only pattern when there is just one", () => {
        const pattern = { directionId: "0", platformIds: ["a"], tripCount: 1 };
        const result = chooseDominantPattern(new Map([["p", pattern]]));

        expect(result).toBe(pattern);
    });

    it("selects the pattern with the highest tripCount", () => {
        const dominant = {
            directionId: "0",
            platformIds: ["a", "b"],
            tripCount: 10,
        };
        const other = { directionId: "0", platformIds: ["a"], tripCount: 2 };
        const result = chooseDominantPattern(
            new Map([
                ["k1", other],
                ["k2", dominant],
            ]),
        );

        expect(result).toBe(dominant);
    });

    it("breaks ties by platformIds length (longer wins)", () => {
        const longer = {
            directionId: "0",
            platformIds: ["a", "b", "c"],
            tripCount: 5,
        };
        const shorter = { directionId: "0", platformIds: ["a"], tripCount: 5 };
        const result = chooseDominantPattern(
            new Map([
                ["k1", shorter],
                ["k2", longer],
            ]),
        );

        expect(result).toBe(longer);
    });

    it("breaks further ties lexicographically by joined platformIds", () => {
        const earlier = {
            directionId: "0",
            platformIds: ["a", "b"],
            tripCount: 5,
        };
        const later = {
            directionId: "0",
            platformIds: ["x", "y"],
            tripCount: 5,
        };
        const result = chooseDominantPattern(
            new Map([
                ["k1", later],
                ["k2", earlier],
            ]),
        );

        expect(result).toBe(earlier);
    });
});
