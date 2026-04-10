// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import Foundation
import MapKit

struct PidZoneBorderPolyline: Identifiable {
    let id: String
    let coordinates: [CLLocationCoordinate2D]
    private let minimumLatitude: Double
    private let maximumLatitude: Double
    private let minimumLongitude: Double
    private let maximumLongitude: Double

    init(
        id: String,
        coordinates: [CLLocationCoordinate2D]
    ) {
        self.id = id
        self.coordinates = coordinates
        minimumLatitude = coordinates.map(\.latitude).min() ?? 0
        maximumLatitude = coordinates.map(\.latitude).max() ?? 0
        minimumLongitude = coordinates.map(\.longitude).min() ?? 0
        maximumLongitude = coordinates.map(\.longitude).max() ?? 0
    }

    func intersects(
        _ region: MKCoordinateRegion,
        paddingFactor: Double = 0
    ) -> Bool {
        let latitudePadding = region.span.latitudeDelta * paddingFactor
        let longitudePadding = region.span.longitudeDelta * paddingFactor
        let minimumVisibleLatitude = region.center.latitude - region.span.latitudeDelta / 2 - latitudePadding
        let maximumVisibleLatitude = region.center.latitude + region.span.latitudeDelta / 2 + latitudePadding
        let minimumVisibleLongitude = region.center.longitude - region.span.longitudeDelta / 2 - longitudePadding
        let maximumVisibleLongitude = region.center.longitude + region.span.longitudeDelta / 2 + longitudePadding

        return maximumLatitude >= minimumVisibleLatitude
            && minimumLatitude <= maximumVisibleLatitude
            && maximumLongitude >= minimumVisibleLongitude
            && minimumLongitude <= maximumVisibleLongitude
    }
}

enum PidZoneBorderLoader {
    static func load() async -> [PidZoneBorderPolyline] {
        await Task.detached(priority: .utility) {
            loadSynchronously()
        }
        .value
    }

    private static func loadSynchronously() -> [PidZoneBorderPolyline] {
        guard
            let fileURL =
            Bundle.main.url(
                forResource: "PID-zones",
                withExtension: "geojson",
                subdirectory: "geojson"
            )
            ?? Bundle.main.url(
                forResource: "PID-zones",
                withExtension: "geojson"
            )
        else {
            print("PID zones GeoJSON is missing from the app bundle")
            return []
        }

        do {
            let data = try Data(contentsOf: fileURL)
            let featureCollection = try JSONDecoder().decode(
                PidZoneGeoJsonFeatureCollection.self,
                from: data
            )

            return featureCollection.polylines
        } catch {
            print("Failed to load PID zones GeoJSON: \(error)")
            return []
        }
    }
}

private struct PidZoneGeoJsonFeatureCollection: Decodable {
    let features: [PidZoneGeoJsonFeature]

    var polylines: [PidZoneBorderPolyline] {
        features.enumerated().flatMap { featureIndex, feature in
            feature.geometry.polylines(featureIndex: featureIndex)
        }
    }
}

private struct PidZoneGeoJsonFeature: Decodable {
    let geometry: PidZoneGeoJsonGeometry
}

private struct PidZoneGeoJsonGeometry: Decodable {
    let type: String
    let coordinates: [[[[Double]]]]

    func polylines(
        featureIndex: Int
    ) -> [PidZoneBorderPolyline] {
        guard type == "MultiPolygon" else {
            return []
        }

        return coordinates.enumerated().flatMap { polygonIndex, polygon in
            polygon.enumerated().compactMap { ringIndex, ring in
                let coordinates = ring.compactMap { position -> CLLocationCoordinate2D? in
                    guard position.count >= 2 else {
                        return nil
                    }

                    return CLLocationCoordinate2D(
                        latitude: position[1],
                        longitude: position[0]
                    )
                }

                guard coordinates.count > 1 else {
                    return nil
                }

                let closedCoordinates = closedRingCoordinates(for: coordinates)

                return PidZoneBorderPolyline(
                    id: "\(featureIndex)-\(polygonIndex)-\(ringIndex)",
                    coordinates: closedCoordinates
                )
            }
        }
    }

    private func closedRingCoordinates(
        for coordinates: [CLLocationCoordinate2D]
    ) -> [CLLocationCoordinate2D] {
        guard
            let firstCoordinate = coordinates.first,
            let lastCoordinate = coordinates.last
        else {
            return coordinates
        }

        if firstCoordinate.latitude == lastCoordinate.latitude,
           firstCoordinate.longitude == lastCoordinate.longitude
        {
            return coordinates
        }

        return coordinates + [firstCoordinate]
    }
}
