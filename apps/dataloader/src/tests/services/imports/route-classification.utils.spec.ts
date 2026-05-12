import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "@metro-now/database";

import { classifyImportedRoute } from "../../../services/imports/route-classification.utils";

test("classifyImportedRoute prefers GTFS route type over route-name heuristics when available", () => {
    const result = classifyImportedRoute({
        feedId: GtfsFeedId.LIBEREC,
        routeShortName: "11",
        routeType: "11",
    });

    assert.equal(result.vehicleType, "TROLLEYBUS");
});

test("classifyImportedRoute falls back to feed-specific heuristics when GTFS route type is missing", () => {
    const result = classifyImportedRoute({
        feedId: GtfsFeedId.PID,
        routeShortName: "A",
        routeType: null,
    });

    assert.equal(result.vehicleType, "SUBWAY");
});
