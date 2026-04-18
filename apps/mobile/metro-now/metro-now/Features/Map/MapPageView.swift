// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import struct MapKit.MKCoordinateRegion
import SwiftUI

struct MapPageView: View {
    private enum InitialCameraSource {
        case userLocation
        case stopBounds
        case selection
    }

    enum Constants {
        static let stopLabelMinimumZoom: CGFloat = 13.5
        static let detailedAnnotationMinimumZoom: CGFloat = 15.2
        static let metroEntranceMinimumZoom: CGFloat = 14.0
        static let routePolylinesMinimumZoom: CGFloat = 11.0
        static let zoneBordersMinimumZoom: CGFloat = 10.0
        static let initialUserLocationZoom: CGFloat = 15.0
        static let initialCameraPaddingFactor = 1.15
        static let minimumInitialCameraSpanDelta = 0.08
        static let maximumInitialCameraSpanDelta = 0.32
        static let annotationViewportPaddingFactor = 0.2
        static let zoneBorderViewportPaddingFactor = 0.1
        static let unlabeledAnnotationMinimumSpacing: CGFloat = 52
        static let labeledAnnotationMinimumSpacing: CGFloat = 64
    }

    private enum StopLayerIds {
        static let source = "visible-stops-source"
        static let circles = "visible-stop-circles"
        static let labels = "visible-stop-labels"
    }

    @EnvironmentObject private var locationModel: LocationViewModel
    @EnvironmentObject var stopsViewModel: StopsViewModel
    @EnvironmentObject var favoritesViewModel: FavoritesViewModel
    @EnvironmentObject private var appNavigation: AppNavigationViewModel
    @Environment(\.colorScheme) private var colorScheme
    @AppStorage(AppStorageKeys.mapStyle.rawValue)
    private var isSatelliteMode = false
    @AppStorage(AppStorageKeys.showTraffic.rawValue)
    private var showTraffic = false
    @StateObject private var routeViewModel = MetroMapViewModel()
    @StateObject private var renderModel = RenderModel()
    @State private var viewport: Viewport = .camera(
        center: CLLocationCoordinate2D(latitude: 50.08, longitude: 14.43),
        zoom: 11
    )
    @State private var cachedRoutePolylines: [FlatRoutePolyline] = []
    @State private var selectedStop: ApiStop?
    @State private var initialCameraSource: InitialCameraSource?
    @State private var hasLoadedPidZoneBorders = false

    // Cached derived stop data — recomputed only when stopsViewModel.stops changes
    @State private var cachedMapStops: [ApiStop] = []
    @State private var cachedMetroRouteIds: [String] = []
    @State private var cachedMetroRouteRequestKey: String = ""
    @State private var cachedMapStopsRequestKey: String = ""
    @State private var cachedMetroEntrances: [ApiStopEntrance] = []

    private var selectedMapStyle: MapStyleOption {
        isSatelliteMode ? .satellite : .system(colorScheme)
    }

    private var isCurrentTabActive: Bool {
        appNavigation.selectedTab == .map
    }

    private func recomputeDerivedStopData(from stops: [ApiStop]?) {
        let mapStops = stops?.filter { stop in
            stop.platforms.contains { platform in
                platform.isMetro || platform.routes.contains(where: { route in
                    isMapVisibleRoute(route.name)
                })
            }
        } ?? []

        let metroStops = mapStops.filter { stop in
            stop.platforms.contains(where: \.isMetro)
        }

        cachedMapStops = mapStops
        cachedMetroRouteIds = Array(
            Set(
                metroStops
                    .flatMap(\.platforms)
                    .flatMap(\.routes)
                    .filter { METRO_LINES.contains($0.name.uppercased()) }
                    .map(\.backendRouteId)
            )
        ).sorted()
        cachedMetroRouteRequestKey = cachedMetroRouteIds.joined(separator: ",")
        cachedMapStopsRequestKey = mapStops
            .flatMap(\.platforms)
            .map(\.id)
            .joined(separator: ",")
        cachedMetroEntrances = metroStops.flatMap(\.entrances)

        renderModel.setRailAnnotations(buildRailStopMapAnnotations(from: mapStops))
    }

    // MARK: - Navigation

    private func focus(on stop: ApiStop) {
        let zoom: CGFloat = stop.platforms.contains(where: \.isMetro) ? 15 : 14
        let center = stop.preferredCoordinate

        initialCameraSource = .selection

        withViewportAnimation(.fly(duration: 0.8)) {
            viewport = .camera(
                center: center,
                zoom: zoom
            )
        }

        renderModel.setCamera(center: center, zoom: zoom)
        renderModel.refreshVisibleContent()
        selectedStop = stop
    }

    private func focusOnUserLocationIfNeeded() {
        guard isCurrentTabActive,
              let userLocation = locationModel.location,
              initialCameraSource != .selection,
              initialCameraSource != .userLocation
        else {
            return
        }

        let center = userLocation.coordinate
        let zoom = Constants.initialUserLocationZoom

        viewport = .camera(center: center, zoom: zoom)
        renderModel.setCamera(center: center, zoom: zoom)
        renderModel.refreshVisibleContent()
        initialCameraSource = .userLocation
    }

    private func handlePendingMapSelection() {
        guard isCurrentTabActive,
              let selection = appNavigation.pendingMapSelection
        else {
            return
        }

        appNavigation.consumePendingMapSelection(selection.id)
        focus(on: selection.stop)
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

        renderModel.setPidZoneBorderPolylines(loadedPolylines)
    }

    private func handleStopFeatureTap(_ feature: FeaturesetFeature) -> Bool {
        guard
            let annotationId = feature.id?.id,
            let stop = renderModel.stop(for: annotationId)
        else {
            return false
        }

        selectedStop = stop
        return true
    }

    // MARK: - Map content

    private var mapContent: some View {
        Map(viewport: $viewport) {
            Puck2D()

            if showTraffic {
                MapTrafficLayers()
            }

            if renderModel.zoomVisibility.showsZoneBorders {
                PolylineAnnotationGroup(renderModel.visiblePidZoneBorderPolylines) { polyline in
                    var annotation = PolylineAnnotation(lineCoordinates: polyline.coordinates)
                    annotation.lineColor = StyleColor(UIColor(selectedMapStyle.pidZoneBorderColor))
                    annotation.lineWidth = 1.2
                    return annotation
                }
                .layerId("pid-zone-borders")
            }

            if renderModel.zoomVisibility.showsRoutePolylines {
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

            if renderModel.zoomVisibility.showsMetroEntrances {
                CircleAnnotationGroup(cachedMetroEntrances) { entrance in
                    var circle = CircleAnnotation(centerCoordinate: entrance.coordinate)
                    circle.circleColor = StyleColor(UIColor.white)
                    circle.circleRadius = 4
                    circle.circleStrokeColor = StyleColor(UIColor(red: 0.0, green: 0.35, blue: 0.75, alpha: 1.0))
                    circle.circleStrokeWidth = 2
                    return circle
                }
                .layerId("metro-entrances")
            }

            GeoJSONSource(id: StopLayerIds.source)
                .data(renderModel.visibleStopSourceData)

            if renderModel.zoomVisibility.showsDetailedStopAnnotations {
                ForEvery(renderModel.visibleDetailedStopAnnotations, id: \.id) { annotation in
                    MapViewAnnotation(coordinate: annotation.coordinate) {
                        DetailedStopAnnotationView(annotation: annotation)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                selectedStop = annotation.stop
                            }
                    }
                    .allowOverlap(true)
                }
            } else {
                CircleLayer(id: StopLayerIds.circles, source: StopLayerIds.source)
                    .circleColor(Exp(.get) { StopFeatureKeys.color })
                    .circleRadius(Exp(.get) { StopFeatureKeys.pointRadius })
                    .circleSortKey(Exp(.get) { StopFeatureKeys.priority })
                    .circleStrokeColor(StyleColor(.white))
                    .circleStrokeWidth(1.5)
                    .circleOpacity(0.88)

                SymbolLayer(id: StopLayerIds.labels, source: StopLayerIds.source)
                    .filter(Exp(.eq) { Exp(.get) { StopFeatureKeys.showsLabel }; true })
                    .minZoom(Double(Constants.stopLabelMinimumZoom))
                    .symbolSortKey(Exp(.get) { StopFeatureKeys.priority })
                    .textField(Exp(.get) { StopFeatureKeys.stopName })
                    .textSize(10)
                    .textColor(selectedMapStyle.stopLabelTextColor)
                    .textHaloColor(selectedMapStyle.stopLabelHaloColor)
                    .textHaloWidth(1.4)
                    .textOffset(x: 0, y: 1.2)
                    .textPadding(8)
                    .textAllowOverlap(false)
                    .textIgnorePlacement(false)
                    .textVariableAnchor([.top, .bottom])

                TapInteraction(.layer(StopLayerIds.circles)) { feature, _ in
                    handleStopFeatureTap(feature)
                }

                TapInteraction(.layer(StopLayerIds.labels)) { feature, _ in
                    handleStopFeatureTap(feature)
                }
            }
        }
        .mapStyle(selectedMapStyle.mapboxStyle)
        .ornamentOptions(OrnamentOptions(scaleBar: ScaleBarViewOptions(visibility: .hidden)))
        .onCameraChanged { event in
            renderModel.setCamera(
                center: event.cameraState.center,
                zoom: CGFloat(event.cameraState.zoom)
            )
        }
        .onMapIdle { _ in
            renderModel.refreshVisibleContentIfNeeded()
        }
        .onReceive(stopsViewModel.$stops) { stops in
            recomputeDerivedStopData(from: stops)
        }
        .onReceive(routeViewModel.$routeDetailsById) { _ in
            cachedRoutePolylines = buildRoutePolylines(from: routeViewModel.routes)
        }
        .task {
            await loadPidZoneBordersIfNeeded()
        }
        .overlay(alignment: .top) {
            if routeViewModel.isLoading, !cachedMetroRouteIds.isEmpty {
                ProgressView("Loading metro lines")
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.thinMaterial)
                    .clipShape(.capsule)
                    .padding(.top, 12)
            }
        }
        .overlay(alignment: .topTrailing) {
            MapControlButtons(
                isSatelliteMode: $isSatelliteMode,
                viewport: $viewport
            )
            .padding(.top, 52)
            .padding(.trailing, 12)
        }
        .task(id: cachedMetroRouteRequestKey) {
            await routeViewModel.loadRoutes(routeIds: cachedMetroRouteIds)
        }
        .task(id: cachedMapStopsRequestKey) {
            guard
                initialCameraSource == nil,
                let initialRegion = buildBoundingRegion(
                    for: buildRailStopMapAnnotations(from: cachedMapStops).map(\.coordinate),
                    paddingFactor: Constants.initialCameraPaddingFactor,
                    minimumSpanDelta: Constants.minimumInitialCameraSpanDelta,
                    maximumSpanDelta: Constants.maximumInitialCameraSpanDelta
                )
            else {
                return
            }

            let zoom = approximateZoom(for: initialRegion)
            viewport = .camera(center: initialRegion.center, zoom: zoom)
            renderModel.setCamera(center: initialRegion.center, zoom: CGFloat(zoom))
            renderModel.refreshVisibleContent()
            initialCameraSource = .stopBounds
        }
        .onAppear {
            focusOnUserLocationIfNeeded()
            handlePendingMapSelection()
        }
        .onReceive(locationModel.$location) { location in
            guard location != nil else {
                return
            }

            focusOnUserLocationIfNeeded()
        }
        .onReceive(appNavigation.$pendingMapSelection) { selection in
            guard let _ = selection else {
                return
            }

            handlePendingMapSelection()
        }
        .ignoresSafeArea(edges: [.top, .bottom])
    }

    // MARK: - Body

    var body: some View {
        GeometryReader { geometry in
            mapContent
                .sheet(item: $selectedStop) { stop in
                    MapStopDetailSheet(
                        stop: stop,
                        allStops: stopsViewModel.stops,
                        favoritesViewModel: favoritesViewModel
                    )
                }
                .task(id: geometry.size) {
                    renderModel.setViewportSize(geometry.size)
                }
        }
    }
}

#Preview {
    MapPageView()
        .environmentObject(
            LocationViewModel(previewLocation: PreviewData.userLocation)
        )
        .environmentObject(
            StopsViewModel(previewStops: PreviewData.stops)
        )
        .environmentObject(
            FavoritesViewModel(previewFavoriteStopIds: [PreviewData.metroStop.id])
        )
        .environmentObject(AppNavigationViewModel())
}
