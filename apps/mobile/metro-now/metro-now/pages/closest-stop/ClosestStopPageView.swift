// metro-now
// https://github.com/krystxf/metro-now

import MapKit
import SwiftUI

private func getColor(platforms: [ApiPlatform]) -> Color {
    let routeNames = platforms.flatMap(\.routes).map(\.name)
    let uniqueRouteNames = Array(Set(routeNames))

    guard uniqueRouteNames.count == 1 else {
        return Color.clear
    }

    if uniqueRouteNames[0] == "A" {
        return Color.green
    } else if uniqueRouteNames[0] == "B" {
        return Color.yellow
    } else {
        return Color.red
    }
}

struct ClosestStopPageView: View {
    @Environment(\.colorScheme) var colorScheme
    @StateObject private var viewModel = ClosestStopPageViewModel()
    @AppStorage(
        AppStorageKeys.showMetroOnly.rawValue
    ) var showMetroOnly = false

    var body: some View {
        if viewModel.metroStops != nil || viewModel.allStops != nil {
            List {
                if let closestMetroStop = viewModel.closestMetroStop {
                    VStack(alignment: .leading) {
                        VStack(alignment: .leading) {
                            Text(closestMetroStop.name)
                                .font(.system(size: 24))
                                .fontWeight(.bold)
                                .fontDesign(.rounded)
                            Text("Metro")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }

                        MetroDeparturesListView(
                            closestStop: closestMetroStop,
                            departures: viewModel.departures
                        )
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 18)
                    .background(
                        RoundedRectangle(cornerRadius: 24)
                            .stroke(
                                Color.gray.opacity(0.4),
                                lineWidth: 1
                            )
                            .fill(
                                .background
                                    .secondary
                                    .opacity(0.4)
                            )
                            .fill(
                                RadialGradient(
                                    gradient: Gradient(
                                        colors: [
                                            getColor(
                                                platforms: closestMetroStop.platforms
                                            )
                                            .opacity(
                                                colorScheme == .light ? 0.1 : 0.2
                                            ),
                                            .clear,
                                        ]
                                    ),
                                    center: .center,
                                    startRadius: 10,
                                    endRadius: 150
                                )
                            )
                    )
                    .listRowSeparator(.hidden)
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
                            )
                        )

                        .clipShape(RoundedRectangle(cornerRadius: 24))
                        .frame(height: 180)
                        .listRowSeparator(.hidden)

                        ForEach(platforms.filter { platform in
                            viewModel
                                .departures?.first {
                                    $0.platformId == platform.id
                                } != nil
                        }, id: \.id) { platform in
                            VStack(alignment: .leading) {
                                Text(getPlatformLabel(platform))
                                    .font(.system(size: 18))
                                    .fontWeight(.bold)
                                    .fontDesign(.rounded)
                                PlatformDeparturesListView(
                                    platform: platform,
                                    departures: viewModel.departures
                                )
                            }
                            .listRowSeparator(.hidden)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 18)
                            .background(
                                RoundedRectangle(cornerRadius: 24)
                                    .stroke(
                                        Color.gray.opacity(0.4),
                                        lineWidth: 1
                                    )
                                    .fill(
                                        .background
                                            .secondary
                                            .opacity(0.8)
                                    )
                            )
                        }
                    }
                }
            }

            .listStyle(.plain)
            .navigationTitle("Departures")
            .navigationBarTitleDisplayMode(.inline)
            .refreshable {
                do {
                    print("Refreshing")

                    viewModel.refresh()
                }
            }
        } else {
            ProgressView()
        }
    }
}
