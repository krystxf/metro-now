// metro-now
// https://github.com/krystxf/metro-now

import CoreLocation
import SwiftUI

struct SearchStopDetailView: View {
    let stop: ApiStop
    var showsDistanceFromUser = false
    var onClose: (() -> Void)?

    @StateObject var viewModel: SearchPageDetailViewModel
    @State var routePreviewItem: SheetIdItem?
    @State var allDeparturesRequest: AllDeparturesRequest?
    @State var showingAllInfotexts = false
    @Environment(\.dismiss) var dismiss
    @Environment(\.sidebarRoutePreviewPresenter) var sidebarRoutePreviewPresenter
    @EnvironmentObject var locationModel: LocationViewModel
    @EnvironmentObject var infotextsViewModel: InfotextsViewModel

    var body: some View {
        List {
            if let topInfotext = relatedInfotexts.first {
                InfotextsItem(infotext: topInfotext, showsRelatedStops: false)

                if relatedInfotexts.count > 1 {
                    let remaining = relatedInfotexts.count - 1
                    Button {
                        showingAllInfotexts = true
                    } label: {
                        Text("\(remaining) more \(remaining == 1 ? "alert" : "alerts")")
                            .font(.footnote)
                    }
                }
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
            SearchStopDetailHeaderBadge(
                formattedDistance: formattedStopDistanceFromUser,
                hasRealtimeData: hasRealtimeData
            )
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
        .sheet(isPresented: $showingAllInfotexts) {
            SearchStopInfotextsSheet(
                infotexts: relatedInfotexts,
                onDone: { showingAllInfotexts = false }
            )
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
