import assert from "node:assert/strict";
import test from "node:test";

import { GtfsFeedId } from "../index";
import {
    DEFAULT_STOP_FEED,
    STOP_ID_PREFIX_TO_FEED,
    resolveFeedFromStopId,
} from "../stop-feed-prefix";

test("resolveFeedFromStopId maps each documented prefix to the correct feed", () => {
    for (const { prefix, feed } of STOP_ID_PREFIX_TO_FEED) {
        assert.equal(
            resolveFeedFromStopId(`${prefix}123`),
            feed,
            `stop id with prefix '${prefix}' should resolve to ${feed}`,
        );
    }
});

test("resolveFeedFromStopId defaults unknown prefixes to PID (migration 0014 ELSE branch)", () => {
    assert.equal(resolveFeedFromStopId("U1072"), GtfsFeedId.PID);
    assert.equal(resolveFeedFromStopId("L100"), GtfsFeedId.PID);
    assert.equal(resolveFeedFromStopId(""), GtfsFeedId.PID);
    assert.equal(DEFAULT_STOP_FEED, GtfsFeedId.PID);
});

test("resolveFeedFromStopId is case-sensitive (matches SQL LIKE without ILIKE)", () => {
    assert.equal(resolveFeedFromStopId("brs:1"), GtfsFeedId.PID);
    assert.equal(resolveFeedFromStopId("BRS:1"), GtfsFeedId.BRNO);
});

test("STOP_ID_PREFIX_TO_FEED covers every non-PID non-BARCELONA feed", () => {
    // BARCELONA was added in migration 0017 (after 0014) and has no historical
    // stops to backfill, so it is intentionally absent from the mapping.
    const expectedFeedsInBackfill = new Set<GtfsFeedId>([
        GtfsFeedId.BRNO,
        GtfsFeedId.BRATISLAVA,
        GtfsFeedId.LIBEREC,
        GtfsFeedId.PMDP,
        GtfsFeedId.LEO,
        GtfsFeedId.USTI,
        GtfsFeedId.ZSR,
    ]);

    const mappedFeeds = new Set(STOP_ID_PREFIX_TO_FEED.map(({ feed }) => feed));

    assert.deepEqual(mappedFeeds, expectedFeedsInBackfill);
});
