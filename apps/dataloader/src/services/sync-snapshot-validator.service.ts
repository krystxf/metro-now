import type { SyncSnapshot } from "../types/sync.types";

export class SyncSnapshotValidator {
    validate(snapshot: SyncSnapshot): void {
        this.assertNotEmpty("stops", snapshot.stops);
        this.assertNotEmpty("platforms", snapshot.platforms);
        this.assertNotEmpty("routes", snapshot.routes);
        this.assertNotEmpty("platformRoutes", snapshot.platformRoutes);
        this.assertNotEmpty("gtfsRoutes", snapshot.gtfsRoutes);
        this.assertNotEmpty("gtfsRouteStops", snapshot.gtfsRouteStops);

        this.assertUniqueKeys(
            "stops",
            snapshot.stops.map((stop) => stop.id),
        );
        this.assertUniqueKeys(
            "platforms",
            snapshot.platforms.map((platform) => platform.id),
        );
        this.assertUniqueKeys(
            "routes",
            snapshot.routes.map((route) => route.id),
        );
        this.assertUniqueKeys(
            "platformRoutes",
            snapshot.platformRoutes.map(
                (relation) => `${relation.platformId}::${relation.routeId}`,
            ),
        );
        this.assertUniqueKeys(
            "gtfsRoutes",
            snapshot.gtfsRoutes.map((route) => route.id),
        );
        this.assertUniqueKeys(
            "gtfsRouteStops",
            snapshot.gtfsRouteStops.map((routeStop) =>
                [
                    routeStop.routeId,
                    routeStop.directionId,
                    routeStop.platformId,
                    routeStop.stopSequence,
                ].join("::"),
            ),
        );

        const stopIds = new Set(snapshot.stops.map((stop) => stop.id));
        const platformIds = new Set(
            snapshot.platforms.map((platform) => platform.id),
        );
        const routeIds = new Set(snapshot.routes.map((route) => route.id));
        const gtfsRouteIds = new Set(
            snapshot.gtfsRoutes.map((route) => route.id),
        );

        for (const platform of snapshot.platforms) {
            if (platform.stopId && !stopIds.has(platform.stopId)) {
                throw new Error(
                    `Platform '${platform.id}' references missing stop '${platform.stopId}'`,
                );
            }
        }

        for (const relation of snapshot.platformRoutes) {
            if (!platformIds.has(relation.platformId)) {
                throw new Error(
                    `Platform route references missing platform '${relation.platformId}'`,
                );
            }

            if (!routeIds.has(relation.routeId)) {
                throw new Error(
                    `Platform route references missing route '${relation.routeId}'`,
                );
            }
        }

        for (const routeStop of snapshot.gtfsRouteStops) {
            if (!gtfsRouteIds.has(routeStop.routeId)) {
                throw new Error(
                    `GTFS route stop references missing route '${routeStop.routeId}'`,
                );
            }

            if (!platformIds.has(routeStop.platformId)) {
                throw new Error(
                    `GTFS route stop references missing platform '${routeStop.platformId}'`,
                );
            }

            if (routeStop.stopSequence < 0) {
                throw new Error(
                    `GTFS route stop has invalid stop sequence '${routeStop.stopSequence}'`,
                );
            }
        }
    }

    private assertNotEmpty(name: string, items: unknown[]): void {
        if (items.length === 0) {
            throw new Error(`Refusing to sync empty ${name} dataset`);
        }
    }

    private assertUniqueKeys(name: string, keys: string[]): void {
        const seen = new Set<string>();

        for (const key of keys) {
            if (seen.has(key)) {
                throw new Error(
                    `Duplicate ${name} record detected for '${key}'`,
                );
            }

            seen.add(key);
        }
    }
}
