// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
@_spi(Experimental) import MapboxMaps
import SwiftUI

extension MapPageView {
    var mapContent: some View {
        Map(viewport: $viewport) {
            Puck2D()

            if showTraffic {
                MapTrafficLayers()
            }

            if renderModel.zoomVisibility.showsZoneBorders {
                PolylineAnnotationGroup(renderModel.visiblePidZoneBorderPolylines) { polyline in
                    var annotation = PolylineAnnotation(lineCoordinates: polyline.coordinates)
                    annotation.lineColor = StyleColor(selectedMapStyle.pidZoneBorderColor.resolvedUIColor())
                    annotation.lineWidth = 1.2
                    return annotation
                }
                .layerId("pid-zone-borders")
                .lineEmissiveStrength(1)
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
                .lineEmissiveStrength(1)
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
                .circleEmissiveStrength(1)
            }

            GeoJSONSource(id: StopLayerIds.source)
                .data(renderModel.visibleStopSourceData)

            if renderModel.zoomVisibility.showsDetailedStopAnnotations {
                ForEvery(renderModel.visibleDetailedStopAnnotations, id: \.id) { annotation in
                    MapViewAnnotation(coordinate: annotation.coordinate) {
                        DetailedStopAnnotationView(annotation: annotation)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                presentStopDetail(annotation.stop)
                            }
                    }
                    .allowOverlap(true)
                }
            } else {
                ForEvery(renderModel.visibleDetailedStopAnnotations, id: \.id) { annotation in
                    MapViewAnnotation(coordinate: annotation.coordinate) {
                        SmallStopAnnotationView(annotation: annotation)
                            .contentShape(Circle())
                            .onTapGesture {
                                presentStopDetail(annotation.stop)
                            }
                    }
                    .allowOverlap(true)
                }

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

                TapInteraction(.layer(StopLayerIds.labels)) { feature, _ in
                    handleStopFeatureTap(feature)
                }
            }
        }
        .mapStyle(selectedMapStyle.mapboxStyle)
        .ornamentOptions(
            OrnamentOptions(
                scaleBar: ScaleBarViewOptions(visibility: .hidden),
                compass: CompassViewOptions(visibility: .hidden)
            )
        )
        .onCameraChanged { event in
            renderModel.setCamera(
                center: event.cameraState.center,
                zoom: CGFloat(event.cameraState.zoom)
            )
            currentCameraState = event.cameraState
            currentBearing = CGFloat(event.cameraState.bearing)
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
            guard location != nil else { return }
            focusOnUserLocationIfNeeded()
        }
        .onReceive(appNavigation.$pendingMapSelection) { selection in
            guard selection != nil else { return }
            handlePendingMapSelection()
        }
        .ignoresSafeArea(edges: [.top, .bottom])
    }
}
