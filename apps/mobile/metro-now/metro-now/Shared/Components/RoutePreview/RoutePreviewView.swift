// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import struct MapKit.MKCoordinateRegion
import struct MapKit.MKCoordinateSpan
import SwiftUI

struct SheetIdItem: Identifiable {
    var id: String
    var headsign: String?
    var currentPlatformId: String?
    var currentPlatformName: String?
}

enum RoutePreviewPlatformState: Equatable {
    case passed
    case current
    case upcoming
}

struct RoutePreviewPlatformItem: Identifiable {
    let platform: ApiRoutePlatform
    let state: RoutePreviewPlatformState

    var id: String {
        platform.id
    }
}

func findRoutePreviewDirection(
    in data: ApiRouteDetail,
    headsign: String?,
    currentPlatformId: String?,
    currentPlatformName: String?
) -> ApiRouteDirection? {
    if let headsign {
        let normalizedHeadsign = headsign.trimmingCharacters(in: .whitespacesAndNewlines)

        if let matchingHeadsignDirection = data.directions.first(where: { direction in
            direction.platforms.last?.name == normalizedHeadsign
        }) {
            return matchingHeadsignDirection
        }
    }

    if let matchingPlatformDirection = data.directions.first(where: { direction in
        direction.platforms.contains(where: { platform in
            if let currentPlatformId, platform.id == currentPlatformId {
                return true
            }

            guard let currentPlatformName else {
                return false
            }

            return platform.name == currentPlatformName
        })
    }) {
        return matchingPlatformDirection
    }

    return data.directions.first
}

func buildRoutePreviewPlatformItems(
    for direction: ApiRouteDirection,
    currentPlatformId: String?,
    currentPlatformName: String?
) -> [RoutePreviewPlatformItem] {
    let currentPlatformIndex = direction.platforms.firstIndex(where: { platform in
        if let currentPlatformId, platform.id == currentPlatformId {
            return true
        }

        guard let currentPlatformName else {
            return false
        }

        return platform.name == currentPlatformName
    })

    return direction.platforms.enumerated().map { index, platform in
        let state: RoutePreviewPlatformState = if let currentPlatformIndex {
            if index < currentPlatformIndex {
                .passed
            } else if index == currentPlatformIndex {
                .current
            } else {
                .upcoming
            }
        } else {
            .upcoming
        }

        return RoutePreviewPlatformItem(
            platform: platform,
            state: state
        )
    }
}

func findCurrentRoutePreviewPlatform(
    in direction: ApiRouteDirection,
    currentPlatformId: String?,
    currentPlatformName: String?
) -> ApiRoutePlatform? {
    direction.platforms.first { platform in
        if let currentPlatformId, platform.id == currentPlatformId {
            return true
        }

        guard let currentPlatformName else {
            return false
        }

        return platform.name == currentPlatformName
    }
}

private struct RoutePreviewPolyline: Identifiable {
    let id: String
    let coordinates: [CLLocationCoordinate2D]
    let color: UIColor
    let opacity: Double
}

private struct RoutePreviewMapView: View {
    private enum Constants {
        static let initialCameraPaddingFactor = 1.2
        static let minimumCameraSpanDelta = 0.01
    }

    @Environment(\.colorScheme) private var colorScheme

    let route: ApiRouteDetail
    let direction: ApiRouteDirection

    private let polylines: [RoutePreviewPolyline]
    @State private var viewport: Viewport

    init(route: ApiRouteDetail, direction: ApiRouteDirection) {
        self.route = route
        self.direction = direction

        let shapes = route.preferredMapShapes(for: direction)
        let routeColor = UIColor(getRouteColor(route))
        let fallbackCoordinates = direction.platforms.map(Self.coordinate(for:))

        var builtPolylines: [RoutePreviewPolyline] = shapes.map { shape in
            RoutePreviewPolyline(
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
                RoutePreviewPolyline(
                    id: "fallback",
                    coordinates: fallbackCoordinates,
                    color: routeColor.withAlphaComponent(0.6),
                    opacity: 0.6
                )
            )
        }

        polylines = builtPolylines

        if let initialRegion = Self.buildInitialRegion(
            direction: direction,
            shapes: shapes
        ) {
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
        }
        .mapStyle(colorScheme == .dark ? MapboxMaps.MapStyle.dark : MapboxMaps.MapStyle.light)
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

    private static func coordinate(
        for platform: ApiRoutePlatform
    ) -> CLLocationCoordinate2D {
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

struct RoutePreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var locationModel: LocationViewModel
    @StateObject private var viewModel: RoutePreviewViewModel
    let headsign: String?
    let currentPlatformId: String?
    let currentPlatformName: String?
    let onClose: (() -> Void)?

    init(
        routeId: String,
        headsign: String? = nil,
        currentPlatformId: String? = nil,
        currentPlatformName: String? = nil,
        onClose: (() -> Void)? = nil
    ) {
        _viewModel = StateObject(wrappedValue: RoutePreviewViewModel(routeId: routeId))
        self.headsign = headsign
        self.currentPlatformId = currentPlatformId
        self.currentPlatformName = currentPlatformName
        self.onClose = onClose
    }

    var body: some View {
        if let data = viewModel.data,
           let direction = findRoutePreviewDirection(
               in: data,
               headsign: headsign,
               currentPlatformId: currentPlatformId,
               currentPlatformName: currentPlatformName
           )
        {
            let previewPlatforms = buildRoutePreviewPlatformItems(
                for: direction,
                currentPlatformId: currentPlatformId,
                currentPlatformName: currentPlatformName
            )
            let currentPlatform = findCurrentRoutePreviewPlatform(
                in: direction,
                currentPlatformId: currentPlatformId,
                currentPlatformName: currentPlatformName
            )
            let currentPlatformDistance = currentPlatform.flatMap { platform in
                locationModel.location.map { platform.distance(to: $0) }
            }

            NavigationStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        if let currentPlatformDistance {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(
                                    Measurement(value: currentPlatformDistance, unit: UnitLength.meters).formatted(
                                        .measurement(
                                            width: .abbreviated,
                                            usage: .road,
                                            numberFormatStyle: .number.precision(.fractionLength(0))
                                        )
                                    )
                                )
                                .font(.title3)
                                .fontWeight(.semibold)

                                if let currentPlatform {
                                    Text("to \(platformLabel(currentPlatform))")
                                        .font(.subheadline)
                                        .foregroundStyle(.secondary)
                                }
                            }
                            .padding()
                        }

                        VStack(alignment: .leading, spacing: 0) {
                            ForEach(
                                Array(previewPlatforms.enumerated()),
                                id: \.element.id
                            ) { index, item in
                                let isFirst = index == 0
                                let isLast = index == previewPlatforms.count - 1
                                let isPassed = item.state == .passed
                                let routeColor = getRouteColor(data)

                                HStack(alignment: .center, spacing: 12) {
                                    ZStack {
                                        VStack(spacing: 0) {
                                            Rectangle()
                                                .fill(isFirst ? .clear : routeColor.opacity(isPassed ? 0.3 : 1))
                                                .frame(width: 3)
                                            Circle()
                                                .fill(routeColor.opacity(isPassed ? 0.3 : 1))
                                                .frame(width: 10, height: 10)
                                            Rectangle()
                                                .fill(isLast ? .clear : routeColor.opacity(isPassed ? 0.3 : 1))
                                                .frame(width: 3)
                                        }
                                    }
                                    .frame(width: 20)

                                    Text(item.platform.name)
                                        .font(.body)
                                        .fontWeight(item.state == .current ? .semibold : .regular)
                                        .foregroundStyle(isPassed ? .tertiary : .primary)

                                    Spacer()
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 40)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .principal) {
                        HStack(spacing: 8) {
                            RouteNameIconView(
                                label: data.shortName,
                                background: getRouteColor(data)
                            )
                            Text(direction.platforms.last?.name ?? "")
                                .fontWeight(.semibold)
                        }
                    }
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            if let onClose {
                                onClose()
                            } else {
                                dismiss()
                            }
                        } label: {
                            Label("Close", systemImage: "xmark")
                        }
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        NavigationLink {
                            RoutePreviewMapView(
                                route: data,
                                direction: direction
                            )
                        } label: {
                            Label("Map", systemImage: "map")
                        }
                    }
                }
            }
        } else if viewModel.data == nil {
            ProgressView()
        }
    }

    private func platformLabel(_ platform: ApiRoutePlatform) -> String {
        if let code = platform.code {
            return "\(platform.name) \(code)"
        }

        return platform.name
    }
}

#Preview {
    RoutePreviewView(
        routeId: "L991",
        headsign: "Nemocnice Motol",
        currentPlatformId: "U100Z102P",
        currentPlatformName: "Můstek"
    )
    .environmentObject(LocationViewModel())
}
