// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation

struct ApiStop: Codable, Identifiable {
    let id, name: String
    let avgLatitude, avgLongitude: Double
    let entrances: [ApiStopEntrance]
    let platforms: [ApiPlatform]

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case avgLatitude
        case avgLongitude
        case entrances
        case platforms
    }
}

extension ApiStop {
    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        avgLatitude = try container.decode(Double.self, forKey: .avgLatitude)
        avgLongitude = try container.decode(Double.self, forKey: .avgLongitude)
        entrances = try container.decodeIfPresent([ApiStopEntrance].self, forKey: .entrances) ?? []
        platforms = try container.decode([ApiPlatform].self, forKey: .platforms)
    }

    private var fallbackCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: avgLatitude,
            longitude: avgLongitude
        )
    }

    private var accurateCoordinateCandidates: [CLLocationCoordinate2D] {
        let entranceCoordinates = entrances.map(\.coordinate)

        if !entranceCoordinates.isEmpty {
            return entranceCoordinates
        }

        let metroPlatformCoordinates = platforms
            .filter(\.isMetro)
            .map(\.coordinate)

        if !metroPlatformCoordinates.isEmpty {
            return metroPlatformCoordinates
        }

        return [fallbackCoordinate]
    }

    var preferredCoordinate: CLLocationCoordinate2D {
        Self.coordinateCentroid(for: accurateCoordinateCandidates)
            ?? fallbackCoordinate
    }

    func distance(to location: CLLocation) -> CLLocationDistance {
        accurateCoordinateCandidates
            .map { coordinate in
                location.distance(
                    from: CLLocation(
                        latitude: coordinate.latitude,
                        longitude: coordinate.longitude
                    )
                )
            }
            .min() ?? location.distance(
                from: CLLocation(
                    latitude: fallbackCoordinate.latitude,
                    longitude: fallbackCoordinate.longitude
                )
            )
    }

    private static func coordinateCentroid(
        for coordinates: [CLLocationCoordinate2D]
    ) -> CLLocationCoordinate2D? {
        guard !coordinates.isEmpty else {
            return nil
        }

        let count = Double(coordinates.count)

        return CLLocationCoordinate2D(
            latitude: coordinates.map(\.latitude).reduce(0, +) / count,
            longitude: coordinates.map(\.longitude).reduce(0, +) / count
        )
    }
}

struct ApiStopEntrance: Codable, Identifiable {
    let id: String
    let name: String
    let latitude, longitude: Double
}

struct ApiPlatform: Codable {
    let id: String
    let latitude, longitude: Double
    let name: String
    let code: String?
    let direction: String?
    let isMetro: Bool
    let routes: [ApiRoute]

    init(
        id: String,
        latitude: Double,
        longitude: Double,
        name: String,
        code: String?,
        direction: String? = nil,
        isMetro: Bool,
        routes: [ApiRoute]
    ) {
        self.id = id
        self.latitude = latitude
        self.longitude = longitude
        self.name = name
        self.code = code
        self.direction = direction
        self.isMetro = isMetro
        self.routes = routes
    }
}

struct ApiRoute: Codable {
    let id, name: String
    let color: String?
    let feed: String?
    let vehicleType: String?
    let isNight: Bool?

    init(id: String, name: String, color: String? = nil, feed: String? = nil, vehicleType: String? = nil, isNight: Bool? = nil) {
        self.id = id
        self.name = name
        self.color = color
        self.feed = feed
        self.vehicleType = vehicleType
        self.isNight = isNight
    }
}

extension ApiStopEntrance {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: latitude,
            longitude: longitude
        )
    }
}

extension ApiPlatform {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: latitude,
            longitude: longitude
        )
    }

    func supports(_ departure: ApiDeparture) -> Bool {
        guard id == departure.platformId else {
            return false
        }

        guard !routes.isEmpty else {
            return true
        }

        if let routeId = departure.routeId,
           routes.contains(where: { route in
               route.id == routeId || route.backendRouteId == routeId
           })
        {
            return true
        }

        return routes.contains(where: { route in
            route.name == departure.route
        })
    }
}

extension ApiRoute {
    var backendRouteId: String {
        id.hasPrefix("L") ? id : "L\(id)"
    }
}

struct ApiRouteShapePoint: Decodable {
    let latitude, longitude: Double
    let sequence: Int?
}

struct ApiGeoJsonLineString: Decodable {
    let type: String
    let coordinates: [[Double]]
}

struct ApiRouteShape: Identifiable, Decodable {
    let id: String
    let directionId: String?
    let tripCount: Int?
    let geoJson: ApiGeoJsonLineString
    let points: [ApiRouteShapePoint]

    private enum CodingKeys: String, CodingKey {
        case id
        case directionId
        case tripCount
        case geoJson
        case points
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        directionId = try container.decodeIfPresent(String.self, forKey: .directionId)
        tripCount = try container.decodeIfPresent(Int.self, forKey: .tripCount)
        points = try container.decodeIfPresent([ApiRouteShapePoint].self, forKey: .points) ?? []

        if let geoJsonString = try container.decodeIfPresent(String.self, forKey: .geoJson) {
            let geoJsonData = Data(geoJsonString.utf8)

            do {
                geoJson = try JSONDecoder().decode(ApiGeoJsonLineString.self, from: geoJsonData)
            } catch {
                throw DecodingError.dataCorruptedError(
                    forKey: .geoJson,
                    in: container,
                    debugDescription: "Invalid GeoJSON LineString payload"
                )
            }
        } else {
            geoJson = ApiGeoJsonLineString(
                type: "LineString",
                coordinates: points.map { [$0.longitude, $0.latitude] }
            )
        }
    }

    init(
        id: String,
        directionId: String?,
        tripCount: Int?,
        geoJson: ApiGeoJsonLineString,
        points: [ApiRouteShapePoint] = []
    ) {
        self.id = id
        self.directionId = directionId
        self.tripCount = tripCount
        self.geoJson = geoJson
        self.points = points
    }

    var normalizedCoordinates: [(latitude: Double, longitude: Double)] {
        let coordinates = geoJson.coordinates.compactMap { coordinate -> (Double, Double)? in
            guard coordinate.count >= 2 else {
                return nil
            }

            return (coordinate[1], coordinate[0])
        }

        if coordinates.count > 1 {
            return coordinates
        }

        return points.map { ($0.latitude, $0.longitude) }
    }

    private var normalizedCoordinateKey: String {
        let forward = normalizedCoordinates
            .map { point in
                "\(point.latitude.rounded(toPlaces: 6)),\(point.longitude.rounded(toPlaces: 6))"
            }
            .joined(separator: ";")
        let reversed = normalizedCoordinates
            .reversed()
            .map { point in
                "\(point.latitude.rounded(toPlaces: 6)),\(point.longitude.rounded(toPlaces: 6))"
            }
            .joined(separator: ";")

        return min(forward, reversed)
    }

    var deduplicationKey: String {
        normalizedCoordinateKey
    }
}

struct ApiRouteDirection: Identifiable, Decodable {
    let id: String
    let platforms: [ApiRoutePlatform]
}

struct ApiRoutePlatform: Identifiable, Decodable {
    let id: String
    let latitude, longitude: Double
    let name: String
    let isMetro: Bool
    let code: String?
    let direction: String?
}

extension ApiRoutePlatform {
    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: latitude,
            longitude: longitude
        )
    }

    func distance(to location: CLLocation) -> CLLocationDistance {
        location.distance(
            from: CLLocation(
                latitude: coordinate.latitude,
                longitude: coordinate.longitude
            )
        )
    }
}

struct ApiRouteDetail: Decodable {
    let id: String
    let name: String
    let shortName: String
    let longName: String?
    let isNight: Bool
    let color: String?
    let url: String?
    let vehicleType: String
    let directions: [ApiRouteDirection]
    let shapes: [ApiRouteShape]

    private enum CodingKeys: String, CodingKey {
        case id
        case name
        case shortName
        case longName
        case isNight
        case color
        case url
        case vehicleType
        case legacyType = "type"
        case directions
        case shapes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)

        id = try container.decode(String.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        shortName = try container.decode(String.self, forKey: .shortName)
        longName = try container.decodeIfPresent(String.self, forKey: .longName)
        isNight = try container.decodeIfPresent(Bool.self, forKey: .isNight) ?? false
        color = try container.decodeIfPresent(String.self, forKey: .color)
        url = try container.decodeIfPresent(String.self, forKey: .url)
        vehicleType =
            try container.decodeIfPresent(String.self, forKey: .vehicleType)
                ?? container.decode(String.self, forKey: .legacyType)
        directions = try container.decode([ApiRouteDirection].self, forKey: .directions)
        shapes = try container.decodeIfPresent([ApiRouteShape].self, forKey: .shapes) ?? []
    }

    init(
        id: String,
        name: String,
        shortName: String,
        longName: String?,
        isNight: Bool,
        color: String?,
        url: String?,
        vehicleType: String,
        directions: [ApiRouteDirection],
        shapes: [ApiRouteShape]
    ) {
        self.id = id
        self.name = name
        self.shortName = shortName
        self.longName = longName
        self.isNight = isNight
        self.color = color
        self.url = url
        self.vehicleType = vehicleType
        self.directions = directions
        self.shapes = shapes
    }

    var preferredMapShapes: [ApiRouteShape] {
        var seenShapeKeys = Set<String>()

        return shapes.filter { shape in
            guard shape.normalizedCoordinates.count > 1 else {
                return false
            }

            return seenShapeKeys.insert(shape.deduplicationKey).inserted
        }
    }

    func preferredMapShapes(
        for direction: ApiRouteDirection
    ) -> [ApiRouteShape] {
        let directionShapes = shapes.filter { $0.directionId == direction.id }
        let candidateShapes = directionShapes.isEmpty
            ? preferredMapShapes
            : directionShapes

        var seenShapeKeys = Set<String>()

        return candidateShapes.filter { shape in
            guard shape.normalizedCoordinates.count > 1 else {
                return false
            }

            return seenShapeKeys.insert(shape.deduplicationKey).inserted
        }
    }
}

struct ApiDepartureDate: Codable {
    let predicted: Date
    let scheduled: Date
}

struct ApiDeparture: Codable {
    let id: String?
    let platformId: String
    let platformCode: String?
    let headsign: String

    let departure: ApiDepartureDate
    let delay: Int

    let route: String
    let routeId: String?
    let routeColor: String?
    let routeFeed: String?
    let routeVehicleType: String?
    let routeIsNight: Bool?
    let isRealtime: Bool?

    init(
        id: String?,
        platformId: String,
        platformCode: String?,
        headsign: String,
        departure: ApiDepartureDate,
        delay: Int,
        route: String,
        routeId: String?,
        routeColor: String?,
        routeFeed: String? = nil,
        routeVehicleType: String? = nil,
        routeIsNight: Bool? = nil,
        isRealtime: Bool?
    ) {
        self.id = id
        self.platformId = platformId
        self.platformCode = platformCode
        self.headsign = headsign
        self.departure = departure
        self.delay = delay
        self.route = route
        self.routeId = routeId
        self.routeColor = routeColor
        self.routeFeed = routeFeed
        self.routeVehicleType = routeVehicleType
        self.routeIsNight = routeIsNight
        self.isRealtime = isRealtime
    }
}

struct MetroDepartureRow: Identifiable {
    let id: String
    let routeLabel: String
    let previewRouteId: String?
    let headsign: String
    let departure: Date
    let nextDeparture: Date?
    let platformId: String
    let platformCode: String?
    let platformName: String
}

func buildPlatformDepartureGroups(
    for platform: ApiPlatform,
    departures: [ApiDeparture]?
) -> [[ApiDeparture]]? {
    guard let departures else {
        return nil
    }

    let filteredDepartures = departures.filter { departure in
        platform.supports(departure)
    }

    let departuresByRoute = Dictionary(
        grouping: filteredDepartures,
        by: { $0.route }
    )

    return Array(
        departuresByRoute
            .map(\.value)
            .sorted(by: {
                $0.first!.departure.predicted < $1.first!.departure.predicted
            })
    )
}

func buildMetroDepartureRows(
    for stop: ApiStop,
    departures: [ApiDeparture]?
) -> [MetroDepartureRow]? {
    guard let departures else {
        return nil
    }

    let metroPlatforms = stop.platforms.filter(\.isMetro)
    let metroPlatformsById = Dictionary(
        uniqueKeysWithValues: metroPlatforms.map { platform in
            (platform.id, platform)
        }
    )

    let rows = departures.enumerated().compactMap { index, departure -> MetroDepartureRow? in
        guard
            let platform = metroPlatformsById[departure.platformId],
            platform.supports(departure)
        else {
            return nil
        }

        let previewRouteId = departure.routeId
            ?? platform.routes.first(where: { route in
                route.name == departure.route
            })?.backendRouteId
            ?? platform.routes.first?.backendRouteId

        return MetroDepartureRow(
            id: departure.id ?? "\(platform.id)-\(index)",
            routeLabel: departure.route,
            previewRouteId: previewRouteId,
            headsign: departure.headsign,
            departure: departure.departure.predicted,
            nextDeparture: nil,
            platformId: platform.id,
            platformCode: platform.code,
            platformName: platform.name
        )
    }
    .sorted { left, right in
        left.departure < right.departure
    }

    let rowsBySequenceKey = Dictionary(
        grouping: rows.enumerated(),
        by: { _, row in
            "\(row.platformId)|\(row.routeLabel)|\(row.headsign)"
        }
    )

    return rows.enumerated().map { index, row in
        let sequenceKey = "\(row.platformId)|\(row.routeLabel)|\(row.headsign)"
        let nextDeparture = rowsBySequenceKey[sequenceKey]?
            .first(where: { nextIndex, _ in nextIndex > index })?
            .element.departure

        return MetroDepartureRow(
            id: row.id,
            routeLabel: row.routeLabel,
            previewRouteId: row.previewRouteId,
            headsign: row.headsign,
            departure: row.departure,
            nextDeparture: nextDeparture,
            platformId: row.platformId,
            platformCode: row.platformCode,
            platformName: row.platformName
        )
    }
}

struct ApiInfotextRelatedStop: Codable {
    let name: String
}

struct ApiInfotext: Codable {
    let id: String
    let text: String
    let textEn: String?
    let priority: String
    let displayType: String
    let validFrom: String?
    let validTo: String?
    let relatedStops: [ApiInfotextRelatedStop]

    var relatedStopNames: [String] {
        relatedStops.reduce(into: [String]()) { result, stop in
            guard !stop.name.isEmpty, !result.contains(stop.name) else {
                return
            }

            result.append(stop.name)
        }
    }
}

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let factor = pow(10.0, Double(places))

        return (self * factor).rounded() / factor
    }
}
