import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

// TRAM Barcelona (Trambaix T1–T3 + Trambesòs T4–T6) static GTFS.
// Public, no authentication required.
export type TramSnapshot = SyncSnapshot;

export class TramImportService {
    getTramSnapshot(): Promise<TramSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.BARCELONA,
            cityName: "TRAM",
            archiveUrl: "https://opendata.tram.cat/GTFS/zip/TBS.zip",
            stopPrefix: "TRMS:",
            platformPrefix: "TRMP:",
            routePrefix: "TRMR:",
        });
    }
}
