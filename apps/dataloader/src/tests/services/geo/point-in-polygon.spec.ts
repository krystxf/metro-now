import assert from "node:assert/strict";
import test from "node:test";

import {
    type PolygonRings,
    type Ring,
    calculateBoundingBox,
    isInsideBoundingBox,
    isInsidePolygon,
    isInsideRing,
} from "../../../services/geo/point-in-polygon";

// Unit square (closed ring: first == last per GeoJSON convention).
const UNIT_SQUARE: Ring = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
];

test("isInsideRing returns true for a point clearly inside the ring", () => {
    assert.equal(isInsideRing(5, 5, UNIT_SQUARE), true);
});

test("isInsideRing returns false for a point clearly outside the ring", () => {
    assert.equal(isInsideRing(20, 20, UNIT_SQUARE), false);
});

test("isInsideRing handles degenerate rings without throwing", () => {
    assert.equal(isInsideRing(0, 0, []), false);
});

test("isInsidePolygon treats the first ring as outer and later rings as holes", () => {
    // Outer 0..10 square with an inner 4..6 hole.
    const hole: Ring = [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
    ];
    const polygon: PolygonRings = [UNIT_SQUARE, hole];

    assert.equal(
        isInsidePolygon(5, 5, polygon),
        false,
        "center point is inside the outer ring but inside the hole — must be excluded",
    );
    assert.equal(
        isInsidePolygon(1, 1, polygon),
        true,
        "point inside the outer ring and outside every hole must be included",
    );
});

test("isInsidePolygon returns false for an empty polygon", () => {
    assert.equal(isInsidePolygon(0, 0, []), false);
});

test("isInsidePolygon returns false when outside the outer ring (holes irrelevant)", () => {
    const hole: Ring = [
        [4, 4],
        [6, 4],
        [6, 6],
        [4, 6],
        [4, 4],
    ];
    const polygon: PolygonRings = [UNIT_SQUARE, hole];

    assert.equal(isInsidePolygon(100, 100, polygon), false);
});

test("isInsidePolygon classifies a real-world Prague point inside a Czech-like bounding polygon", () => {
    // Rough Czech-Republic bounding polygon covering 12..19 lon / 48.5..51.1 lat.
    // Not geographically accurate — just enough to verify coordinate order:
    // isInsidePolygon takes (longitude, latitude), not (latitude, longitude).
    const czechBoundsRing: Ring = [
        [12, 48.5],
        [19, 48.5],
        [19, 51.1],
        [12, 51.1],
        [12, 48.5],
    ];
    const prague: [number, number] = [14.4378, 50.0755];

    assert.equal(
        isInsidePolygon(prague[0], prague[1], [czechBoundsRing]),
        true,
        "Prague (14.44 E, 50.08 N) must fall inside the Czech bounding polygon",
    );
});

test("calculateBoundingBox derives min/max from every ring in every polygon", () => {
    const ringA: Ring = [
        [0, 0],
        [5, 0],
        [5, 5],
        [0, 5],
        [0, 0],
    ];
    const ringB: Ring = [
        [-3, -1],
        [10, -1],
        [10, 20],
        [-3, 20],
        [-3, -1],
    ];

    const bbox = calculateBoundingBox([[ringA], [ringB]]);

    assert.deepEqual(bbox, {
        minLongitude: -3,
        minLatitude: -1,
        maxLongitude: 10,
        maxLatitude: 20,
    });
});

test("calculateBoundingBox of an empty input returns sentinel infinities", () => {
    const bbox = calculateBoundingBox([]);

    // The sentinels document that the caller must not invoke `isInsideBoundingBox`
    // on an empty-polygon country — any point would fail the comparisons below,
    // which is the safe behaviour.
    assert.equal(bbox.minLongitude, Number.POSITIVE_INFINITY);
    assert.equal(bbox.maxLongitude, Number.NEGATIVE_INFINITY);
});

test("isInsideBoundingBox accepts points on the bbox boundary (inclusive)", () => {
    const bbox = {
        minLongitude: 0,
        minLatitude: 0,
        maxLongitude: 10,
        maxLatitude: 10,
    };

    assert.equal(isInsideBoundingBox(0, 0, bbox), true);
    assert.equal(isInsideBoundingBox(10, 10, bbox), true);
    assert.equal(isInsideBoundingBox(5, 5, bbox), true);
});

test("isInsideBoundingBox rejects points strictly outside", () => {
    const bbox = {
        minLongitude: 0,
        minLatitude: 0,
        maxLongitude: 10,
        maxLatitude: 10,
    };

    assert.equal(isInsideBoundingBox(-0.1, 5, bbox), false);
    assert.equal(isInsideBoundingBox(5, 10.1, bbox), false);
});

test("isInsideBoundingBox takes (latitude, longitude) — swapping the order misses valid points", () => {
    // Regression guard: CountryLookupService calls isInsideBoundingBox(lat, lon)
    // but isInsidePolygon(lon, lat). If someone unifies the signatures without
    // updating call sites, this test pins the current contract.
    const bbox = {
        minLongitude: 10,
        minLatitude: 50,
        maxLongitude: 20,
        maxLatitude: 60,
    };

    assert.equal(isInsideBoundingBox(55, 15, bbox), true);
    // Swapped: lat=15 falls outside [50, 60]; lon=55 falls outside [10, 20].
    assert.equal(isInsideBoundingBox(15, 55, bbox), false);
});
