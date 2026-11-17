import { GtfsFeedId } from "@metro-now/database";

import type { StopSnapshot, SyncSnapshot } from "../../types/sync.types";
import { importPidMatchedGtfsFeed } from "./pid-matched-gtfs-import";

const ZSR_GTFS_ARCHIVE_URL =
    "https://data.slovensko.sk/download?id=adf2c0db-600e-45c9-906c-7e441f78472f";

const LEO_AGENCY_NAMES = new Set([
    "Leo Express s.r.o.",
    "Leo Express Slovensko s.r.o.",
]);

export class ZsrImportService {
    async getZsrSnapshot(
        pidStops: StopSnapshot["stops"],
    ): Promise<SyncSnapshot> {
        return importPidMatchedGtfsFeed(
            {
                url: ZSR_GTFS_ARCHIVE_URL,
                archiveLabel: "ZSR",
                feedId: GtfsFeedId.ZSR,
                stopPrefix: "ZRS:",
                platformPrefix: "ZRP:",
                routePrefix: "ZRR:",
                includeAgency: (name) => !LEO_AGENCY_NAMES.has(name),
            },
            pidStops,
        );
    }
}
