import { GtfsFeedId } from "@metro-now/database";

import { getDataloaderEnv } from "../../config/env";
import type { SyncSnapshot } from "../../types/sync.types";
import { importGtfsZipCity } from "./gtfs-zip-city-import";

// TMB (Transports Metropolitans de Barcelona) static GTFS. Requires
// TMB_APP_ID and TMB_APP_KEY — register at https://developer.tmb.cat.
const TMB_GTFS_ARCHIVE_BASE_URL =
    "https://api.tmb.cat/v1/static/datasets/gtfs.zip";

const buildTmbGtfsUrl = (appId: string, appKey: string): string => {
    const url = new URL(TMB_GTFS_ARCHIVE_BASE_URL);
    url.searchParams.set("app_id", appId);
    url.searchParams.set("app_key", appKey);
    return url.toString();
};

export type TmbSnapshot = SyncSnapshot;

export class TmbImportService {
    getTmbSnapshot(): Promise<TmbSnapshot> {
        const { tmbAppId, tmbAppKey } = getDataloaderEnv();

        if (!tmbAppId || !tmbAppKey) {
            throw new Error(
                "TMB GTFS skipped: TMB_APP_ID and TMB_APP_KEY must be set",
            );
        }

        return importGtfsZipCity({
            feedId: GtfsFeedId.BARCELONA,
            cityName: "TMB",
            archiveUrl: buildTmbGtfsUrl(tmbAppId, tmbAppKey),
            stopPrefix: "TMBS:",
            platformPrefix: "TMBP:",
            routePrefix: "TMBR:",
        });
    }
}
