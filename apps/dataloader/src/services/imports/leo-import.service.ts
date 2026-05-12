import { GtfsFeedId } from "@metro-now/database";

import type { StopSnapshot, SyncSnapshot } from "../../types/sync.types";
import { importPidMatchedGtfsFeed } from "./pid-matched-gtfs-import";

const LEO_GTFS_ARCHIVE_URL =
    "https://www.zsr.sk/files/pre-cestujucich/cestovny-poriadok/gtfs/gtfs.zip";

const LEO_AGENCY_NAMES = new Set([
    "Leo Express s.r.o.",
    "Leo Express Slovensko s.r.o.",
]);

export class LeoImportService {
    async getLeoSnapshot(
        pidStops: StopSnapshot["stops"],
    ): Promise<SyncSnapshot> {
        return importPidMatchedGtfsFeed(
            {
                url: LEO_GTFS_ARCHIVE_URL,
                archiveLabel: "Leo",
                feedId: GtfsFeedId.LEO,
                stopPrefix: "TLS:",
                platformPrefix: "TLP:",
                routePrefix: "LTL:",
                includeAgency: (name) => LEO_AGENCY_NAMES.has(name),
                prefixEntranceId: false,
            },
            pidStops,
        );
    }
}
