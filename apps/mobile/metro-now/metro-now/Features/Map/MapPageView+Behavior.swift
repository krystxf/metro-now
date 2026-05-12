// metro-now
// https://github.com/krystxf/metro-now

@_spi(Experimental) import MapboxMaps
import SwiftUI

extension MapPageView {
    func recomputeDerivedStopData(from stops: [ApiStop]?) {
        let mapStops = stops?.filter { stop in
            stop.platforms.contains { platform in
                platform.isMetro || platform.routes.contains(where: { route in
                    isMapVisibleRoute(route)
                })
            }
        } ?? []

        let metroStops = mapStops.filter { stop in
            stop.platforms.contains(where: isMetroPlatform)
        }

        cachedMapStops = mapStops
        cachedOverlayRouteIds = Array(
            Set(
                mapStops
                    .flatMap(\.platforms)
                    .flatMap(\.routes)
                    .filter(shouldShowMapRouteOverlay)
                    .map(\.backendRouteId)
            )
        ).sorted()
        print("[map-debug] recomputed derived stop data: mapStops=\(mapStops.count), overlayRouteIds=\(cachedOverlayRouteIds)")
        cachedOverlayRouteRequestKey = cachedOverlayRouteIds.joined(separator: ",")
        cachedMapStopsRequestKey = mapStops
            .flatMap(\.platforms)
            .map(\.id)
            .joined(separator: ",")
        cachedMetroEntrances = metroStops.flatMap(\.entrances)

        renderModel.setRailAnnotations(buildRailStopMapAnnotations(from: mapStops))
    }

    func focus(on stop: ApiStop) {
        let zoom: CGFloat = stop.platforms.contains(where: isMetroPlatform) ? 15 : 14
        let center = stop.preferredCoordinate

        initialCameraSource = .selection

        withViewportAnimation(.fly(duration: 0.8)) {
            viewport = .camera(center: center, zoom: zoom)
        }

        renderModel.setCamera(center: center, zoom: zoom)
        renderModel.refreshVisibleContent()
        presentStopDetail(stop)
    }

    func presentStopDetail(_ stop: ApiStop) {
        if let sidebarStopDetailPresenter {
            sidebarStopDetailPresenter(stop)
        } else {
            selectedStop = stop
        }
    }

    func resetNorth() {
        guard let cameraState = currentCameraState else { return }

        withViewportAnimation(.easeOut(duration: 0.3)) {
            viewport = .camera(
                center: cameraState.center,
                zoom: CGFloat(cameraState.zoom),
                bearing: 0,
                pitch: CGFloat(cameraState.pitch)
            )
        }
    }

    func focusOnUserLocationIfNeeded() {
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

    func handlePendingMapSelection() {
        guard isCurrentTabActive,
              let selection = appNavigation.pendingMapSelection
        else {
            return
        }

        appNavigation.consumePendingMapSelection(selection.id)
        focus(on: selection.stop)
    }

    func loadPidZoneBordersIfNeeded() async {
        guard !hasLoadedPidZoneBorders else { return }

        hasLoadedPidZoneBorders = true

        let loadedPolylines = await PidZoneBorderLoader.load()

        guard !Task.isCancelled else { return }

        renderModel.setPidZoneBorderPolylines(loadedPolylines)
    }

    func handleStopFeatureTap(_ feature: FeaturesetFeature) -> Bool {
        guard
            let annotationId = feature.id?.id,
            let stop = renderModel.stop(for: annotationId)
        else {
            return false
        }

        presentStopDetail(stop)
        return true
    }
}
