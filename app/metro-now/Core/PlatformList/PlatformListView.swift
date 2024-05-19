//
//  PlatformListView.swift
//  metro-now
//

import CoreLocation
import SwiftUI

struct Departure {
    let platform: String
    let direction: String
    let departure: Date
}

struct PlatformsListView: View {
    var station: MetroStationsGeoJSONFeature?
    @StateObject private var viewModel = PlatformListViewModel()
    @State private var departures: [Departure1] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 10) {
                    if let station {
                        ForEach(station.properties.platforms, id: \.self) { platform in
                            NavigationLink {
                                PlatformDetailView(
                                    direction: platform.direction
                                )
                            }
                            label: {
                                PlatformListItemView(
                                    direction: platform.direction,
                                    departure: formatTime(seconds: 20),
                                    metroLine: MetroLine(rawValue: platform.name)!,
                                    nextDeparture: formatTime(seconds: 200)
                                )
                            }
                        }
                    }
                }
                .padding(10)
            }

            .navigationTitle(station?.properties.name ?? "")
            .task {
                print("Fetching departures")
                guard let station else {
                    print("empty station")
                    return
                }

                do {
                    print("Fetching departures")
                    departures = try await viewModel.getData(gtfsIDs: station.properties.platforms.map(\.gtfsId))
                    print(departures)
                }

                catch {}
            }
        }
    }
}

#Preview("Muzeum") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CLLocation(
            latitude: 50.078453,
            longitude: 14.430676
        )
    )!)
}

#Preview("Florenc") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CLLocation(
            latitude: 50.090583,
            longitude: 14.438805
        )
    )!)
}

#Preview("Můstek") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CLLocation(
            latitude: 50.083956,
            longitude: 14.423844
        )
    )!)
}

#Preview("Dejvická") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CLLocation(
            latitude: 50.100485,
            longitude: 14.393898
        )
    )!)
}

#Preview("Hlavní nádraží") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CLLocation(
            latitude: 50.082637,
            longitude: 14.434300
        )
    )!)
}

#Preview("Černý Most") {
    PlatformsListView(station: getClosestStationFromGeoJSON(
        location: CLLocation(
            latitude: 50.111485,
            longitude: 14.587877
        )
    )!)
}
