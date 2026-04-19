// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import struct MapKit.MKCoordinateRegion
import struct MapKit.MKCoordinateSpan

func approximateRegion(
    center: CLLocationCoordinate2D,
    zoom: CGFloat
) -> MKCoordinateRegion {
    let spanDelta = 360.0 / pow(2.0, Double(zoom))
    return MKCoordinateRegion(
        center: center,
        span: MKCoordinateSpan(
            latitudeDelta: spanDelta,
            longitudeDelta: spanDelta
        )
    )
}

func approximateZoom(for region: MKCoordinateRegion) -> Double {
    let span = max(region.span.latitudeDelta, region.span.longitudeDelta)
    return log2(360.0 / max(span, 0.001))
}

func buildBoundingRegion(
    for coordinates: [CLLocationCoordinate2D],
    paddingFactor: Double,
    minimumSpanDelta: Double,
    maximumSpanDelta: Double
) -> MKCoordinateRegion? {
    guard
        let minimumLatitude = coordinates.map(\.latitude).min(),
        let maximumLatitude = coordinates.map(\.latitude).max(),
        let minimumLongitude = coordinates.map(\.longitude).min(),
        let maximumLongitude = coordinates.map(\.longitude).max()
    else {
        return nil
    }

    let latitudeDelta = min(
        max(
            (maximumLatitude - minimumLatitude) * paddingFactor,
            minimumSpanDelta
        ),
        maximumSpanDelta
    )
    let longitudeDelta = min(
        max(
            (maximumLongitude - minimumLongitude) * paddingFactor,
            minimumSpanDelta
        ),
        maximumSpanDelta
    )

    return MKCoordinateRegion(
        center: CLLocationCoordinate2D(
            latitude: (minimumLatitude + maximumLatitude) / 2,
            longitude: (minimumLongitude + maximumLongitude) / 2
        ),
        span: MKCoordinateSpan(
            latitudeDelta: latitudeDelta,
            longitudeDelta: longitudeDelta
        )
    )
}
