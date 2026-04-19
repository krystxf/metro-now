// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import struct MapKit.MKCoordinateRegion
import SwiftUI

extension MapPageView {
    struct ZoomVisibility: Equatable {
        let showsDetailedStopAnnotations: Bool
        let showsStopLabels: Bool
        let showsMetroEntrances: Bool
        let showsRoutePolylines: Bool
        let showsZoneBorders: Bool

        init(zoom: CGFloat) {
            showsDetailedStopAnnotations = zoom >= Constants.detailedAnnotationMinimumZoom
            showsStopLabels = zoom >= Constants.stopLabelMinimumZoom
            showsMetroEntrances = zoom >= Constants.metroEntranceMinimumZoom
            showsRoutePolylines = zoom >= Constants.routePolylinesMinimumZoom
            showsZoneBorders = zoom >= Constants.zoneBordersMinimumZoom
        }
    }

    @MainActor
    final class RenderModel: ObservableObject {
        @Published private(set) var visibleStopSourceData: GeoJSONSourceData = .featureCollection(
            FeatureCollection(features: [])
        )
        @Published private(set) var visibleDetailedStopAnnotations: [RailStopMapAnnotation] = []
        @Published private(set) var visiblePidZoneBorderPolylines: [PidZoneBorderPolyline] = []
        @Published var zoomVisibility = ZoomVisibility(zoom: 11)

        private var railStopSpatialIndex = RailStopSpatialIndex(annotations: [])
        private var stopByAnnotationId: [String: ApiStop] = [:]
        private var pidZoneBorderPolylines: [PidZoneBorderPolyline] = []
        private var visibleRegion: MKCoordinateRegion?
        private var mapViewportSize: CGSize = .zero
        private var needsIdleRefresh = false
        private var lastVisibleStopIds: [String] = []

        func setCamera(
            center: CLLocationCoordinate2D,
            zoom: CGFloat
        ) {
            visibleRegion = approximateRegion(
                center: center,
                zoom: zoom
            )

            let previousVisibility = zoomVisibility
            let nextVisibility = ZoomVisibility(zoom: zoom)

            if nextVisibility != previousVisibility {
                zoomVisibility = nextVisibility
            }

            needsIdleRefresh = true

            if nextVisibility.showsDetailedStopAnnotations != previousVisibility.showsDetailedStopAnnotations
                || nextVisibility.showsStopLabels != previousVisibility.showsStopLabels
            {
                refreshVisibleStops(force: true)
            }

            if nextVisibility.showsZoneBorders != previousVisibility.showsZoneBorders {
                refreshVisiblePidZoneBorders(force: true)
            }
        }

        func setViewportSize(_ size: CGSize) {
            guard mapViewportSize != size else {
                return
            }

            mapViewportSize = size
            refreshVisibleStops(force: true)
        }

        func setRailAnnotations(_ annotations: [RailStopMapAnnotation]) {
            railStopSpatialIndex = RailStopSpatialIndex(annotations: annotations)
            stopByAnnotationId = Dictionary(
                uniqueKeysWithValues: annotations.map { annotation in
                    (annotation.id, annotation.stop)
                }
            )
            refreshVisibleStops(force: true)
        }

        func setPidZoneBorderPolylines(_ polylines: [PidZoneBorderPolyline]) {
            pidZoneBorderPolylines = polylines
            refreshVisiblePidZoneBorders(force: true)
        }

        func refreshVisibleContent() {
            needsIdleRefresh = false
            refreshVisibleStops(force: true)
            refreshVisiblePidZoneBorders(force: true)
        }

        func refreshVisibleContentIfNeeded() {
            guard needsIdleRefresh else {
                return
            }

            needsIdleRefresh = false
            refreshVisibleStops()
            refreshVisiblePidZoneBorders()
        }

        func stop(for annotationId: String) -> ApiStop? {
            stopByAnnotationId[annotationId]
        }

        private func refreshVisibleStops(force: Bool = false) {
            guard let visibleRegion else {
                lastVisibleStopIds = []
                visibleDetailedStopAnnotations = []
                visibleStopSourceData = .featureCollection(FeatureCollection(features: []))
                return
            }

            let minimumSpacingPoints = zoomVisibility.showsStopLabels
                ? Constants.labeledAnnotationMinimumSpacing
                : Constants.unlabeledAnnotationMinimumSpacing

            let nextAnnotations = railStopSpatialIndex.visibleAnnotations(
                in: visibleRegion,
                paddingFactor: Constants.annotationViewportPaddingFactor,
                maximumCount: maximumRailAnnotationCount(
                    for: visibleRegion,
                    viewportSize: mapViewportSize,
                    minimumSpacingPoints: minimumSpacingPoints
                ),
                viewportSize: mapViewportSize,
                minimumSpacingPoints: minimumSpacingPoints
            )
            let nextIds = nextAnnotations.map(\.id)

            guard force || nextIds != lastVisibleStopIds else {
                return
            }

            lastVisibleStopIds = nextIds
            visibleDetailedStopAnnotations = zoomVisibility.showsDetailedStopAnnotations
                ? nextAnnotations
                : []

            let features = nextAnnotations.map(buildVisibleStopFeature)
            visibleStopSourceData = .featureCollection(
                FeatureCollection(features: features)
            )
        }

        private func refreshVisiblePidZoneBorders(force: Bool = false) {
            guard zoomVisibility.showsZoneBorders, let visibleRegion else {
                guard force || !visiblePidZoneBorderPolylines.isEmpty else {
                    return
                }

                visiblePidZoneBorderPolylines = []
                return
            }

            let nextPolylines = pidZoneBorderPolylines.filter { polyline in
                polyline.intersects(
                    visibleRegion,
                    paddingFactor: Constants.zoneBorderViewportPaddingFactor
                )
            }

            guard force || !hasMatchingPolylineIdentities(
                visiblePidZoneBorderPolylines,
                nextPolylines
            ) else {
                return
            }

            visiblePidZoneBorderPolylines = nextPolylines
        }
    }
}
