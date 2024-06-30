import { PlatformID } from "src/data/platforms";
import { diff, group } from "radash";
import { getDepartures } from "../metro/getDepartures";
import type { CacheManager } from "src/types/types";
import { TTL } from "../constants";

export const GOLEMIO_ENDPOINT = new URL(
    "/v2/pid/departureboards",
    "https://api.golemio.cz",
);

export const getGolemioHeaders = () => {
    return new Headers({
        "Content-Type": "application/json",
        "X-Access-Token": process.env.GOLEMIO_API_KEY,
    });
};

export const fetchDeparturesByGtfsID = async <TCachedData>(
    cacheManager: CacheManager<TCachedData>,
    gtfsIDs: PlatformID[],
): Promise<{
    [key: string]: TCachedData;
}> => {
    const res: Record<string, TCachedData> = {};
    const cachedGtfsIDs: PlatformID[] = [];

    for (const gtfsID of gtfsIDs) {
        const cached = await cacheManager.get(gtfsID);
        if (!cached) continue;

        cachedGtfsIDs.push(gtfsID);
        res[gtfsID] = cached;
    }

    const newRes = await getDepartures(diff(gtfsIDs, cachedGtfsIDs));
    const newResByPlatform = group(
        newRes,
        (departure) => departure.platform,
    ) as Record<string, TCachedData>;

    for (const key in newResByPlatform) {
        await cacheManager.set(key, newResByPlatform[key], TTL);
    }

    return { ...res, ...newResByPlatform };
};
