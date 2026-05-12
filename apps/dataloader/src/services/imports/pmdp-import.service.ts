import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

export type PmdpSnapshot = SyncSnapshot;

export class PmdpImportService {
    getPmdpSnapshot(): Promise<PmdpSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.PMDP,
            cityName: "PMDP",
            archiveUrl: "https://jizdnirady.pmdp.cz/jr/gtfs",
            stopPrefix: "PMS:",
            platformPrefix: "PMP:",
            routePrefix: "PMR:",
        });
    }
}
