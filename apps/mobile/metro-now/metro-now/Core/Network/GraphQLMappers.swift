// metro-now
// https://github.com/krystxf/metro-now

import Foundation

private func parseRouteShapeGeoJson(_ string: String) -> ApiGeoJsonLineString {
    guard let data = string.data(using: .utf8),
          let parsed = try? JSONDecoder().decode(ApiGeoJsonLineString.self, from: data)
    else {
        return ApiGeoJsonLineString(type: "LineString", coordinates: [])
    }
    return parsed
}

func mapGraphQLDeparture(
    _ dep: MetroNowAPI.DeparturesQuery.Data.Departure
) -> ApiDeparture? {
    guard
        let predicted = parseBackendISO8601(dep.departureTime.predicted),
        let scheduled = parseBackendISO8601(dep.departureTime.scheduled)
    else {
        let idDescription = dep.id ?? "?"
        print("[GraphQL] departure date parse failed id=\(idDescription) predicted=\(dep.departureTime.predicted) scheduled=\(dep.departureTime.scheduled)")
        return nil
    }

    return ApiDeparture(
        id: dep.id,
        platformId: dep.platform.id,
        platformCode: dep.platformCode,
        headsign: dep.headsign ?? "",
        departure: ApiDepartureDate(
            predicted: predicted,
            scheduled: scheduled
        ),
        delay: dep.delay ?? 0,
        route: dep.route?.name ?? "",
        routeId: dep.route?.id,
        routeColor: dep.route?.color,
        routeFeed: dep.route?.feed.value?.rawValue,
        routeVehicleType: dep.route?.vehicleType.value?.rawValue,
        routeIsNight: dep.route?.isNight,
        isRealtime: dep.isRealtime
    )
}

func mapGraphQLClosestStop(
    _ stop: MetroNowAPI.ClosestStopsQuery.Data.ClosestStop
) -> ApiStop {
    ApiStop(
        id: stop.id,
        name: stop.name,
        avgLatitude: stop.avgLatitude,
        avgLongitude: stop.avgLongitude,
        entrances: stop.entrances.map { entrance in
            ApiStopEntrance(
                id: entrance.id,
                name: entrance.name,
                latitude: entrance.latitude,
                longitude: entrance.longitude
            )
        },
        platforms: stop.platforms.map { platform in
            ApiPlatform(
                id: platform.id,
                latitude: platform.latitude,
                longitude: platform.longitude,
                name: platform.name,
                code: platform.code,
                direction: platform.direction,
                isMetro: platform.isMetro,
                routes: platform.routes.map { route in
                    ApiRoute(
                        id: route.id,
                        name: route.name ?? route.id,
                        color: route.color,
                        feed: route.feed.value?.rawValue,
                        vehicleType: route.vehicleType.value?.rawValue,
                        isNight: route.isNight
                    )
                }
            )
        }
    )
}

func mapGraphQLClosestStopDetail(
    _ stop: MetroNowAPI.ClosestStopsDetailsQuery.Data.Stop
) -> ApiStop {
    ApiStop(
        id: stop.id,
        name: stop.name,
        avgLatitude: stop.avgLatitude,
        avgLongitude: stop.avgLongitude,
        entrances: [],
        platforms: stop.platforms.map { platform in
            ApiPlatform(
                id: platform.id,
                latitude: platform.latitude,
                longitude: platform.longitude,
                name: platform.name,
                code: platform.code,
                direction: platform.direction,
                isMetro: platform.isMetro,
                routes: platform.routes.map { route in
                    ApiRoute(
                        id: route.id,
                        name: route.name ?? route.id,
                        color: route.color,
                        feed: route.feed.value?.rawValue,
                        vehicleType: route.vehicleType.value?.rawValue,
                        isNight: route.isNight
                    )
                }
            )
        }
    )
}

func mapGraphQLRouteDetail(
    _ route: MetroNowAPI.RouteDetailQuery.Data.Route
) -> ApiRouteDetail {
    ApiRouteDetail(
        id: route.id,
        name: route.name ?? "",
        shortName: route.name ?? "",
        longName: nil,
        isNight: route.isNight,
        color: route.color,
        url: nil,
        vehicleType: route.vehicleType.rawValue,
        directions: route.directions.map { direction in
            ApiRouteDirection(
                id: direction.id,
                platforms: direction.platforms.map { platform in
                    ApiRoutePlatform(
                        id: platform.id,
                        latitude: platform.latitude,
                        longitude: platform.longitude,
                        name: platform.name,
                        isMetro: platform.isMetro,
                        code: platform.code,
                        direction: platform.direction
                    )
                }
            )
        },
        shapes: route.shapes.map { shape in
            ApiRouteShape(
                id: shape.id,
                directionId: shape.directionId,
                tripCount: shape.tripCount,
                geoJson: parseRouteShapeGeoJson(shape.geoJson),
                points: []
            )
        }
    )
}
