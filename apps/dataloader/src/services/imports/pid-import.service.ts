import { GtfsFeedId, VehicleType } from "@metro-now/database";

import {
    type PidStopsSchema,
    pidStopsSchema,
} from "../../schema/pid-stops.schema";
import type { StopSnapshot, SyncedGtfsRoute } from "../../types/sync.types";
import { fetchWithTimeout } from "../../utils/fetch.utils";
import { classifyImportedRoute } from "./route-classification.utils";

const PID_STOPS_URL = "https://data.pid.cz/stops/json/stops.json";

export type PidSnapshot = StopSnapshot & {
    gtfsRoutes: SyncedGtfsRoute[];
};

const PID_LINE_TYPE_TO_GTFS_ROUTE_TYPE: Record<string, string> = {
    tram: "0",
    metro: "1",
    train: "2",
    bus: "3",
    ferry: "4",
    funicular: "7",
    trolleybus: "11",
};

const toGtfsRouteType = (pidLineType: string): string =>
    PID_LINE_TYPE_TO_GTFS_ROUTE_TYPE[pidLineType.toLowerCase()] ?? "";

const resolveStopGroupName = (
    stopGroup: PidStopsSchema["stopGroups"][number],
): string => {
    const metroPlatformNames = Array.from(
        new Set(
            stopGroup.stops
                .filter((platform) => platform.isMetro === true)
                .map((platform) => platform.altIdosName.trim())
                .filter((name) => name.length > 0),
        ),
    );

    return metroPlatformNames.length === 1
        ? metroPlatformNames[0]
        : stopGroup.name;
};

export class PidImportService {
    async getStopSnapshot(): Promise<PidSnapshot> {
        return this.buildStopSnapshot(await this.getStops());
    }

    async getStops(): Promise<PidStopsSchema> {
        const response = await fetchWithTimeout(PID_STOPS_URL, {
            method: "GET",
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch stops data: ${response.status} ${response.statusText}`,
            );
        }

        const parsed = pidStopsSchema.safeParse(await response.json());

        if (!parsed.success) {
            throw new Error(
                `Couldn't parse data from '${PID_STOPS_URL}': ${parsed.error.message}`,
            );
        }

        return parsed.data;
    }

    buildStopSnapshot(stopsData: PidStopsSchema): PidSnapshot {
        const stops = new Map<
            string,
            {
                id: string;
                feed: GtfsFeedId;
                name: string;
                avgLatitude: number;
                avgLongitude: number;
            }
        >();
        for (const stopGroup of stopsData.stopGroups) {
            stops.set(`U${stopGroup.node}`, {
                id: `U${stopGroup.node}`,
                feed: GtfsFeedId.PID,
                name: resolveStopGroupName(stopGroup),
                avgLatitude: stopGroup.avgLat,
                avgLongitude: stopGroup.avgLon,
            });
        }

        const validStopIds = new Set(stops.keys());
        const platforms = new Map<
            string,
            {
                id: string;
                name: string;
                code: string | null;
                isMetro: boolean;
                latitude: number;
                longitude: number;
                stopId: string | null;
            }
        >();
        const gtfsRoutes = new Map<string, SyncedGtfsRoute>();
        const platformRoutes = new Map<
            string,
            {
                platformId: string;
                feedId: GtfsFeedId;
                routeId: string;
            }
        >();

        for (const stopGroup of stopsData.stopGroups) {
            for (const platform of stopGroup.stops) {
                const platformId = platform.gtfsIds[0]?.trim();
                const platformName = platform.altIdosName?.trim();

                if (!platformId || !platformName) {
                    continue;
                }

                platforms.set(platformId, {
                    id: platformId,
                    name: platformName,
                    code: platform.platform ?? null,
                    isMetro: platform.isMetro === true,
                    latitude: platform.lat,
                    longitude: platform.lon,
                    stopId: this.resolveStopId(platformId, validStopIds),
                });

                for (const line of platform.lines) {
                    const routeId = String(line.id).trim();
                    const routeName = line.name.trim();

                    if (!routeId || !routeName) {
                        continue;
                    }

                    const gtfsRouteType = toGtfsRouteType(line.type);
                    const classification = classifyImportedRoute({
                        feedId: GtfsFeedId.PID,
                        routeShortName: routeName,
                        routeType: gtfsRouteType,
                    });
                    const vehicleType =
                        classification.vehicleType ??
                        VehicleType[
                            line.type.toUpperCase() as keyof typeof VehicleType
                        ] ??
                        null;

                    gtfsRoutes.set(routeId, {
                        id: routeId,
                        feedId: GtfsFeedId.PID,
                        shortName: routeName,
                        longName: null,
                        type: gtfsRouteType,
                        vehicleType,
                        color: null,
                        isNight: classification.isNight,
                        url: null,
                    });
                    platformRoutes.set(`${platformId}::${routeId}`, {
                        platformId,
                        feedId: GtfsFeedId.PID,
                        routeId,
                    });
                }
            }
        }

        return {
            stops: Array.from(stops.values()),
            platforms: Array.from(platforms.values()),
            platformRoutes: Array.from(platformRoutes.values()),
            gtfsRoutes: Array.from(gtfsRoutes.values()),
        };
    }

    private resolveStopId(
        platformId: string,
        validStopIds: Set<string>,
    ): string | null {
        const normalizedPlatformId = platformId.split("_")[0];
        const candidateStopId = normalizedPlatformId.split("Z")[0];

        if (validStopIds.has(candidateStopId)) {
            return candidateStopId;
        }

        return null;
    }
}
