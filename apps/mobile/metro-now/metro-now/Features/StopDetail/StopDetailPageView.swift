// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct StopDetailPageView: View {
    @StateObject private var viewModel: ClosestStopPageViewModel
    @State private var routePreviewItem: SheetIdItem?
    @Environment(\.sidebarRoutePreviewPresenter) private var sidebarRoutePreviewPresenter

    private func handleRoutePreview(_ item: SheetIdItem) {
        if let sidebarRoutePreviewPresenter {
            sidebarRoutePreviewPresenter(item)
        } else {
            routePreviewItem = item
        }
    }

    init(viewModel: ClosestStopPageViewModel = ClosestStopPageViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    private var hasRealtimeData: Bool {
        viewModel.departures?.contains(where: { $0.isRealtime == true }) ?? false
    }

    var body: some View {
        if viewModel.nearbyStops != nil {
            List {
                if let closestMetroStop = viewModel.closestMetroStop {
                    Section(header: Text("Metro")) {
                        MetroDeparturesListView(
                            closestStop: closestMetroStop,
                            departures: viewModel.departures,
                            onRoutePreviewRequested: handleRoutePreview
                        )
                    }
                }

                if let closestStop = viewModel.closestStop {
                    let platforms = closestStop.platforms
                        .filter { platform in
                            platform.routes.contains(where: {
                                let routeName = $0.name.uppercased()
                                let containsMetro = METRO_LINES.contains(routeName)

                                return !containsMetro
                            })
                        }
                        .sorted(by: {
                            getPlatformLabel($0) < getPlatformLabel($1)
                        })

                    ForEach(platforms, id: \.id) { platform in
                        PlatformDeparturesListView(
                            platform: platform,
                            departures: viewModel.departures,
                            onRoutePreviewRequested: handleRoutePreview
                        )
                    }
                }
            }
            .navigationTitle(viewModel.closestMetroStop?.name ?? "Departures")
            .toolbar {
                if hasRealtimeData {
                    ToolbarItem(placement: .topBarTrailing) {
                        Image(systemName: "antenna.radiowaves.left.and.right")
                            .symbolEffect(
                                .variableColor.cumulative.dimInactiveLayers.nonReversing,
                                options: .repeating
                            )
                            .foregroundStyle(.green)
                    }
                }
            }
            .refreshable {
                print("Refreshing")
                await viewModel.refresh()
            }
            .sheet(item: $routePreviewItem) { item in
                RoutePreviewView(
                    routeId: item.id,
                    headsign: item.headsign,
                    currentPlatformId: item.currentPlatformId,
                    currentPlatformName: item.currentPlatformName
                )
                .presentationDetents([.medium, .large])
            }
        } else {
            ProgressView()
        }
    }
}

#Preview {
    PreviewNavigationContainer {
        StopDetailPageView(
            viewModel: ClosestStopPageViewModel(
                previewLocation: PreviewData.userLocation,
                nearbyStops: PreviewData.stops,
                departures: PreviewData.departures
            )
        )
    }
}
