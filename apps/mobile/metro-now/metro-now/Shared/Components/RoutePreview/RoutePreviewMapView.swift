// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import struct MapKit.MKCoordinateRegion
import struct MapKit.MKCoordinateSpan
import SwiftUI

struct RoutePreviewMapView: View {
    private enum Constants {
        static let initialCameraPaddingFactor = 1.2
        static let minimumCameraSpanDelta = 0.01
    }

    private struct Polyline: Identifiable {
        let id: String
        let coordinates: [CLLocationCoordinate2D]
        let color: UIColor
        let opacity: Double
    }

    @Environment(\.colorScheme) private var colorScheme

    let route: ApiRouteDetail
    let direction: ApiRouteDirection

    private let polylines: [Polyline]
    @State private var viewport: Viewport

    init(route: ApiRouteDetail, direction: ApiRouteDirection) {
        self.route = route
        self.direction = direction

        let shapes = route.preferredMapShapes(for: direction)
        let routeColor = getRouteColor(route).resolvedUIColor()
        let fallbackCoordinates = direction.platforms.map(Self.coordinate(for:))

        var builtPolylines: [Polyline] = shapes.map { shape in
            Polyline(
                id: shape.id,
                coordinates: shape.normalizedCoordinates.map {
                    CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
                },
                color: routeColor,
                opacity: 1.0
            )
        }

        if shapes.isEmpty, fallbackCoordinates.count > 1 {
            builtPolylines.append(
                Polyline(
                    id: "fallback",
                    coordinates: fallbackCoordinates,
                    color: routeColor.withAlphaComponent(0.6),
                    opacity: 0.6
                )
            )
        }

        polylines = builtPolylines

        if let initialRegion = Self.buildInitialRegion(direction: direction, shapes: shapes) {
            let zoom = Self.approximateZoom(for: initialRegion)
            _viewport = State(initialValue: .camera(
                center: initialRegion.center,
                zoom: zoom
            ))
        } else {
            _viewport = State(initialValue: .camera(
                center: CLLocationCoordinate2D(latitude: 50.08, longitude: 14.43),
                zoom: 11
            ))
        }
    }

    var body: some View {
        Map(viewport: $viewport) {
            PolylineAnnotationGroup(polylines) { polyline in
                var annotation = PolylineAnnotation(lineCoordinates: polyline.coordinates)
                annotation.lineColor = StyleColor(polyline.color)
                annotation.lineWidth = 5
                annotation.lineOpacity = polyline.opacity
                return annotation
            }
            .layerId("route-preview-lines")
            .lineCap(.round)
            .lineJoin(.round)
            .lineEmissiveStrength(1)
        }
        .mapStyle(
            colorScheme == .dark
                ? MapboxMaps.MapStyle.standard(lightPreset: .night)
                : MapboxMaps.MapStyle.standard(lightPreset: .day)
        )
        .ignoresSafeArea()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .principal) {
                HStack(spacing: 8) {
                    RouteNameIconView(
                        label: route.shortName,
                        background: getRouteColor(route)
                    )
                    Text(direction.platforms.last?.name ?? route.name)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                }
            }
        }
    }

    private static func coordinate(for platform: ApiRoutePlatform) -> CLLocationCoordinate2D {
        CLLocationCoordinate2D(
            latitude: platform.latitude,
            longitude: platform.longitude
        )
    }

    private static func approximateZoom(for region: MKCoordinateRegion) -> Double {
        let span = max(region.span.latitudeDelta, region.span.longitudeDelta)
        return log2(360.0 / max(span, 0.001))
    }

    private static func buildInitialRegion(
        direction: ApiRouteDirection,
        shapes: [ApiRouteShape]
    ) -> MKCoordinateRegion? {
        let shapeCoordinates = shapes.flatMap { shape in
            shape.normalizedCoordinates.map { point in
                CLLocationCoordinate2D(
                    latitude: point.latitude,
                    longitude: point.longitude
                )
            }
        }
        let platformCoordinates = direction.platforms.map(coordinate(for:))
        let coordinates = shapeCoordinates.isEmpty
            ? platformCoordinates
            : shapeCoordinates + platformCoordinates

        guard
            let minimumLatitude = coordinates.map(\.latitude).min(),
            let maximumLatitude = coordinates.map(\.latitude).max(),
            let minimumLongitude = coordinates.map(\.longitude).min(),
            let maximumLongitude = coordinates.map(\.longitude).max()
        else {
            return nil
        }

        let latitudeDelta = max(
            (maximumLatitude - minimumLatitude) * Constants.initialCameraPaddingFactor,
            Constants.minimumCameraSpanDelta
        )
        let longitudeDelta = max(
            (maximumLongitude - minimumLongitude) * Constants.initialCameraPaddingFactor,
            Constants.minimumCameraSpanDelta
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
}
