import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

export type BrnoSnapshot = SyncSnapshot;

export class BrnoImportService {
    getBrnoSnapshot(): Promise<BrnoSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.BRNO,
            cityName: "Brno",
            archiveUrl: "https://kordis-jmk.cz/gtfs/gtfs.zip",
            stopPrefix: "BRS:",
            platformPrefix: "BRP:",
            routePrefix: "BRR:",
        });
    }
}
