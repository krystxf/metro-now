import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

export type UstiSnapshot = SyncSnapshot;

export class UstiImportService {
    getUstiSnapshot(): Promise<UstiSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.USTI,
            cityName: "Usti",
            archiveUrl:
                "https://tabule.portabo.cz/api/v1-tabule/cis/GetGtfs/gtfs_google_all",
            stopPrefix: "USS:",
            platformPrefix: "USP:",
            routePrefix: "USR:",
        });
    }
}
