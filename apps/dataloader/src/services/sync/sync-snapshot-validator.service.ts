import type { SyncSnapshot } from "../../types/sync.types";

export class SyncSnapshotValidator {
    validate(snapshot: SyncSnapshot): void {
        this.assertNotEmpty("stops", snapshot.stops);
        this.assertNotEmpty("platforms", snapshot.platforms);
        this.assertNotEmpty("routes", snapshot.routes);
        this.assertNotEmpty("platformRoutes", snapshot.platformRoutes);
        this.assertNotEmpty("gtfsRoutes", snapshot.gtfsRoutes);
        this.assertNotEmpty("gtfsRouteStops", snapshot.gtfsRouteStops);
        this.assertNotEmpty("gtfsRouteShapes", snapshot.gtfsRouteShapes);

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
        this.assertUniqueKeys(
            "gtfsRouteShapes",
            snapshot.gtfsRouteShapes.map((routeShape) =>
                [
                    routeShape.routeId,
                    routeShape.directionId,
                    routeShape.shapeId,
                ].join("::"),
            ),
        );
        this.assertUniqueKeys(
            "gtfsStationEntrances",
            snapshot.gtfsStationEntrances.map((entrance) => entrance.id),
        );
        this.assertUniqueKeys(
            "gtfsTrips",
            snapshot.gtfsTrips.map((trip) => trip.id),
        );
        this.assertUniqueKeys(
            "gtfsStopTimes",
            snapshot.gtfsStopTimes.map((stopTime) => stopTime.id),
        );
        this.assertUniqueKeys(
            "gtfsCalendars",
            snapshot.gtfsCalendars.map((calendar) => calendar.id),
        );
        this.assertUniqueKeys(
            "gtfsCalendarDates",
            snapshot.gtfsCalendarDates.map((calendarDate) => calendarDate.id),
        );
        this.assertUniqueKeys(
            "gtfsTransfers",
            snapshot.gtfsTransfers.map((transfer) => transfer.id),
        );
        this.assertUniqueKeys(
            "gtfsFrequencies",
            snapshot.gtfsFrequencies.map((frequency) => frequency.id),
        );

        const stopIds = new Set(snapshot.stops.map((stop) => stop.id));
        const platformIds = new Set(
            snapshot.platforms.map((platform) => platform.id),
        );
        const routeIds = new Set(snapshot.routes.map((route) => route.id));
        const gtfsRouteIds = new Set(
            snapshot.gtfsRoutes.map((route) => route.id),
        );
        const gtfsTripIds = new Set(snapshot.gtfsTrips.map((trip) => trip.id));

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

        for (const entrance of snapshot.gtfsStationEntrances) {
            if (!stopIds.has(entrance.stopId)) {
                throw new Error(
                    `GTFS station entrance references missing stop '${entrance.stopId}'`,
                );
            }

            if (
                !Number.isFinite(entrance.latitude) ||
                entrance.latitude < -90 ||
                entrance.latitude > 90
            ) {
                throw new Error(
                    `GTFS station entrance has invalid latitude '${entrance.latitude}'`,
                );
            }

            if (
                !Number.isFinite(entrance.longitude) ||
                entrance.longitude < -180 ||
                entrance.longitude > 180
            ) {
                throw new Error(
                    `GTFS station entrance has invalid longitude '${entrance.longitude}'`,
                );
            }
        }

        for (const trip of snapshot.gtfsTrips) {
            if (!gtfsRouteIds.has(trip.routeId)) {
                throw new Error(
                    `GTFS trip references missing route '${trip.routeId}'`,
                );
            }
        }

        for (const stopTime of snapshot.gtfsStopTimes) {
            if (!gtfsTripIds.has(`${stopTime.feedId}::${stopTime.tripId}`)) {
                throw new Error(
                    `GTFS stop time references missing trip '${stopTime.tripId}' in feed '${stopTime.feedId}'`,
                );
            }

            if (stopTime.stopSequence < 0) {
                throw new Error(
                    `GTFS stop time has invalid stop sequence '${stopTime.stopSequence}'`,
                );
            }
        }

        for (const calendarDate of snapshot.gtfsCalendarDates) {
            if (calendarDate.exceptionType < 1) {
                throw new Error(
                    `GTFS calendar date has invalid exception type '${calendarDate.exceptionType}'`,
                );
            }
        }

        const routeDirectionKeys = new Set<string>();
        const primaryRouteShapeCountByRouteDirection = new Map<
            string,
            number
        >();

        for (const routeShape of snapshot.gtfsRouteShapes) {
            const routeDirectionKey = [
                routeShape.routeId,
                routeShape.directionId,
            ].join("::");

            routeDirectionKeys.add(routeDirectionKey);

            if (!gtfsRouteIds.has(routeShape.routeId)) {
                throw new Error(
                    `GTFS route shape references missing route '${routeShape.routeId}'`,
                );
            }

            if (routeShape.tripCount < 1) {
                throw new Error(
                    `GTFS route shape has invalid trip count '${routeShape.tripCount}'`,
                );
            }

            if (routeShape.geoJson.type !== "LineString") {
                throw new Error(
                    `GTFS route shape has invalid GeoJSON type '${routeShape.geoJson.type}'`,
                );
            }

            if (routeShape.geoJson.coordinates.length < 2) {
                throw new Error(
                    `GTFS route shape has insufficient coordinates for shape '${routeShape.shapeId}'`,
                );
            }

            for (const [longitude, latitude] of routeShape.geoJson
                .coordinates) {
                if (
                    !Number.isFinite(latitude) ||
                    latitude < -90 ||
                    latitude > 90
                ) {
                    throw new Error(
                        `GTFS route shape has invalid latitude '${latitude}'`,
                    );
                }

                if (
                    !Number.isFinite(longitude) ||
                    longitude < -180 ||
                    longitude > 180
                ) {
                    throw new Error(
                        `GTFS route shape has invalid longitude '${longitude}'`,
                    );
                }
            }

            if (!routeShape.isPrimary) {
                continue;
            }

            const nextPrimaryCount =
                (primaryRouteShapeCountByRouteDirection.get(
                    routeDirectionKey,
                ) ?? 0) + 1;

            primaryRouteShapeCountByRouteDirection.set(
                routeDirectionKey,
                nextPrimaryCount,
            );

            if (nextPrimaryCount > 1) {
                throw new Error(
                    `GTFS route shapes contain multiple primary shapes for '${routeDirectionKey}'`,
                );
            }
        }

        for (const routeDirectionKey of routeDirectionKeys) {
            if (
                primaryRouteShapeCountByRouteDirection.get(
                    routeDirectionKey,
                ) === 1
            ) {
                continue;
            }

            throw new Error(
                `GTFS route shapes missing primary shape for '${routeDirectionKey}'`,
            );
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
