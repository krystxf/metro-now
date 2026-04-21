// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct RoutePreviewView: View {
    @Environment(\.dismiss) private var dismiss
    @EnvironmentObject private var locationModel: LocationViewModel
    @EnvironmentObject private var stopsViewModel: StopsViewModel
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
            loadedContent(data: data, direction: direction)
        } else if viewModel.data == nil {
            ProgressView()
        }
    }

    private func loadedContent(
        data: ApiRouteDetail,
        direction: ApiRouteDirection
    ) -> some View {
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
        let routeColor = getRouteColor(data)

        return NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    if let currentPlatformDistance {
                        RoutePreviewCurrentDistanceHeader(
                            distanceMeters: currentPlatformDistance,
                            currentPlatform: currentPlatform
                        )
                    }

                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(
                            Array(previewPlatforms.enumerated()),
                            id: \.element.id
                        ) { index, item in
                            RoutePreviewPlatformRow(
                                item: item,
                                isFirst: index == 0,
                                isLast: index == previewPlatforms.count - 1,
                                routeColor: routeColor,
                                connectingRoutes: connectingMetroRoutes(
                                    atPlatformId: item.platform.id,
                                    excludingRouteId: data.id
                                )
                            )
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent(data: data, direction: direction) }
        }
    }

    @ToolbarContentBuilder
    private func toolbarContent(
        data: ApiRouteDetail,
        direction: ApiRouteDirection
    ) -> some ToolbarContent {
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
                RoutePreviewMapView(route: data, direction: direction)
            } label: {
                Label("Map", systemImage: "map")
            }
        }
    }

    private func connectingMetroRoutes(
        atPlatformId platformId: String,
        excludingRouteId: String?
    ) -> [ApiRoute] {
        guard let stops = stopsViewModel.stops else { return [] }
        guard let parentStop = stops.first(where: { stop in
            stop.platforms.contains(where: { $0.id == platformId })
        }) else { return [] }

        var seen = Set<String>()
        var result: [ApiRoute] = []
        for platform in parentStop.platforms where platform.isMetro {
            for route in platform.routes where route.id != excludingRouteId {
                if seen.insert(route.id).inserted {
                    result.append(route)
                }
            }
        }
        return result
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
    .environmentObject(StopsViewModel(initialStops: PreviewData.stops, shouldRefresh: false))
}
