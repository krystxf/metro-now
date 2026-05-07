import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

// FGC (Ferrocarrils de la Generalitat de Catalunya) static GTFS — suburban
// and regional rail serving Barcelona and Catalonia. No authentication.
export type FgcSnapshot = SyncSnapshot;

export class FgcImportService {
    getFgcSnapshot(): Promise<FgcSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.BARCELONA,
            cityName: "FGC",
            archiveUrl: "https://www.fgc.cat/google/google_transit.zip",
            stopPrefix: "FGCS:",
            platformPrefix: "FGCP:",
            routePrefix: "FGCR:",
        });
    }
}
