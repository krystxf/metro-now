// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import struct MapKit.MKCoordinateRegion
import struct MapKit.MKCoordinateSpan
import SwiftUI

private struct RouteStopAnnotationView: View {
    let lineNames: [String]

    var body: some View {
        HStack(spacing: 4) {
            ForEach(lineNames, id: \.self) { lineName in
                RouteNameIconView(
                    label: lineName,
                    background: getRouteColor(lineName)
                )
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }
}

private struct TransportStopAnnotationView: View {
    let modes: [RailStopTransportMode]

    var body: some View {
        Group {
            if shouldCombineBusAndTram {
                badge(
                    iconName: "bus.fill",
                    background: AnyShapeStyle(
                        LinearGradient(
                            colors: [.blue, .purple],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
                )
            } else {
                HStack(spacing: 4) {
                    ForEach(modes, id: \.rawValue) { mode in
                        badge(
                            iconName: iconName(for: mode),
                            background: AnyShapeStyle(backgroundColor(for: mode))
                        )
                    }
                }
            }
        }
        .fixedSize(horizontal: true, vertical: false)
    }

    private var shouldCombineBusAndTram: Bool {
        Set(modes) == Set([.bus, .tram])
    }

    private func iconName(for mode: RailStopTransportMode) -> String {
        switch mode {
        case .train:
            "train.side.front.car"
        case .leoExpress:
            "train.side.front.car"
        case .funicular:
            "cablecar.fill"
        case .ferry:
            "ferry.fill"
        case .tram:
            "tram.fill"
        case .bus:
            "bus.fill"
        }
    }

    private func backgroundColor(for mode: RailStopTransportMode) -> Color {
        switch mode {
        case .train:
            RouteType.train.color
        case .leoExpress:
            RouteType.leoExpress.color
        case .funicular:
            RouteType.funicular.color
        case .ferry:
            RouteType.ferry.color
        case .tram:
            RouteType.tram.color
        case .bus:
            RouteType.bus.color
        }
    }

    private func badge(
        iconName: String,
        background: AnyShapeStyle
    ) -> some View {
        Image(systemName: iconName)
            .font(.system(size: 12, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 28, height: 28)
            .background(Circle().fill(background))
            .shadow(color: .black.opacity(0.14), radius: 2, y: 1)
    }
}

private enum MapStyleOption {
    case system(ColorScheme)
    case satellite

    var mapboxStyle: MapStyle {
        switch self {
        case .system(.dark):
            .dark
        case .system:
            .light
        case .satellite:
            .satelliteStreets
        }
    }

}

@MainActor
final class MetroMapViewModel: ObservableObject {
    @Published private(set) var isLoading = false
    @Published private(set) var routeDetailsById: [String: ApiRouteDetail] = [:]

    private var lastLoadedRouteIds: [String] = []

    var routes: [ApiRouteDetail] {
        routeDetailsById.values.sorted { left, right in
            left.shortName.localizedCompare(right.shortName) == .orderedAscending
        }
    }

    func loadRoutes(routeIds: [String]) async {
        let normalizedRouteIds = Array(Set(routeIds.map(normalizeRouteId))).sorted()

        if normalizedRouteIds.isEmpty {
            lastLoadedRouteIds = []
            routeDetailsById = [:]
            return
        }

        if normalizedRouteIds == lastLoadedRouteIds,
           routeDetailsById.count == normalizedRouteIds.count
        {
            return
        }

        isLoading = true

        var fetchedRouteDetails: [String: ApiRouteDetail] = [:]

        await withTaskGroup(of: (String, ApiRouteDetail?).self) { group in
            for routeId in normalizedRouteIds {
                group.addTask {
                    let request = apiSession.request(
                        "\(API_URL)/v1/route/\(routeId)",
                        method: .get
                    )

                    let routeDetail = try? await fetchData(request, ofType: ApiRouteDetail.self)

                    return (routeId, routeDetail)
                }
            }

            for await (routeId, routeDetail) in group {
                guard let routeDetail else {
                    continue
                }

                fetchedRouteDetails[routeId] = routeDetail
            }
        }

        guard !Task.isCancelled else {
            isLoading = false
            return
        }

        lastLoadedRouteIds = normalizedRouteIds
        routeDetailsById = fetchedRouteDetails
        isLoading = false
    }

    private func normalizeRouteId(_ routeId: String) -> String {
        routeId.hasPrefix("L") ? routeId : "L\(routeId)"
    }
}

private struct FlatRoutePolyline: Identifiable {
    let id: String
    let coordinates: [CLLocationCoordinate2D]
    let color: UIColor
}

struct MapPageView: View {
    private enum Constants {
        static let stopLabelMinimumZoom: CGFloat = 13.5
        static let metroEntranceMinimumZoom: CGFloat = 14.0
        static let detailedAnnotationMinimumZoom: CGFloat = 12.0
        static let routePolylinesMinimumZoom: CGFloat = 11.0
        static let zoneBordersMinimumZoom: CGFloat = 10.0
        static let maximumDetailedAnnotationCount = 150
        static let initialCameraPaddingFactor = 1.15
        static let minimumInitialCameraSpanDelta = 0.08
        static let maximumInitialCameraSpanDelta = 0.32
        static let annotationViewportPaddingFactor = 0.2
        static let zoneBorderViewportPaddingFactor = 0.1
    }

    @EnvironmentObject var stopsViewModel: StopsViewModel
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage(AppStorageKeys.mapStyle.rawValue)
    private var isSatelliteMode = false
    @AppStorage(AppStorageKeys.showTraffic.rawValue)
    private var showTraffic = false
    @StateObject private var routeViewModel = MetroMapViewModel()
    @State private var viewport: Viewport = .camera(
        center: CLLocationCoordinate2D(latitude: 50.08, longitude: 14.43),
        zoom: 11
    )
    @State private var railStopSpatialIndex = RailStopSpatialIndex(annotations: [])
    @State private var pidZoneBorderPolylines: [PidZoneBorderPolyline] = []
    @State private var visiblePidZoneBorderPolylines: [PidZoneBorderPolyline] = []
    @State private var visibleRegion: MKCoordinateRegion?
    @State private var visibleRailAnnotations: [RailStopMapAnnotation] = []
    @State private var stopsGeoJSON: GeoJSONSourceData = .featureCollection(
        FeatureCollection(features: [])
    )
    @State private var cachedRoutePolylines: [FlatRoutePolyline] = []
    @State private var hasConfiguredInitialCamera = false
    @State private var hasLoadedPidZoneBorders = false
    @State private var currentZoom: CGFloat = 11

    private var selectedMapStyle: MapStyleOption {
        isSatelliteMode ? .satellite : .system(colorScheme)
    }

    private var mapStops: [ApiStop] {
        stopsViewModel.stops?.filter { stop in
            stop.platforms.contains { platform in
                platform.isMetro || platform.routes.contains(where: { route in
                    isMapVisibleRoute(route.name)
                })
            }
        } ?? []
    }

    private var metroStops: [ApiStop] {
        mapStops.filter { stop in
            stop.platforms.contains(where: \.isMetro)
        }
    }

    private var metroRouteIds: [String] {
        Array(
            Set(
                metroStops
                    .flatMap(\.platforms)
                    .flatMap(\.routes)
                    .filter { route in
                        METRO_LINES.contains(route.name.uppercased())
                    }
                    .map(\.backendRouteId)
            )
        )
        .sorted()
    }

    private var metroRouteRequestKey: String {
        metroRouteIds.joined(separator: ",")
    }

    private var mapStopsRequestKey: String {
        mapStops
            .flatMap(\.platforms)
            .map(\.id)
            .joined(separator: ",")
    }

    private var shouldShowDetailedAnnotations: Bool {
        currentZoom >= Constants.detailedAnnotationMinimumZoom
    }

    private var shouldShowStopAnnotationLabels: Bool {
        currentZoom >= Constants.stopLabelMinimumZoom
    }

    private var pidZoneBorderColor: Color {
        switch selectedMapStyle {
        case .system(.dark):
            Color.white.opacity(0.35)
        case .system:
            Color.black.opacity(0.16)
        case .satellite:
            Color.white.opacity(0.55)
        }
    }

    private var metroEntrances: [ApiStopEntrance] {
        metroStops.flatMap(\.entrances)
    }

    private static func buildRoutePolylines(
        from routes: [ApiRouteDetail]
    ) -> [FlatRoutePolyline] {
        routes.flatMap { route in
            let color = UIColor(getRouteColor(route.shortName)).withAlphaComponent(0.2)
            return route.preferredMapShapes.map { shape in
                FlatRoutePolyline(
                    id: shape.id,
                    coordinates: shape.normalizedCoordinates.map {
                        CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
                    },
                    color: color
                )
            }
        }
    }

    private static func annotationDotColor(for annotation: RailStopMapAnnotation) -> Color {
        if annotation.isMetro, let firstName = annotation.metroLineNames.first {
            return getRouteColor(firstName)
        }

        if let firstMode = annotation.transportModes.first {
            switch firstMode {
            case .train: return RouteType.train.color
            case .leoExpress: return RouteType.leoExpress.color
            case .funicular: return RouteType.funicular.color
            case .ferry: return RouteType.ferry.color
            case .tram: return RouteType.tram.color
            case .bus: return RouteType.bus.color
            }
        }

        return .gray
    }

    private var clusteredStopsSource: GeoJSONSource {
        var source = GeoJSONSource(id: "stops-cluster-source")
        source.cluster = true
        source.clusterRadius = 80
        source.clusterMaxZoom = 13
        return source
    }

    private static func colorHex(from color: Color) -> String {
        let uiColor = UIColor(color)
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        uiColor.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
    }

    private func shouldShowLabel(for annotation: RailStopMapAnnotation) -> Bool {
        guard shouldShowStopAnnotationLabels else {
            return false
        }

        return annotation.isMetro
            || annotation.transportModes.contains(.train)
            || annotation.transportModes.contains(.leoExpress)
    }

    private func updateVisibleRailAnnotations(for region: MKCoordinateRegion) {
        guard shouldShowDetailedAnnotations else {
            if !visibleRailAnnotations.isEmpty {
                visibleRailAnnotations = []
            }
            return
        }

        visibleRailAnnotations = railStopSpatialIndex.visibleAnnotations(
            in: region,
            paddingFactor: Constants.annotationViewportPaddingFactor,
            maximumCount: Constants.maximumDetailedAnnotationCount
        )
    }

    private func updateVisiblePidZoneBorderPolylines(for region: MKCoordinateRegion) {
        visiblePidZoneBorderPolylines = pidZoneBorderPolylines.filter { polyline in
            polyline.intersects(
                region,
                paddingFactor: Constants.zoneBorderViewportPaddingFactor
            )
        }
    }

    private func loadPidZoneBordersIfNeeded() async {
        guard !hasLoadedPidZoneBorders else {
            return
        }

        hasLoadedPidZoneBorders = true

        let loadedPolylines = await PidZoneBorderLoader.load()

        guard !Task.isCancelled else {
            return
        }

        pidZoneBorderPolylines = loadedPolylines

        if let visibleRegion {
            updateVisiblePidZoneBorderPolylines(for: visibleRegion)
        }
    }

    private func buildInitialRegion() -> MKCoordinateRegion? {
        let coordinates = buildRailStopMapAnnotations(from: mapStops).map(\.coordinate)

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
                (maximumLatitude - minimumLatitude) * Constants.initialCameraPaddingFactor,
                Constants.minimumInitialCameraSpanDelta
            ),
            Constants.maximumInitialCameraSpanDelta
        )
        let longitudeDelta = min(
            max(
                (maximumLongitude - minimumLongitude) * Constants.initialCameraPaddingFactor,
                Constants.minimumInitialCameraSpanDelta
            ),
            Constants.maximumInitialCameraSpanDelta
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

    private func approximateRegion(
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

    private func approximateZoom(for region: MKCoordinateRegion) -> Double {
        let span = max(region.span.latitudeDelta, region.span.longitudeDelta)
        return log2(360.0 / max(span, 0.001))
    }

    private var mapControlButtons: some View {
        VStack(spacing: 0) {
            Button {
                isSatelliteMode.toggle()
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            } label: {
                Image(systemName: isSatelliteMode ? "map" : "globe.americas")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
            }

            Divider()

            Button {
                withViewportAnimation(.fly(duration: 1)) {
                    viewport = .followPuck(zoom: 15)
                }
            } label: {
                Image(systemName: "location.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(.blue)
                    .frame(width: 44, height: 44)
            }
        }
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 8))
        .shadow(color: .black.opacity(0.12), radius: 4, y: 1)
        .buttonStyle(.plain)
        .fixedSize()
    }

    var body: some View {
        Map(viewport: $viewport) {
            Puck2D()

            if showTraffic {
                VectorSource(id: "mapbox-traffic")
                    .url("mapbox://mapbox.mapbox-traffic-v1")

                LineLayer(id: "traffic-low", source: "mapbox-traffic")
                    .sourceLayer("traffic")
                    .filter(Exp(.eq) { Exp(.get) { "congestion" }; "low" })
                    .lineColor(StyleColor(UIColor.systemGreen))
                    .lineWidth(1.5)
                    .lineOpacity(0.4)
                    .slot(.middle)

                LineLayer(id: "traffic-moderate", source: "mapbox-traffic")
                    .sourceLayer("traffic")
                    .filter(Exp(.eq) { Exp(.get) { "congestion" }; "moderate" })
                    .lineColor(StyleColor(UIColor.systemYellow))
                    .lineWidth(2)
                    .lineOpacity(0.6)
                    .slot(.middle)

                LineLayer(id: "traffic-heavy", source: "mapbox-traffic")
                    .sourceLayer("traffic")
                    .filter(Exp(.eq) { Exp(.get) { "congestion" }; "heavy" })
                    .lineColor(StyleColor(UIColor.systemOrange))
                    .lineWidth(2.5)
                    .lineOpacity(0.7)
                    .slot(.middle)

                LineLayer(id: "traffic-severe", source: "mapbox-traffic")
                    .sourceLayer("traffic")
                    .filter(Exp(.eq) { Exp(.get) { "congestion" }; "severe" })
                    .lineColor(StyleColor(UIColor.systemRed))
                    .lineWidth(3)
                    .lineOpacity(0.8)
                    .slot(.middle)
            }

            if currentZoom >= Constants.zoneBordersMinimumZoom {
                PolylineAnnotationGroup(visiblePidZoneBorderPolylines) { polyline in
                    var annotation = PolylineAnnotation(lineCoordinates: polyline.coordinates)
                    annotation.lineColor = StyleColor(UIColor(pidZoneBorderColor))
                    annotation.lineWidth = 1.2
                    return annotation
                }
                .layerId("pid-zone-borders")
            }

            if currentZoom >= Constants.routePolylinesMinimumZoom {
                PolylineAnnotationGroup(cachedRoutePolylines) { polyline in
                    var annotation = PolylineAnnotation(lineCoordinates: polyline.coordinates)
                    annotation.lineColor = StyleColor(polyline.color)
                    annotation.lineWidth = 5
                    return annotation
                }
                .layerId("route-lines")
                .lineCap(.round)
                .lineJoin(.round)
            }

            if currentZoom >= Constants.metroEntranceMinimumZoom {
                CircleAnnotationGroup(metroEntrances) { entrance in
                    var circle = CircleAnnotation(centerCoordinate: entrance.coordinate)
                    circle.circleColor = StyleColor(UIColor.white)
                    circle.circleRadius = 4
                    circle.circleStrokeColor = StyleColor(UIColor(red: 0.0, green: 0.35, blue: 0.75, alpha: 1.0))
                    circle.circleStrokeWidth = 2
                    return circle
                }
                .layerId("metro-entrances")
            }

            clusteredStopsSource
                .data(stopsGeoJSON)

            if shouldShowDetailedAnnotations {
                ForEvery(visibleRailAnnotations, id: \.id) { annotation in
                    MapViewAnnotation(coordinate: annotation.coordinate) {
                        VStack(spacing: 2) {
                            Group {
                                if annotation.isMetro {
                                    RouteStopAnnotationView(
                                        lineNames: annotation.metroLineNames
                                    )
                                } else {
                                    TransportStopAnnotationView(
                                        modes: annotation.transportModes
                                    )
                                }
                            }

                            if shouldShowLabel(for: annotation) {
                                Text(annotation.stopName)
                                    .font(.system(size: 10, weight: .medium))
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 1)
                                    .background(.thinMaterial, in: Capsule())
                            }
                        }
                    }
                    .allowOverlap(true)
                }
            } else {
                CircleLayer(id: "stop-clusters", source: "stops-cluster-source")
                    .filter(Exp(.has) { "point_count" })
                    .circleColor(StyleColor(UIColor.systemBlue))
                    .circleRadius(18)
                    .circleStrokeColor(StyleColor(.white))
                    .circleStrokeWidth(2)
                    .circleOpacity(0.85)

                SymbolLayer(id: "stop-cluster-count", source: "stops-cluster-source")
                    .filter(Exp(.has) { "point_count" })
                    .textField(Exp(.toString) { Exp(.get) { "point_count" } })
                    .textSize(12)
                    .textColor(StyleColor(.white))
                    .textAllowOverlap(true)

                CircleLayer(id: "stop-unclustered", source: "stops-cluster-source")
                    .filter(Exp(.not) { Exp(.has) { "point_count" } })
                    .circleColor(Exp(.get) { "color" })
                    .circleRadius(5)
                    .circleStrokeColor(StyleColor(.white))
                    .circleStrokeWidth(1.5)
                    .circleOpacity(0.9)
            }
        }
        .mapStyle(selectedMapStyle.mapboxStyle)
        .onCameraChanged { event in
            let newZoom = event.cameraState.zoom
            let zoomChanged = abs(newZoom - currentZoom) > 0.01
            currentZoom = newZoom

            let region = approximateRegion(
                center: event.cameraState.center,
                zoom: newZoom
            )
            visibleRegion = region

            if newZoom >= Constants.detailedAnnotationMinimumZoom {
                updateVisibleRailAnnotations(for: region)
            } else if zoomChanged, !visibleRailAnnotations.isEmpty {
                visibleRailAnnotations = []
            }

            if newZoom >= Constants.zoneBordersMinimumZoom {
                updateVisiblePidZoneBorderPolylines(for: region)
            }
        }
        .onReceive(stopsViewModel.$stops) { stops in
            let railStops = stops?.filter { stop in
                stop.platforms.contains { platform in
                    platform.isMetro || platform.routes.contains(where: { route in
                        isMapVisibleRoute(route.name)
                    })
                }
            } ?? []

            let annotations = buildRailStopMapAnnotations(from: railStops)
            railStopSpatialIndex = RailStopSpatialIndex(annotations: annotations)

            let features = annotations.map { annotation -> Feature in
                var feature = Feature(geometry: .point(Point(annotation.coordinate)))
                let hex = Self.colorHex(from: Self.annotationDotColor(for: annotation))
                feature.properties = ["color": .string(hex)]
                return feature
            }
            stopsGeoJSON = .featureCollection(FeatureCollection(features: features))

            guard let visibleRegion else {
                visibleRailAnnotations = []
                return
            }

            updateVisibleRailAnnotations(for: visibleRegion)
        }
        .onReceive(routeViewModel.$routeDetailsById) { _ in
            cachedRoutePolylines = Self.buildRoutePolylines(from: routeViewModel.routes)
        }
        .task {
            await loadPidZoneBordersIfNeeded()
        }
        .overlay(alignment: .top) {
            if routeViewModel.isLoading, !metroRouteIds.isEmpty {
                ProgressView("Loading metro lines")
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.thinMaterial)
                    .clipShape(.capsule)
                    .padding(.top, 12)
            }
        }
        .overlay(alignment: .topTrailing) {
            mapControlButtons
                .padding(.top, 52)
                .padding(.trailing, 12)
        }
        .task(id: metroRouteRequestKey) {
            await routeViewModel.loadRoutes(routeIds: metroRouteIds)
        }
        .task(id: mapStopsRequestKey) {
            guard
                !hasConfiguredInitialCamera,
                let initialRegion = buildInitialRegion()
            else {
                return
            }

            viewport = .camera(
                center: initialRegion.center,
                zoom: approximateZoom(for: initialRegion)
            )
            visibleRegion = initialRegion
            updateVisibleRailAnnotations(for: initialRegion)
            updateVisiblePidZoneBorderPolylines(for: initialRegion)
            hasConfiguredInitialCamera = true
        }
        .ignoresSafeArea(edges: [.top, .bottom])
    }
}
