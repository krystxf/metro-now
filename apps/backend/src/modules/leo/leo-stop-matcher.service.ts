import { Injectable } from "@nestjs/common";

import { normalizeStopName } from "src/modules/leo/leo-gtfs-parsers.utils";
import { LeoGtfsService } from "src/modules/leo/leo-gtfs.service";
import type { LeoStop } from "src/modules/leo/leo.types";

export const distanceInMeters = (
    leftLatitude: number,
    leftLongitude: number,
    rightLatitude: number,
    rightLongitude: number,
): number => {
    const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;
    const earthRadiusMeters = 6_371_000;
    const latitudeDelta = toRadians(rightLatitude - leftLatitude);
    const longitudeDelta = toRadians(rightLongitude - leftLongitude);
    const a =
        Math.sin(latitudeDelta / 2) ** 2 +
        Math.cos(toRadians(leftLatitude)) *
            Math.cos(toRadians(rightLatitude)) *
            Math.sin(longitudeDelta / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return earthRadiusMeters * c;
};

type LocalStopSeed = {
    id: string;
    name: string;
    avgLatitude: number;
    avgLongitude: number;
};

const MAX_MATCH_DISTANCE_METERS = 250;

export const findMatchingLeoStop = (
    localStop: Pick<LocalStopSeed, "name" | "avgLatitude" | "avgLongitude">,
    leoStops: readonly LeoStop[],
): LeoStop | undefined => {
    const normalizedLocalName = normalizeStopName(localStop.name);

    return leoStops
        .filter((leoStop) => leoStop.normalizedName === normalizedLocalName)
        .filter(
            (leoStop) =>
                distanceInMeters(
                    localStop.avgLatitude,
                    localStop.avgLongitude,
                    leoStop.avgLatitude,
                    leoStop.avgLongitude,
                ) <= MAX_MATCH_DISTANCE_METERS,
        )
        .sort(
            (left, right) =>
                distanceInMeters(
                    localStop.avgLatitude,
                    localStop.avgLongitude,
                    left.avgLatitude,
                    left.avgLongitude,
                ) -
                    distanceInMeters(
                        localStop.avgLatitude,
                        localStop.avgLongitude,
                        right.avgLatitude,
                        right.avgLongitude,
                    ) || left.id.localeCompare(right.id),
        )[0];
};

@Injectable()
export class LeoStopMatcherService {
    constructor(private readonly leoGtfsService: LeoGtfsService) {}

    async getMatchedLeoStopByLocalStopId(
        localStops: readonly LocalStopSeed[],
    ): Promise<Map<string, string>> {
        const leoStops = await this.leoGtfsService.getStops();
        const matches = new Map<string, string>();

        for (const localStop of localStops) {
            const matchedLeoStop = findMatchingLeoStop(localStop, leoStops);

            if (matchedLeoStop) {
                matches.set(localStop.id, matchedLeoStop.id);
            }
        }

        return matches;
    }

    async getUnmatchedLeoStopIds(
        localStops: readonly LocalStopSeed[],
    ): Promise<Set<string>> {
        const leoStops = await this.leoGtfsService.getStops();
        const matches = await this.getMatchedLeoStopByLocalStopId(localStops);
        const matchedLeoStopIds = new Set(matches.values());

        return new Set(
            leoStops
                .map((leoStop) => leoStop.id)
                .filter((leoStopId) => !matchedLeoStopIds.has(leoStopId)),
        );
    }
}
