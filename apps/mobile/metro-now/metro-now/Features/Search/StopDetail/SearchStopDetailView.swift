// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

struct SearchStopDetailView: View {
    let stop: ApiStop
    var showsDistanceFromUser = false
    var onClose: (() -> Void)?

    @StateObject var viewModel: SearchPageDetailViewModel
    @State private var routePreviewItem: SheetIdItem?
    @State private var allDeparturesRequest: AllDeparturesRequest?
    @Environment(\.dismiss) private var dismiss
    @Environment(\.sidebarRoutePreviewPresenter) private var sidebarRoutePreviewPresenter
    @EnvironmentObject private var locationModel: LocationViewModel
    @EnvironmentObject private var infotextsViewModel: InfotextsViewModel

    private var relatedInfotexts: [ApiInfotext] {
        // Map surface-platform display stops wrap the base stop with a
        // platform-label name (e.g., "Můstek A"), so `stop.name` doesn't
        // match infotext `relatedStops.name` ("Můstek"). Fall back to the
        // underlying platform names, which are the station name.
        var candidates = Set<String>()
        let trimmed = stop.name.trimmingCharacters(in: .whitespacesAndNewlines)
        if !trimmed.isEmpty {
            candidates.insert(trimmed.lowercased())
        }
        for platform in stop.platforms {
            let name = platform.name.trimmingCharacters(in: .whitespacesAndNewlines)
            if !name.isEmpty {
                candidates.insert(name.lowercased())
            }
        }
        guard !candidates.isEmpty else { return [] }
        return infotextsViewModel.infotexts.filter { infotext in
            infotext.relatedStops.contains { related in
                let name = related.name.trimmingCharacters(in: .whitespacesAndNewlines)
                return candidates.contains(name.lowercased())
            }
        }
    }

    private func handleRoutePreview(_ item: SheetIdItem) {
        if let sidebarRoutePreviewPresenter {
            sidebarRoutePreviewPresenter(item)
        } else {
            routePreviewItem = item
        }
    }

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

    private var stopDistanceFromUser: CLLocationDistance? {
        guard showsDistanceFromUser,
              let location = locationModel.location
        else {
            return nil
        }

        return stop.distance(to: location)
    }

    private var formattedStopDistanceFromUser: String? {
        guard let stopDistanceFromUser else {
            return nil
        }

        return Measurement(value: stopDistanceFromUser, unit: UnitLength.meters).formatted(
            .measurement(
                width: .abbreviated,
                usage: .road,
                numberFormatStyle: .number.precision(.fractionLength(0))
            )
        )
    }

    private func platformPrimaryLabel(_ platform: ApiPlatform) -> String {
        if let code = platform.code, !code.isEmpty {
            return "Platform \(code)"
        }
        return platform.name
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
            ForEach(relatedInfotexts, id: \.id) { infotext in
                InfotextsItem(infotext: infotext, showsRelatedStops: false)
            }

            if !metroPlatforms.isEmpty {
                Section(header: Text("Metro")) {
                    MetroDeparturesListView(
                        closestStop: metroStop,
                        departures: viewModel.departures,
                        onRoutePreviewRequested: handleRoutePreview,
                        onShowAllDeparturesRequested: { allDeparturesRequest = $0 }
                    )
                }
            }

            ForEach(nonMetroPlatforms, id: \.id) { platform in
                PlatformDeparturesListView(
                    platform: platform,
                    departures: viewModel.departures,
                    primaryLabel: platformPrimaryLabel(platform),
                    onRoutePreviewRequested: handleRoutePreview,
                    onShowAllDeparturesRequested: { allDeparturesRequest = $0 }
                )
            }
        }
        .safeAreaInset(edge: .top, spacing: 0) {
            if formattedStopDistanceFromUser != nil || hasRealtimeData {
                HStack(spacing: 8) {
                    if let formattedStopDistanceFromUser {
                        Label(
                            formattedStopDistanceFromUser,
                            systemImage: "figure.walk"
                        )
                        .foregroundStyle(.secondary)
                    }

                    if hasRealtimeData {
                        Image(systemName: "antenna.radiowaves.left.and.right")
                            .symbolEffect(
                                .variableColor.cumulative.dimInactiveLayers.nonReversing,
                                options: .repeating
                            )
                            .foregroundStyle(.green)
                    }
                }
                .font(.subheadline)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 20)
                .padding(.vertical, 6)
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
        .sheet(item: $allDeparturesRequest) { request in
            AllDeparturesSheetView(request: request)
                .presentationDetents([.medium, .large])
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(
                    action: {
                        if let onClose {
                            onClose()
                        } else {
                            dismiss()
                        }
                    }
                ) {
                    Label("Close", systemImage: "xmark")
                }
            }
        }
    }
}

#Preview {
    PreviewNavigationContainer {
        SearchStopDetailView(
            stop: PreviewData.transferStop,
            showsDistanceFromUser: true,
            viewModel: SearchPageDetailViewModel(
                previewPlatformIds: PreviewData.transferStop.platforms.map(\.id),
                departures: PreviewData.departures
            )
        )
    }
    .environmentObject(
        LocationViewModel(previewLocation: PreviewData.userLocation)
    )
    .environmentObject(InfotextsViewModel())
}
