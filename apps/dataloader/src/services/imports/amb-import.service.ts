import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

// AMB (Àrea Metropolitana de Barcelona) static GTFS — metropolitan bus
// network. Public, no authentication required.
export type AmbSnapshot = SyncSnapshot;

export class AmbImportService {
    getAmbSnapshot(): Promise<AmbSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.BARCELONA,
            cityName: "AMB",
            archiveUrl:
                "https://www.ambmobilitat.cat/OpenData/google_transit.zip",
            stopPrefix: "AMBS:",
            platformPrefix: "AMBP:",
            routePrefix: "AMBR:",
        });
    }
}
