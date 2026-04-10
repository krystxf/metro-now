// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import MapKit
import Testing

@Suite("expandedRegion", .tags(.map))
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

@Suite("isCoordinate(inside:)", .tags(.map))
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

@Suite("maximumRailAnnotationCount", .tags(.map))
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
}
