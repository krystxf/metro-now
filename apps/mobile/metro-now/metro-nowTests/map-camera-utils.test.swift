// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import MapKit
@testable import metro_now
import Testing

@Suite(.tags(.map))
struct MapCameraUtilsTests {
    // MARK: - approximateRegion / approximateZoom

    @Test("approximateRegion produces a symmetric span for the given zoom")
    func approximateRegionSymmetricSpan() {
        let center = CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0)
        let region = approximateRegion(center: center, zoom: 10)

        #expect(region.center.latitude == 50.0)
        #expect(region.center.longitude == 14.0)
        #expect(region.span.latitudeDelta == region.span.longitudeDelta)
        // At zoom 10, the span is 360 / 2^10 ≈ 0.3515625 — guard the math.
        #expect(abs(region.span.latitudeDelta - (360.0 / 1024.0)) < 1e-9)
    }

    @Test("approximateZoom and approximateRegion round-trip")
    func approximateZoomRoundTrip() {
        let center = CLLocationCoordinate2D(latitude: 0, longitude: 0)
        let region = approximateRegion(center: center, zoom: 12)
        let zoom = approximateZoom(for: region)

        #expect(abs(zoom - 12.0) < 1e-9)
    }

    @Test("approximateZoom clamps tiny spans at the minimum-span cap")
    func approximateZoomClampsTinySpans() {
        // Degenerate region with zero span — must not blow up to infinity.
        let degenerate = MKCoordinateRegion(
            center: CLLocationCoordinate2D(latitude: 0, longitude: 0),
            span: MKCoordinateSpan(latitudeDelta: 0, longitudeDelta: 0)
        )

        let zoom = approximateZoom(for: degenerate)

        // log2(360 / 0.001) ≈ 18.46 — the exact value isn't the point;
        // what matters is that it's a finite number.
        #expect(zoom.isFinite)
    }

    // MARK: - buildBoundingRegion

    @Test("buildBoundingRegion returns nil for empty input")
    func buildBoundingRegionNilOnEmpty() {
        let region = buildBoundingRegion(
            for: [],
            paddingFactor: 1.2,
            minimumSpanDelta: 0.001,
            maximumSpanDelta: 1.0
        )

        #expect(region == nil)
    }

    @Test("buildBoundingRegion centers on the midpoint of min/max coordinates")
    func buildBoundingRegionCenter() {
        let region = buildBoundingRegion(
            for: [
                CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
                CLLocationCoordinate2D(latitude: 50.2, longitude: 14.4),
            ],
            paddingFactor: 1.0,
            minimumSpanDelta: 0.0,
            maximumSpanDelta: 10.0
        )

        #expect(region != nil)
        #expect(abs((region?.center.latitude ?? 0) - 50.1) < 1e-9)
        #expect(abs((region?.center.longitude ?? 0) - 14.2) < 1e-9)
    }

    @Test("buildBoundingRegion applies the padding factor to the raw extent")
    func buildBoundingRegionPadding() {
        // Raw extent: 0.2 lat × 0.4 lon. Padding 1.5× must produce
        // 0.3 × 0.6, assuming the result fits below the maximum.
        let region = buildBoundingRegion(
            for: [
                CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0),
                CLLocationCoordinate2D(latitude: 50.2, longitude: 14.4),
            ],
            paddingFactor: 1.5,
            minimumSpanDelta: 0.0,
            maximumSpanDelta: 10.0
        )

        #expect(region != nil)
        #expect(abs((region?.span.latitudeDelta ?? 0) - 0.3) < 1e-9)
        #expect(abs((region?.span.longitudeDelta ?? 0) - 0.6) < 1e-9)
    }

    @Test("buildBoundingRegion clamps tiny extents up to the minimum span")
    func buildBoundingRegionClampMinimum() {
        // Single-coordinate input has zero raw extent; the minimum must kick in.
        let region = buildBoundingRegion(
            for: [CLLocationCoordinate2D(latitude: 50.0, longitude: 14.0)],
            paddingFactor: 1.2,
            minimumSpanDelta: 0.01,
            maximumSpanDelta: 1.0
        )

        #expect(region != nil)
        #expect(region?.span.latitudeDelta == 0.01)
        #expect(region?.span.longitudeDelta == 0.01)
        #expect(region?.center.latitude == 50.0)
        #expect(region?.center.longitude == 14.0)
    }

    @Test("buildBoundingRegion clamps huge extents down to the maximum span")
    func buildBoundingRegionClampMaximum() {
        // Raw extent 10 lat × 10 lon with padding 1.0 → 10, but maximum is 1.0.
        let region = buildBoundingRegion(
            for: [
                CLLocationCoordinate2D(latitude: 40.0, longitude: 10.0),
                CLLocationCoordinate2D(latitude: 50.0, longitude: 20.0),
            ],
            paddingFactor: 1.0,
            minimumSpanDelta: 0.001,
            maximumSpanDelta: 1.0
        )

        #expect(region != nil)
        #expect(region?.span.latitudeDelta == 1.0)
        #expect(region?.span.longitudeDelta == 1.0)
    }
}
