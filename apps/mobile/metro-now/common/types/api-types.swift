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
    let isMetro: Bool
    let routes: [ApiRoute]
}

struct ApiRoute: Codable {
    let id, name: String
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
}

struct ApiRouteDetail: Decodable {
    let id: String
    let name: String
    let shortName: String
    let longName: String?
    let isNight: Bool
    let color: String?
    let url: String?
    let type: String
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
        case type
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
        type = try container.decode(String.self, forKey: .type)
        directions = try container.decode([ApiRouteDirection].self, forKey: .directions)
        shapes = try container.decodeIfPresent([ApiRouteShape].self, forKey: .shapes) ?? []
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
}

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let factor = pow(10.0, Double(places))

        return (self * factor).rounded() / factor
    }
}
