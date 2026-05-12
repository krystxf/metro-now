import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

export type LiberecSnapshot = SyncSnapshot;

export class LiberecImportService {
    getLiberecSnapshot(): Promise<LiberecSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.LIBEREC,
            cityName: "Liberec",
            archiveUrl: "https://www.dpmlj.cz/gtfs.zip",
            stopPrefix: "LBS:",
            platformPrefix: "LBP:",
            routePrefix: "LBR:",
        });
    }
}
