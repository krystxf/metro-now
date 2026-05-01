import type { Platform } from "@metro-now/database";

import { METRO_LINES, TRAIN_PREFIXES } from "src/modules/route/route.const";
import type { StopPlatformRecord } from "src/modules/stop/stop.types";

const normalizeRouteName = (routeName: string): string =>
    routeName.startsWith("X") ? routeName.slice(1) : routeName;

export const isRailRouteName = (routeName: string): boolean => {
    const normalizedRouteName = normalizeRouteName(routeName).toUpperCase();

    return (
        METRO_LINES.includes(normalizedRouteName) ||
        TRAIN_PREFIXES.some((prefix) => normalizedRouteName.startsWith(prefix))
    );
};

const uniquePlatformNames = (
    platforms: readonly Pick<Platform, "name">[],
): string[] =>
    Array.from(
        new Set(
            platforms
                .map((platform) => platform.name.trim())
                .filter((name) => name.length > 0),
        ),
    );

export const resolveMetroOnlyStopName = ({
    stopName,
    platforms,
}: {
    stopName: string;
    platforms: readonly Pick<Platform, "name">[];
}): string => {
    const metroPlatformNames = uniquePlatformNames(platforms);

    return metroPlatformNames.length === 1 ? metroPlatformNames[0] : stopName;
};

export const resolveRailStopName = ({
    stopName,
    platforms,
}: {
    stopName: string;
    platforms: readonly StopPlatformRecord[];
}): string => {
    const metroPlatformNames = uniquePlatformNames(
        platforms.filter((platform) => platform.isMetro),
    );

    if (metroPlatformNames.length === 1) {
        return metroPlatformNames[0];
    }

    const trainPlatformNames = uniquePlatformNames(
        platforms.filter((platform) => !platform.isMetro),
    );

    return trainPlatformNames.length === 1 ? trainPlatformNames[0] : stopName;
};

export const filterRailPlatforms = (
    platforms: readonly StopPlatformRecord[],
): StopPlatformRecord[] =>
    platforms.flatMap((platform) => {
        const railRoutes = platform.routes.filter((route) =>
            isRailRouteName(route.name),
        );

        if (!platform.isMetro && railRoutes.length === 0) {
            return [];
        }

        return [
            {
                ...platform,
                routes: railRoutes,
            },
        ];
    });
