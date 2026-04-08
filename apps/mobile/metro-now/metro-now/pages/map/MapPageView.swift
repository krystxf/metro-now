// metro-now
// https://github.com/krystxf/metro-now

import MapKit
import SwiftUI

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

struct MapPageView: View {
    @EnvironmentObject var stopsViewModel: StopsViewModel
    @StateObject private var routeViewModel = MetroMapViewModel()

    private var metroStops: [ApiStop] {
        stopsViewModel.stops?.filter { stop in
            stop.platforms.contains(where: \.isMetro)
        } ?? []
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

    private func metroLineNames(for stop: ApiStop) -> [String] {
        Array(
            Set(
                stop.platforms
                    .flatMap(\.routes)
                    .map(\.name)
                    .filter { METRO_LINES.contains($0.uppercased()) }
            )
        )
        .sorted()
    }

    var body: some View {
        Map(interactionModes: [.zoom, .pan, .rotate, .pitch]) {
            ForEach(routeViewModel.routes, id: \.id) { route in
                let routeColor = getRouteColor(route.shortName)

                ForEach(route.preferredMapShapes, id: \.id) { shape in
                    let coordinates = shape.normalizedCoordinates.map { point in
                        CLLocationCoordinate2D(
                            latitude: point.latitude,
                            longitude: point.longitude
                        )
                    }

                    MapPolyline(coordinates: coordinates)
                        .stroke(.white.opacity(0.85), lineWidth: 8)

                    MapPolyline(coordinates: coordinates)
                        .stroke(routeColor, lineWidth: 5)
                }
            }

            ForEach(metroStops, id: \.id) { stop in
                let metroLineNames = metroLineNames(for: stop)

                Annotation(
                    stop.name,
                    coordinate: CLLocationCoordinate2D(
                        latitude: stop.avgLatitude,
                        longitude: stop.avgLongitude
                    )
                ) {
                    HStack(spacing: 4) {
                        ForEach(metroLineNames, id: \.self) { metroLineName in
                            RouteNameIconView(
                                label: metroLineName,
                                background: getRouteColor(metroLineName)
                            )
                        }
                    }
                    .padding(4)
                    .background(.ultraThinMaterial)
                    .clipShape(.rect(cornerRadius: 10))
                    .shadow(color: .black.opacity(0.16), radius: 6, y: 2)
                }
            }

            UserAnnotation()
        }
        .mapControls {
            MapUserLocationButton()
            MapCompass()
            MapScaleView()
        }
        .mapStyle(
            .standard(
                elevation: .flat
            )
        )
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
        .task(id: metroRouteRequestKey) {
            await routeViewModel.loadRoutes(routeIds: metroRouteIds)
        }
        .ignoresSafeArea(edges: .bottom)
    }
}
