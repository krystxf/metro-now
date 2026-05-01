import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import { ClassifiedVehicleType, classifyRoute } from "../route-classification";

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
