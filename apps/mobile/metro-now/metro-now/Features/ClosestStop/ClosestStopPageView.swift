// metro-now
// https://github.com/krystxf/metro-now

import MapKit
import SwiftUI

struct ClosestStopPageView: View {
    @StateObject private var viewModel: ClosestStopPageViewModel
    @State private var routePreviewItem: SheetIdItem?
    @AppStorage(
        AppStorageKeys.showMetroOnly.rawValue
    ) var showMetroOnly = false

    init(viewModel: ClosestStopPageViewModel = ClosestStopPageViewModel()) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    private var hasRealtimeData: Bool {
        viewModel.departures?.contains(where: { $0.isRealtime == true }) ?? false
    }

    var body: some View {
        if viewModel.nearbyStops != nil {
            List {
                if viewModel.isMetroNearby,
                   let closestMetroStop = viewModel.closestMetroStop
                {
                    Section(header: Text(closestMetroStop.name)) {
                        MetroDeparturesListView(
                            closestStop: closestMetroStop,
                            departures: viewModel.departures,
                            onRoutePreviewRequested: { routePreviewItem = $0 }
                        )
                    }
                }

                if showMetroOnly {
                    Button("Show all public transport departures") {
                        showMetroOnly.toggle()
                    }
                } else {
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

                        Map(interactionModes: [.zoom, .pan]) {
                            ForEach(platforms, id: \.id) { platform in
                                Annotation(
                                    getPlatformLabel(platform),
                                    coordinate: CLLocationCoordinate2D(
                                        latitude: platform.latitude,
                                        longitude: platform.longitude
                                    )
                                ) {
                                    Text(platform.code ?? "")
                                        .font(.system(size: 12))
                                        .fontWeight(.bold)
                                        .fontDesign(.rounded)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 4)
                                        .frame(minWidth: 26)
                                        .frame(height: 26)
                                        .background(Rectangle().fill(.blue))
                                        .clipShape(
                                            .rect(cornerRadius: 6)
                                        )
                                }
                            }

                            UserAnnotation()
                        }
                        .mapControls {
                            MapUserLocationButton()
                        }
                        .mapStyle(
                            .standard(
                                elevation: .flat,
                                pointsOfInterest: .excludingAll
                            )
                        )
                        .frame(height: 180)
                        .listRowInsets(EdgeInsets())
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)

                        ForEach(platforms, id: \.id) { platform in
                            PlatformDeparturesListView(
                                platform: platform,
                                departures: viewModel.departures,
                                onRoutePreviewRequested: { routePreviewItem = $0 }
                            )
                        }
                    }
                }
            }
            .navigationTitle("Departures")
            .accessibilityIdentifier("screen.departures")
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
        ClosestStopPageView(
            viewModel: ClosestStopPageViewModel(
                previewLocation: PreviewData.userLocation,
                nearbyStops: PreviewData.stops,
                departures: PreviewData.departures
            )
        )
    }
}
