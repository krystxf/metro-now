// metro-now
// https://github.com/krystxf/metro-now

import Foundation

private let iso8601Formatter: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return formatter
}()

private let iso8601FormatterNoFraction: ISO8601DateFormatter = {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime]
    return formatter
}()

private func parseISO8601(_ string: String) -> Date? {
    iso8601Formatter.date(from: string)
        ?? iso8601FormatterNoFraction.date(from: string)
}

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
        let predicted = parseISO8601(dep.departureTime.predicted),
        let scheduled = parseISO8601(dep.departureTime.scheduled)
    else {
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
                isMetro: platform.isMetro,
                routes: platform.routes.map { route in
                    ApiRoute(
                        id: route.id,
                        name: route.name ?? route.id
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
        type: route.vehicleType.rawValue,
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
                        code: platform.code
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
