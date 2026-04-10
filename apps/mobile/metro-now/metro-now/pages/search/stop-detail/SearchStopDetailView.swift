// metro-now
// https://github.com/krystxf/metro-now

import SwiftUI

struct SearchStopDetailView: View {
    let stop: ApiStop

    @StateObject var viewModel: SearchPageDetailViewModel
    @State private var routePreviewItem: SheetIdItem?
    @Environment(\.dismiss) private var dismiss

    private var metroPlatforms: [ApiPlatform] {
        stop.platforms.filter(\.isMetro)
    }

    private var nonMetroPlatforms: [ApiPlatform] {
        stop.platforms
            .filter { platform in
                !platform.isMetro
            }
            .sorted { left, right in
                getPlatformLabel(left) < getPlatformLabel(right)
            }
    }

    private var hasRealtimeData: Bool {
        viewModel.departures?.contains(where: { $0.isRealtime == true }) ?? false
    }

    private var metroStop: ApiStop {
        ApiStop(
            id: stop.id,
            name: stop.name,
            avgLatitude: stop.avgLatitude,
            avgLongitude: stop.avgLongitude,
            entrances: stop.entrances,
            platforms: metroPlatforms
        )
    }

    var body: some View {
        List {
            if !metroPlatforms.isEmpty {
                Section(header: Text("Metro")) {
                    MetroDeparturesListView(
                        closestStop: metroStop,
                        departures: viewModel.departures,
                        onRoutePreviewRequested: { routePreviewItem = $0 }
                    )
                }
            }

            ForEach(nonMetroPlatforms, id: \.id) { platform in
                PlatformDeparturesListView(
                    platform: platform,
                    departures: viewModel.departures,
                    onRoutePreviewRequested: { routePreviewItem = $0 }
                )
            }
        }
        .navigationTitle(stop.name)
        .sheet(item: $routePreviewItem) { item in
            RoutePreviewView(
                routeId: item.id,
                headsign: item.headsign,
                currentPlatformId: item.currentPlatformId,
                currentPlatformName: item.currentPlatformName
            )
            .presentationDetents([.medium, .large])
        }
        .toolbar {
            if hasRealtimeData {
                ToolbarItem(placement: .topBarLeading) {
                    Image(systemName: "antenna.radiowaves.left.and.right")
                        .symbolEffect(
                            .variableColor.cumulative.dimInactiveLayers.nonReversing,
                            options: .repeating
                        )
                        .foregroundStyle(.green)
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                Button(
                    action: {
                        dismiss()
                    }
                ) {
                    Label("Close", systemImage: "xmark")
                }
            }
        }
    }
}
