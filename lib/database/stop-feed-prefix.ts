import { GtfsFeedId } from "./index";

// Source of truth for the stop-id prefix → feed backfill used by
// migration 0014_add_stop_feed. The migration runs a literal SQL CASE that
// mirrors this map — `migration-0014.spec.ts` asserts they stay in sync so
// the historical backfill stays correct if the migration is ever edited.
export const STOP_ID_PREFIX_TO_FEED: ReadonlyArray<{
    prefix: string;
    feed: GtfsFeedId;
}> = [
    { prefix: "BRS:", feed: GtfsFeedId.BRNO },
    { prefix: "BTS:", feed: GtfsFeedId.BRATISLAVA },
    { prefix: "LBS:", feed: GtfsFeedId.LIBEREC },
    { prefix: "PMS:", feed: GtfsFeedId.PMDP },
    { prefix: "TLS:", feed: GtfsFeedId.LEO },
    { prefix: "USS:", feed: GtfsFeedId.USTI },
    { prefix: "ZRS:", feed: GtfsFeedId.ZSR },
];

export const DEFAULT_STOP_FEED: GtfsFeedId = GtfsFeedId.PID;

export const resolveFeedFromStopId = (stopId: string): GtfsFeedId => {
    for (const { prefix, feed } of STOP_ID_PREFIX_TO_FEED) {
        if (stopId.startsWith(prefix)) {
            return feed;
        }
    }

    return DEFAULT_STOP_FEED;
};
