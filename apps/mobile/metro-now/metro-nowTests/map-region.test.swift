// metro-now
// https://github.com/krystxf/metro-now

import CoreGraphics
import CoreLocation
import MapKit
@testable import metro_now
import Testing

@Suite(.tags(.map))
struct ExpandedRegionTests {
    @Test("expands region by padding factor")
    func expandsByFactor() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )

        let expanded = expandedRegion(from: region, paddingFactor: 0.5)

        #expect(expanded != nil)
        #expect(expanded?.center.latitude == 50.0)
        #expect(expanded?.center.longitude == 14.0)
        #expect(abs((expanded?.span.latitudeDelta ?? 0) - 0.2) < 0.0001)
        #expect(abs((expanded?.span.longitudeDelta ?? 0) - 0.2) < 0.0001)
    }

    @Test("returns nil for negative padding factor")
    func negativePadding() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )

        let expanded = expandedRegion(from: region, paddingFactor: -1.0)
        #expect(expanded == nil)
    }

    @Test("zero padding returns same span")
    func zeroPadding() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
        )

        let expanded = expandedRegion(from: region, paddingFactor: 0.0)
        #expect(abs((expanded?.span.latitudeDelta ?? 0) - 0.1) < 0.0001)
    }
}

@Suite(.tags(.map))
struct IsCoordinateInsideTests {
    private let region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )

    @Test("coordinate inside region")
    func inside() {
        let coordinate = CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0)
        #expect(isCoordinate(coordinate, inside: region))
    }

    @Test("coordinate on edge is inside")
    func onEdge() {
        let coordinate = CLLocationCoordinate2D(latitude: 50.05, longitude: 14.05)
        #expect(isCoordinate(coordinate, inside: region))
    }

    @Test("coordinate outside region")
    func outside() {
        let coordinate = CLLocationCoordinate2D(latitude: 51.0, longitude: 15.0)
        #expect(!isCoordinate(coordinate, inside: region))
    }

    @Test("coordinate just outside latitude")
    func outsideLatitude() {
        let coordinate = CLLocationCoordinate2D(latitude: 50.06, longitude: 14.0)
        #expect(!isCoordinate(coordinate, inside: region))
    }

    @Test("coordinate just outside longitude")
    func outsideLongitude() {
        let coordinate = CLLocationCoordinate2D(latitude: 50.0, longitude: 14.06)
        #expect(!isCoordinate(coordinate, inside: region))
    }
}

@Suite(.tags(.map))
struct MaximumRailAnnotationCountTests {
    @Test("very close zoom returns highest count")
    func closeZoom() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
        )
        #expect(maximumRailAnnotationCount(for: region) == 220)
    }

    @Test("wide zoom returns lowest count")
    func wideZoom() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.5, longitudeDelta: 0.5)
        )
        #expect(maximumRailAnnotationCount(for: region) == 60)
    }

    @Test("medium zoom returns intermediate count")
    func mediumZoom() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
        )
        #expect(maximumRailAnnotationCount(for: region) == 120)
    }

    @Test("compact viewport lowers the detailed annotation budget")
    func compactViewportLowersBudget() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
        )

        let count = maximumRailAnnotationCount(
            for: region,
            viewportSize: CGSize(width: 320, height: 568),
            minimumSpacingPoints: 64
        )

        #expect(count == 40)
    }

    @Test("viewport-aware budget falls back to span-only limits without size")
    func zeroViewportFallsBackToSpanLimit() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.08, longitudeDelta: 0.08)
        )

        let count = maximumRailAnnotationCount(
            for: region,
            viewportSize: .zero,
            minimumSpacingPoints: 64
        )

        #expect(count == maximumRailAnnotationCount(for: region))
    }
}

@Suite(.tags(.map))
struct RailStopSpatialIndexSamplingTests {
    @Test("samples one detailed annotation per screen-space bucket")
    func samplesUsingViewportSpacing() {
        let region = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
            span: MKCoordinateSpan(latitudeDelta: 0.06, longitudeDelta: 0.06)
        )
        let annotations = stride(from: 0, to: 6, by: 1).flatMap { row in
            stride(from: 0, to: 6, by: 1).map { column in
                makeAnnotation(
                    id: "annotation-\(row)-\(column)",
                    latitude: 49.975 + Double(row) * 0.01,
                    longitude: 13.975 + Double(column) * 0.01
                )
            }
        }
        let index = RailStopSpatialIndex(annotations: annotations)

        let visible = index.visibleAnnotations(
            in: region,
            paddingFactor: 0,
            maximumCount: annotations.count,
            viewportSize: CGSize(width: 240, height: 240),
            minimumSpacingPoints: 120
        )

        #expect(visible.count == 4)
    }

    private func makeAnnotation(
        id: String,
        latitude: Double,
        longitude: Double
    ) -> RailStopMapAnnotation {
        let platform = ApiPlatform(
            id: "\(id)-platform",
            latitude: latitude,
            longitude: longitude,
            name: "Platform \(id)",
            code: nil,
            isMetro: false,
            routes: [ApiRoute(id: "22", name: "22")]
        )
        let stop = ApiStop(
            id: "\(id)-stop",
            name: "Stop \(id)",
            avgLatitude: latitude,
            avgLongitude: longitude,
            entrances: [],
            platforms: [platform]
        )

        return RailStopMapAnnotation(
            id: id,
            stop: stop,
            platform: platform,
            coordinate: CLLocationCoordinate2D(
                latitude: latitude,
                longitude: longitude
            ),
            metroLineNames: [],
            transportModes: [.tram]
        )
    }
}
