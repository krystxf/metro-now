import { GtfsFeedId } from "@metro-now/database";

import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

export type BratislavaSnapshot = SyncSnapshot;

export class BratislavaImportService {
    getBratislavaSnapshot(): Promise<BratislavaSnapshot> {
        return importGtfsZipCity({
            feedId: GtfsFeedId.BRATISLAVA,
            cityName: "Bratislava",
            archiveUrl:
                "https://www.arcgis.com/sharing/rest/content/items/aba12fd2cbac4843bc7406151bc66106/data",
            stopPrefix: "BTS:",
            platformPrefix: "BTP:",
            routePrefix: "BTR:",
        });
    }
}
