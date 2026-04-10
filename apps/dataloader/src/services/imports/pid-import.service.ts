import { VehicleType } from "@metro-now/database";

import {
    type PidStopsSchema,
    pidStopsSchema,
} from "src/schema/pid-stops.schema";
import type { StopSnapshot, SyncedRoute } from "src/types/sync.types";
import { fetchWithTimeout } from "src/utils/fetch.utils";

const PID_STOPS_URL = "https://data.pid.cz/stops/json/stops.json";

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
    async getStopSnapshot(): Promise<StopSnapshot> {
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

    buildStopSnapshot(stopsData: PidStopsSchema): StopSnapshot {
        const stops = new Map<
            string,
            {
                id: string;
                name: string;
                avgLatitude: number;
                avgLongitude: number;
            }
        >();
        for (const stopGroup of stopsData.stopGroups) {
            stops.set(`U${stopGroup.node}`, {
                id: `U${stopGroup.node}`,
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
        const routes = new Map<string, SyncedRoute>();
        const platformRoutes = new Map<
            string,
            {
                platformId: string;
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

                    routes.set(routeId, {
                        id: routeId,
                        name: routeName,
                        vehicleType:
                            VehicleType[
                                line.type.toUpperCase() as keyof typeof VehicleType
                            ] ?? null,
                        isNight: null,
                    });
                    platformRoutes.set(`${platformId}::${routeId}`, {
                        platformId,
                        routeId,
                    });
                }
            }
        }

        return {
            stops: Array.from(stops.values()),
            platforms: Array.from(platforms.values()),
            routes: Array.from(routes.values()),
            platformRoutes: Array.from(platformRoutes.values()),
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
