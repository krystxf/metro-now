// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import struct MapKit.MKCoordinateRegion
import SwiftUI

struct MapPageView: View {
    enum InitialCameraSource {
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
        static let mapControlsTopPadding: CGFloat = 52
        static let mapControlsTrailingPadding: CGFloat = 12
        static let mapControlsButtonSize: CGFloat = 48
        static let mapControlsButtonSpacing: CGFloat = 4
        static let mapZoomControlsBottomPadding: CGFloat = 24
    }

    enum StopLayerIds {
        static let source = "visible-stops-source"
        static let circles = "visible-stop-circles"
        static let labels = "visible-stop-labels"
    }

    let isAlwaysVisible: Bool

    @EnvironmentObject var locationModel: LocationViewModel
    @EnvironmentObject var stopsViewModel: StopsViewModel
    @EnvironmentObject var favoritesViewModel: FavoritesViewModel
    @EnvironmentObject var appNavigation: AppNavigationViewModel
    @Environment(\.colorScheme) var colorScheme
    @Environment(\.sidebarStopDetailPresenter) var sidebarStopDetailPresenter
    @AppStorage(AppStorageKeys.mapStyle.rawValue)
    var isSatelliteMode = false
    @AppStorage(AppStorageKeys.showTraffic.rawValue)
    var showTraffic = false
    @StateObject var routeViewModel = MetroMapViewModel()
    @StateObject var renderModel = RenderModel()
    @State var viewport: Viewport = .camera(
        center: CLLocationCoordinate2D(latitude: 50.08, longitude: 14.43),
        zoom: 11
    )
    @State var cachedRoutePolylines: [FlatRoutePolyline] = []
    @State var selectedStop: ApiStop?
    @State var initialCameraSource: InitialCameraSource?
    @State var hasLoadedPidZoneBorders = false

    // Cached derived stop data — recomputed only when stopsViewModel.stops changes
    @State var cachedMapStops: [ApiStop] = []
    @State var cachedMetroRouteIds: [String] = []
    @State var cachedMetroRouteRequestKey: String = ""
    @State var cachedMapStopsRequestKey: String = ""
    @State var cachedMetroEntrances: [ApiStopEntrance] = []
    @State var currentBearing: CGFloat = 0
    @State var currentCameraState: CameraState?

    init(isAlwaysVisible: Bool = false) {
        self.isAlwaysVisible = isAlwaysVisible
    }

    var selectedMapStyle: MapStyleOption {
        isSatelliteMode ? .satellite : .system(colorScheme)
    }

    var isCurrentTabActive: Bool {
        isAlwaysVisible || appNavigation.selectedTab == .map
    }

    /// True when the iPad app runs on Apple Silicon Mac via "Designed for
    /// iPad". `userInterfaceIdiom` stays `.pad` in that mode, so check
    /// `isiOSAppOnMac`. Used to show mouse-friendly zoom buttons.
    var isRunningOnMac: Bool {
        ProcessInfo.processInfo.isiOSAppOnMac
    }

    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .topTrailing) {
                mapContent

                loadingBanner

                MapControlButtons(
                    isSatelliteMode: $isSatelliteMode,
                    viewport: $viewport,
                    bearing: currentBearing,
                    onResetNorth: resetNorth
                )
                .padding(.top, Constants.mapControlsTopPadding)
                .padding(.trailing, Constants.mapControlsTrailingPadding)

                if isRunningOnMac {
                    MapZoomButtons(
                        viewport: $viewport,
                        cameraState: currentCameraState
                    )
                    .padding(.bottom, Constants.mapZoomControlsBottomPadding)
                    .padding(.trailing, Constants.mapControlsTrailingPadding)
                    .frame(
                        maxWidth: .infinity,
                        maxHeight: .infinity,
                        alignment: .bottomTrailing
                    )
                }
            }
            .sheet(item: $selectedStop) { stop in
                MapStopDetailSheet(
                    stop: stop,
                    allStops: stopsViewModel.stops,
                    favoritesViewModel: favoritesViewModel
                )
                .presentationDetents([.medium, .large])
            }
            .task(id: geometry.size) {
                renderModel.setViewportSize(geometry.size)
            }
        }
    }

    private var loadingBanner: some View {
        VStack {
            if routeViewModel.isLoading, !cachedMetroRouteIds.isEmpty {
                ProgressView("Loading metro lines")
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.thinMaterial)
                    .clipShape(.capsule)
                    .padding(.top, 12)
                    .frame(maxWidth: .infinity)
            }

            Spacer()
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
