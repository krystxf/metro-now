import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import {
    ClassifiedVehicleType,
    classifyRoute,
    getVehicleTypeFromGtfsRouteType,
} from "../route-classification";

const ALL_FEED_IDS = Object.values(GtfsFeedId) as GtfsFeedId[];

// Feeds that intentionally rely on the GTFS-typed fallback branch rather than
// a dedicated classifier. Add here only after confirming the fallback is the
// correct long-term behaviour for a feed (not just unimplemented).
const EXPECTED_FALLBACK_FEEDS: ReadonlySet<GtfsFeedId> = new Set([
    GtfsFeedId.PMDP,
    GtfsFeedId.USTI,
]);

const EXPECTED_DEDICATED_FEEDS: ReadonlySet<GtfsFeedId> = new Set([
    GtfsFeedId.PID,
    GtfsFeedId.BRNO,
    GtfsFeedId.BRATISLAVA,
    GtfsFeedId.BARCELONA,
    GtfsFeedId.LIBEREC,
    GtfsFeedId.LEO,
    GtfsFeedId.ZSR,
]);

test("classifyRoute handles every GtfsFeedId value without throwing", () => {
    for (const feedId of ALL_FEED_IDS) {
        const result = classifyRoute({
            feedId,
            routeShortName: "10",
            routeType: "3",
        });

        assert.equal(
            typeof result,
            "object",
            `classifyRoute must return an object for feed ${feedId}`,
        );
        assert.ok(
            result !== null,
            `classifyRoute returned null for feed ${feedId}`,
        );
        assert.equal(typeof result.isSubstitute, "boolean");
    }
});

test("every GtfsFeedId is categorized as either dedicated or intentional fallback", () => {
    const partitioned = new Set<GtfsFeedId>([
        ...EXPECTED_DEDICATED_FEEDS,
        ...EXPECTED_FALLBACK_FEEDS,
    ]);
    const missing = ALL_FEED_IDS.filter((feedId) => !partitioned.has(feedId));

    assert.deepEqual(
        missing,
        [],
        "A new GtfsFeedId was added without updating this test. Either add a dedicated classifier branch in route-classification.ts and move it to EXPECTED_DEDICATED_FEEDS, or confirm the GTFS-typed fallback is intentional and add it to EXPECTED_FALLBACK_FEEDS.",
    );
});

test("dedicated feeds resolve a non-null vehicleType for a numeric bus route", () => {
    // Route name "100" + routeType "3" (bus) is a common fixture; every
    // dedicated classifier must be able to classify it concretely rather than
    // returning the wholly-null fallback.
    for (const feedId of EXPECTED_DEDICATED_FEEDS) {
        const result = classifyRoute({
            feedId,
            routeShortName: "100",
            routeType: "3",
        });

        assert.notEqual(
            result.vehicleType,
            null,
            `dedicated classifier for ${feedId} must return a concrete vehicleType for a numeric bus route`,
        );
    }
});

test("fallback feeds still honour the GTFS route_type for vehicleType", () => {
    // The fallback branch should at minimum propagate the GTFS vehicleType,
    // which is the whole reason it exists.
    for (const feedId of EXPECTED_FALLBACK_FEEDS) {
        const tram = classifyRoute({
            feedId,
            routeShortName: "5",
            routeType: "0", // GTFS tram
        });

        assert.equal(
            tram.vehicleType,
            ClassifiedVehicleType.TRAM,
            `fallback classifier for ${feedId} must map GTFS route_type 0 to TRAM`,
        );

        const train = classifyRoute({
            feedId,
            routeShortName: "S1",
            routeType: "2", // GTFS rail
        });

        assert.equal(
            train.vehicleType,
            ClassifiedVehicleType.TRAIN,
            `fallback classifier for ${feedId} must map GTFS route_type 2 to TRAIN`,
        );
    }
});

test("classifyRoute treats leading-X route names as substitutes for every feed", () => {
    for (const feedId of ALL_FEED_IDS) {
        const result = classifyRoute({
            feedId,
            routeShortName: "X22",
            routeType: "3",
        });

        assert.equal(
            result.isSubstitute,
            true,
            `feed ${feedId} must flag X-prefixed route names as substitutes`,
        );
    }
});

// ── getVehicleTypeFromGtfsRouteType ──────────────────────────────────────────

test("getVehicleTypeFromGtfsRouteType maps standard GTFS route types", () => {
    assert.equal(
        getVehicleTypeFromGtfsRouteType("0"),
        ClassifiedVehicleType.TRAM,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("1"),
        ClassifiedVehicleType.SUBWAY,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("2"),
        ClassifiedVehicleType.TRAIN,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("3"),
        ClassifiedVehicleType.BUS,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("4"),
        ClassifiedVehicleType.FERRY,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("7"),
        ClassifiedVehicleType.FUNICULAR,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("11"),
        ClassifiedVehicleType.TROLLEYBUS,
    );
});

test("getVehicleTypeFromGtfsRouteType maps extended GTFS route type ranges", () => {
    assert.equal(
        getVehicleTypeFromGtfsRouteType("100"),
        ClassifiedVehicleType.TRAIN,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("199"),
        ClassifiedVehicleType.TRAIN,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("200"),
        ClassifiedVehicleType.BUS,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("799"),
        ClassifiedVehicleType.BUS,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("900"),
        ClassifiedVehicleType.TRAM,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("999"),
        ClassifiedVehicleType.TRAM,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("1000"),
        ClassifiedVehicleType.FERRY,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("1099"),
        ClassifiedVehicleType.FERRY,
    );
    assert.equal(
        getVehicleTypeFromGtfsRouteType("1400"),
        ClassifiedVehicleType.FUNICULAR,
    );
});

test("getVehicleTypeFromGtfsRouteType returns null for missing or non-numeric input", () => {
    assert.equal(getVehicleTypeFromGtfsRouteType(null), null);
    assert.equal(getVehicleTypeFromGtfsRouteType(undefined), null);
    assert.equal(getVehicleTypeFromGtfsRouteType(""), null);
    assert.equal(getVehicleTypeFromGtfsRouteType("abc"), null);
    assert.equal(getVehicleTypeFromGtfsRouteType("3.5"), null);
});

test("getVehicleTypeFromGtfsRouteType returns null for unrecognised type values", () => {
    assert.equal(getVehicleTypeFromGtfsRouteType("5"), null);
    assert.equal(getVehicleTypeFromGtfsRouteType("800"), null);
    assert.equal(getVehicleTypeFromGtfsRouteType("1100"), null);
    assert.equal(getVehicleTypeFromGtfsRouteType("9999"), null);
});

// ── PID classifier ───────────────────────────────────────────────────────────

test("classifyRoute PID: metro lines A, B, C, D are SUBWAY", () => {
    for (const line of ["A", "B", "C", "D"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.PID,
            routeShortName: line,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.SUBWAY,
            `line ${line}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute PID: LD prefix is FUNICULAR", () => {
    const result = classifyRoute({
        feedId: GtfsFeedId.PID,
        routeShortName: "LD",
    });
    assert.equal(result.vehicleType, ClassifiedVehicleType.FUNICULAR);
});

test("classifyRoute PID: P-prefixed numeric routes are FERRY", () => {
    assert.equal(
        classifyRoute({ feedId: GtfsFeedId.PID, routeShortName: "P1" })
            .vehicleType,
        ClassifiedVehicleType.FERRY,
    );
    assert.equal(
        classifyRoute({ feedId: GtfsFeedId.PID, routeShortName: "P23" })
            .vehicleType,
        ClassifiedVehicleType.FERRY,
    );
});

test("classifyRoute PID: train prefix routes are TRAIN", () => {
    for (const name of ["L1", "S9", "R5", "EX12", "EC3", "RJ10", "OS1"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.PID,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAIN,
            `route ${name}`,
        );
    }
});

test("classifyRoute PID: trolleybus route numbers 52, 58, 59 are TROLLEYBUS", () => {
    for (const num of ["52", "58", "59"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.PID,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TROLLEYBUS,
            `route ${num}`,
        );
    }
});

test("classifyRoute PID: numeric routes under 100 (not trolleybus) are TRAM", () => {
    for (const num of ["1", "22", "50", "89"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.PID,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAM,
            `route ${num}`,
        );
    }
});

test("classifyRoute PID: numeric routes 100+ are BUS", () => {
    for (const num of ["100", "200", "500"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.PID,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${num}`,
        );
    }
});

test("classifyRoute PID: night bus numbers 90-99 and 900-999 set isNight=true", () => {
    for (const num of ["90", "95", "99", "900", "950", "999"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.PID,
            routeShortName: num,
        });
        assert.equal(result.isNight, true, `route ${num} should be night`);
    }
});

test("classifyRoute PID: X-prefixed route sets isSubstitute=true and classifies base name", () => {
    const sub = classifyRoute({ feedId: GtfsFeedId.PID, routeShortName: "XA" });
    assert.equal(sub.vehicleType, ClassifiedVehicleType.SUBWAY);
    assert.equal(sub.isSubstitute, true);

    const subTram = classifyRoute({
        feedId: GtfsFeedId.PID,
        routeShortName: "X22",
    });
    assert.equal(subTram.vehicleType, ClassifiedVehicleType.TRAM);
    assert.equal(subTram.isSubstitute, true);
});

// ── Brno classifier ──────────────────────────────────────────────────────────

test("classifyRoute Brno: routes 1-12 are TRAM", () => {
    for (const num of ["1", "6", "12"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRNO,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAM,
            `route ${num}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute Brno: routes 25-40 are TROLLEYBUS", () => {
    for (const num of ["25", "32", "40"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRNO,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TROLLEYBUS,
            `route ${num}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute Brno: other numeric routes are BUS", () => {
    for (const num of ["50", "80", "200"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRNO,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${num}`,
        );
    }
});

test("classifyRoute Brno: night buses (N89, N9x) set isNight=true", () => {
    for (const name of ["N89", "N91", "N95", "N99"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRNO,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${name}`,
        );
        assert.equal(result.isNight, true, `route ${name} should be night`);
    }
});

test("classifyRoute Brno: S- and R-prefixed routes are TRAIN", () => {
    for (const name of ["S1", "S2", "R1"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRNO,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAIN,
            `route ${name}`,
        );
        assert.equal(result.isNight, false);
    }
});

// ── Bratislava classifier ────────────────────────────────────────────────────

test("classifyRoute Bratislava: routes 1-9 are TRAM", () => {
    for (const num of ["1", "5", "9"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRATISLAVA,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAM,
            `route ${num}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute Bratislava: routes 20-212 are BUS (or GTFS type if provided)", () => {
    const result = classifyRoute({
        feedId: GtfsFeedId.BRATISLAVA,
        routeShortName: "50",
        routeType: "3",
    });
    assert.equal(result.vehicleType, ClassifiedVehicleType.BUS);
    assert.equal(result.isNight, false);
});

test("classifyRoute Bratislava: N21-N99 routes set isNight=true with BUS type", () => {
    for (const name of ["N21", "N50", "N99"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BRATISLAVA,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${name}`,
        );
        assert.equal(result.isNight, true, `route ${name} should be night`);
    }
});

// ── Barcelona classifier ─────────────────────────────────────────────────────

test("classifyRoute Barcelona: N-prefixed routes are night BUS", () => {
    for (const name of ["N1", "N12", "N99"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BARCELONA,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${name}`,
        );
        assert.equal(result.isNight, true, `route ${name} should be night`);
    }
});

test("classifyRoute Barcelona: L-prefixed routes are SUBWAY", () => {
    for (const name of ["L1", "L3", "L10"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BARCELONA,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.SUBWAY,
            `route ${name}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute Barcelona: T-prefixed routes are TRAM", () => {
    for (const name of ["T1", "T4", "T6"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BARCELONA,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAM,
            `route ${name}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute Barcelona: numeric and V/H-prefixed routes are BUS", () => {
    for (const name of ["10", "200", "V1", "H10"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.BARCELONA,
            routeShortName: name,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${name}`,
        );
    }
});

// ── Liberec classifier ───────────────────────────────────────────────────────

test("classifyRoute Liberec: known tram numbers 2, 3, 5, 11 are TRAM", () => {
    for (const num of ["2", "3", "5", "11"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.LIBEREC,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAM,
            `route ${num}`,
        );
        assert.equal(result.isNight, false);
    }
});

test("classifyRoute Liberec: routes 91-94 are night BUS", () => {
    for (const num of ["91", "92", "93", "94"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.LIBEREC,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${num}`,
        );
        assert.equal(result.isNight, true, `route ${num} should be night`);
    }
});

test("classifyRoute Liberec: other numeric routes are BUS", () => {
    for (const num of ["10", "20", "50", "100"]) {
        const result = classifyRoute({
            feedId: GtfsFeedId.LIBEREC,
            routeShortName: num,
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.BUS,
            `route ${num}`,
        );
        assert.equal(result.isNight, false);
    }
});

// ── LEO and ZSR classifiers ──────────────────────────────────────────────────

test("classifyRoute LEO and ZSR always return TRAIN with isNight=false", () => {
    for (const feedId of [GtfsFeedId.LEO, GtfsFeedId.ZSR]) {
        const result = classifyRoute({
            feedId,
            routeShortName: "EC123",
            routeType: "2",
        });
        assert.equal(
            result.vehicleType,
            ClassifiedVehicleType.TRAIN,
            `feed ${feedId}`,
        );
        assert.equal(result.isNight, false, `feed ${feedId}`);
    }
});
